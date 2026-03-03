// src/webLookup.js
import https from "node:https";

/* -------------------------------------------------------
   Helper: Fetch JSON from a URL
------------------------------------------------------- */
function fetchJSON(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null));
  });
}

/* -------------------------------------------------------
   Step 1: Wikipedia Search API
   Finds the best page title for a natural-language query
------------------------------------------------------- */
async function wikipediaSearch(query) {
  const url =
    "https://en.wikipedia.org/w/api.php" +
    `?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
    "&utf8=&format=json";

  const json = await fetchJSON(url);
  const first = json?.query?.search?.[0];
  return first ? first.title : null;
}

/* -------------------------------------------------------
   Step 2: Wikipedia Summary API
   Fetches readable summary + Wikidata ID
------------------------------------------------------- */
async function wikipediaSummary(title) {
  if (!title) return null;

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title
  )}`;

  const json = await fetchJSON(url);
  if (!json?.extract) return null;

  return {
    title: json.title,
    summary: json.extract,
    wikidataId: json.wikidata_id || null,
    source: json.content_urls?.desktop?.page || null,
  };
}

/* -------------------------------------------------------
   Step 3: Wikidata API
   Fetches structured facts (dates, numbers, relationships)
------------------------------------------------------- */
async function wikidataFacts(wikidataId) {
  if (!wikidataId) return null;

  const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
  const json = await fetchJSON(url);
  if (!json) return null;

  const entity = json.entities?.[wikidataId];
  if (!entity) return null;

  const claims = entity.claims || {};
  const facts = {};

  // Helper to extract simple values
  const getValue = (prop) => {
    const claim = claims[prop]?.[0]?.mainsnak?.datavalue;
    if (!claim) return null;
    return claim.value?.time || claim.value?.amount || claim.value?.id || claim.value;
  };

  // Common useful properties
  facts.birthDate = getValue("P569"); // date of birth
  facts.deathDate = getValue("P570"); // date of death
  facts.country = getValue("P17"); // country
  facts.instanceOf = getValue("P31"); // type of entity
  facts.inception = getValue("P571"); // founding/creation date
  facts.population = getValue("P1082"); // population
  facts.height = getValue("P2048"); // height
  facts.mass = getValue("P2067"); // mass
  facts.foundedBy = getValue("P112"); // founder
  facts.occupation = getValue("P106"); // occupation
  facts.positionHeld = getValue("P39"); // office held

  return facts;
}

/* -------------------------------------------------------
   Step 4: Merge summary + structured facts
------------------------------------------------------- */
function mergeFacts(summaryObj, factsObj) {
  let text = summaryObj.summary;

  const lines = [];

  const add = (label, value) => {
    if (value) lines.push(`${label}: ${value}`);
  };

  add("Birth date", factsObj.birthDate);
  add("Death date", factsObj.deathDate);
  add("Country", factsObj.country);
  add("Type", factsObj.instanceOf);
  add("Founded/Created", factsObj.inception);
  add("Population", factsObj.population);
  add("Height", factsObj.height);
  add("Mass", factsObj.mass);
  add("Founded by", factsObj.foundedBy);
  add("Occupation", factsObj.occupation);
  add("Position held", factsObj.positionHeld);

  if (lines.length > 0) {
    text += "\n\nAdditional facts:\n" + lines.join("\n");
  }

  return {
    text,
    source: summaryObj.source,
  };
}

/* -------------------------------------------------------
   Main lookup function
------------------------------------------------------- */
export async function lookup(query) {
  if (!query || typeof query !== "string") return null;

  // Step 1: Search Wikipedia
  const title = await wikipediaSearch(query);
  if (!title) return null;

  // Step 2: Fetch summary
  const summaryObj = await wikipediaSummary(title);
  if (!summaryObj) return null;

  // Step 3: Fetch Wikidata facts
  const factsObj = await wikidataFacts(summaryObj.wikidataId);

  // Step 4: Merge
  if (factsObj) {
    return mergeFacts(summaryObj, factsObj);
  }

  // Fallback: summary only
  return {
    text: summaryObj.summary,
    source: summaryObj.source,
  };
}

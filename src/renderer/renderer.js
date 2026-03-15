console.log("window.lumi =", window.lumi);

// Drawer elements
const menuButton = document.getElementById("menu-button");
const drawer = document.getElementById("settings-drawer");
const overlay = document.getElementById("overlay");

// Tabs
const tabs = document.querySelectorAll(".drawer-tab");
const panels = document.querySelectorAll(".tab-panel");

// Settings inputs
const personaInput = document.getElementById("persona-input");
const tempSlider = document.getElementById("temp-slider");
const topPSlider = document.getElementById("top-p-slider");
const minPSlider = document.getElementById("min-p-slider");
const topKSlider = document.getElementById("top-k-slider");
const repPenSlider = document.getElementById("rep-pen-slider");
const maxTokensInput = document.getElementById("max-tokens-input");

// New: web access mode select
const webAccessSelect = document.getElementById("web-access-select");

// Slider value labels
const tempValue = document.getElementById("temp-value");
const topPValue = document.getElementById("top-p-value");
const minPValue = document.getElementById("min-p-value");
const topKValue = document.getElementById("top-k-value");
const repPenValue = document.getElementById("rep-pen-value");

// Lookup indicator
const lookupIndicator = document.getElementById("lookup-indicator");

// Update slider number labels
function updateSliderLabels() {
  tempValue.textContent = tempSlider.value;
  topPValue.textContent = topPSlider.value;
  minPValue.textContent = minPSlider.value;
  topKValue.textContent = topKSlider.value;
  repPenValue.textContent = repPenSlider.value;
}

// Open drawer
menuButton.addEventListener("click", async () => {
  const settings = await window.lumi.getSettings();

  personaInput.value = settings.persona;
  tempSlider.value = settings.temperature;
  topPSlider.value = settings.top_p;
  minPSlider.value = settings.min_p;
  topKSlider.value = settings.top_k;
  repPenSlider.value = settings.repetition_penalty;
  maxTokensInput.value = settings.max_tokens;

  // New: web access mode
  if (webAccessSelect) {
    webAccessSelect.value = settings.web_access_mode || "off";
  }

  updateSliderLabels();

  drawer.classList.add("open");
  overlay.classList.add("visible");
});

// Close drawer
overlay.addEventListener("click", () => {
  drawer.classList.remove("open");
  overlay.classList.remove("visible");
});

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    panels.forEach(p => p.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// Save settings on change
function saveSettings() {
  window.lumi.setSettings({
    persona: personaInput.value,
    temperature: parseFloat(tempSlider.value),
    top_p: parseFloat(topPSlider.value),
    min_p: parseFloat(minPSlider.value),
    top_k: parseInt(topKSlider.value),
    repetition_penalty: parseFloat(repPenSlider.value),
    max_tokens: parseInt(maxTokensInput.value),
    // New: web access mode
    web_access_mode: webAccessSelect ? webAccessSelect.value : "off"
  });
}

// Attach listeners to update settings + slider labels
[
  personaInput,
  tempSlider,
  topPSlider,
  minPSlider,
  topKSlider,
  repPenSlider,
  maxTokensInput
].forEach(el => el.addEventListener("input", () => {
  saveSettings();
  updateSliderLabels();
}));

// New: save web access mode on change
if (webAccessSelect) {
  webAccessSelect.addEventListener("change", () => {
    saveSettings();
  });
}

// -----------------------------
// Chat Logic
// -----------------------------
const messagesDiv = document.getElementById('messages');
const promptInput = document.getElementById('prompt');
const sendButton = document.getElementById('send');

// Global conversation history (user/assistant only)
let messages = [];

function addMessage(role, text) {
  const div = document.createElement('div');
  div.classList.add('message', role);
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return div;
}

// Simple heuristic to detect factual lookup queries
function shouldAutoLookup(text) {
  const lower = text.toLowerCase();
  const triggers = [
    "current",
    "today",
    "latest",
    "who is",
    "what is",
    "when is",
    "when was",
    "right now"
  ];
  return triggers.some(t => lower.includes(t));
}

// Manual lookup trigger phrases
function isManualLookupCommand(text) {
  const lower = text.toLowerCase();
  return (
    lower.startsWith("look this up") ||
    lower.startsWith("search this") ||
    lower.startsWith("check online")
  );
}

async function sendMessage() {
  const userText = promptInput.value.trim();
  if (!userText) return;

  addMessage('user', userText);
  promptInput.value = '';

  messages.push({ role: 'user', content: userText });

  const lumiBubble = addMessage('lumi', '');
  let assistantText = '';

  const settings = await window.lumi.getSettings();
  const mode = settings.web_access_mode || "off";

  // Reset lookup indicator
  if (lookupIndicator) {
    lookupIndicator.classList.add("hidden");
  }

  let lookupBlock = null;

  // Decide whether to perform a lookup
  if (mode !== "off") {
    let shouldLookup = false;
    let queryForLookup = userText;

    if (mode === "manual" && isManualLookupCommand(userText)) {
      queryForLookup = userText.replace(/^(look this up|search this|check online)/i, "").trim() || userText;
      shouldLookup = true;
    } else if (mode === "auto" && shouldAutoLookup(userText)) {
      shouldLookup = true;
    }

    if (shouldLookup) {
      console.log("→ Performing web search for:", queryForLookup);

      const results = await window.lumi.webSearch(queryForLookup);
      console.log("webSearch results:", results);

      if (Array.isArray(results) && results.length > 0) {
        lookupBlock = "Web search results:\n\n";

        results.forEach((r, i) => {
          lookupBlock += `${i + 1}. ${r.title}\n${r.snippet}\n${r.url}\n\n`;
        });

        if (lookupIndicator) {
          lookupIndicator.classList.remove("hidden");
        }
      }
    }
  }

  // -----------------------------
  // FIX: Do NOT insert a system message here.
  // lumi.js now handles system message insertion.
  // -----------------------------
  let convo = [];

  if (lookupBlock) {
    convo.push({
      role: "user",
      content: `Search results:\n${lookupBlock}`
    });
  }

  // Add conversation history
  convo.push(...messages);

  // Ask Lumi
  await window.lumi.ask(convo, settings, token => {
    assistantText += token;
    lumiBubble.textContent = assistantText;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });

  messages.push({ role: 'assistant', content: assistantText });
}

sendButton.addEventListener('click', sendMessage);

promptInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// src/webSearch.js
import { BrowserWindow } from "electron";

export async function webSearch(query) {
  if (!query || typeof query !== "string") return null;

  // Create a hidden browser window
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      javascript: true,
      offscreen: true,
    },
  });

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    await win.loadURL(url);

// Give JS time to render the page
await new Promise(resolve => setTimeout(resolve, 1500));

const html = await win.webContents.executeJavaScript(`
  (() => document.documentElement.innerHTML)()
`);

console.log("[DEBUG] DuckDuckGo HTML snippet:", html.slice(0, 5000));


    // Wait for results to render
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Extract titles, snippets, and URLs
    const results = await win.webContents.executeJavaScript(`
      (() => {
        const items = [];
        const blocks = document.querySelectorAll(".result");

        for (let block of blocks) {
          const titleEl = block.querySelector(".result__title");
          const snippetEl = block.querySelector(".result__snippet");
          const linkEl = block.querySelector("a.result__a");

          if (!titleEl || !snippetEl || !linkEl) continue;

          items.push({
            title: titleEl.innerText.trim(),
            snippet: snippetEl.innerText.trim(),
            url: linkEl.href
          });

          if (items.length >= 5) break;
        }

        return items;
      })();
    `);

    return results && results.length > 0 ? results : null;
  } catch (err) {
    console.error("Web search error:", err);
    return null;
  } finally {
    win.destroy();
  }
}

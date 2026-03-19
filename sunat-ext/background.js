// SUNAT Session Injector v2.5 — background service worker (Manifest V3)
// La lógica de interceptación está en content.js (document_start).
// Este service worker solo es necesario para tener acceso a chrome.cookies
// desde spinner.html (las extension pages lo heredan del manifest).

chrome.runtime.onInstalled.addListener(() => {
  console.log("[SUNAT-ext v2.5] Extension instalada/actualizada ✔");
});

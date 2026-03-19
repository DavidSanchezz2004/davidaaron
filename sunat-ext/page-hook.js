// Mendieta SUNAT Automation - page-hook.js

window.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type !== "MENDIETA_LAUNCH_DECLARACION") return;

  console.log("[MENDIETA] buscando botón declaraciones");

  let tries = 0;

  const timer = setInterval(() => {
    tries++;

    const link = document.querySelector('a[href*="declaraSimplificadaNueva"]');

    if (link) {
      console.log("[MENDIETA] botón encontrado");

      const fn = link
        .getAttribute("href")
        .replace("javascript:", "")
        .replace("()", "")
        .trim();

      console.log("[MENDIETA] función detectada:", fn);

      if (typeof window[fn] === "function") {
        console.log("[MENDIETA] ejecutando función");

        window[fn]();

        clearInterval(timer);
        return;
      }
    }

    if (tries > 60) {
      console.log("[MENDIETA] no se encontró la función");
      clearInterval(timer);
    }
  }, 300);
});

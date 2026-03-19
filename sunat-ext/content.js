// SUNAT Session Injector v2.5 — content script
// Se ejecuta a document_start (antes de que ngrok renderice nada).
// Si la URL es /ext-inject/{token}, redirige INMEDIATAMENTE a la página
// local spinner.html — la petición HTTP a ngrok queda cancelada.
(function () {
  const m = location.pathname.match(/^\/ext-inject\/([a-f0-9]{32,})$/i);
  if (!m) return;
  const token = m[1];
  const proxy = location.origin; // https://heliotypic-xxx.ngrok-free.dev
  location.replace(
    chrome.runtime.getURL("spinner.html") + "#" + proxy + "___" + token,
  );
})();

// Mendieta SUNAT Automation v7

(function () {
  console.log("[MENDIETA] content script cargado", location.href);

  ////////////////////////////////////////////////////////
  // DETECTAR SOL.HTML
  ////////////////////////////////////////////////////////

  if (
    location.hostname === "www.sunat.gob.pe" &&
    location.pathname === "/sol.html" &&
    location.hash.startsWith("#mdp=")
  ) {
    console.log("[MENDIETA] sol.html detectado");

    const encoded = location.hash.replace("#mdp=", "");

    let creds;

    try {
      creds = JSON.parse(atob(decodeURIComponent(encoded)));
    } catch (e) {
      return;
    }

    chrome.storage.local.set({
      mendieta_declara_creds: creds,
    });

    history.replaceState(null, "", location.pathname);

    ////////////////////////////////////////////////////////
    // ENVIAR MENSAJE A LA PÁGINA
    ////////////////////////////////////////////////////////

    window.postMessage(
      {
        type: "MENDIETA_LAUNCH_DECLARACION",
      },
      "*",
    );
  }

  ////////////////////////////////////////////////////////
  // AUTOCOMPLETAR LOGIN
  ////////////////////////////////////////////////////////

  if (
    location.hostname === "api-seguridad.sunat.gob.pe" &&
    location.pathname.includes("loginMenuSol")
  ) {
    chrome.storage.local.get("mendieta_declara_creds", (data) => {
      const creds = data.mendieta_declara_creds;

      if (!creds) return;

      const fill = () => {
        const ruc = document.querySelector("#txtRuc");
        const user = document.querySelector("#txtUsuario");
        const pass = document.querySelector("#txtContrasena");
        const btn = document.querySelector("#btnAceptar");

        if (!ruc || !user || !pass || !btn) return false;

        ruc.value = creds.ruc;
        user.value = creds.usuario.toUpperCase();
        pass.value = creds.clave;

        setTimeout(() => {
          btn.click();
        }, 400);

        chrome.storage.local.remove("mendieta_declara_creds");

        return true;
      };

      if (fill()) return;

      const obs = new MutationObserver(() => {
        if (fill()) obs.disconnect();
      });

      obs.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }
})();

// Logo desde el dominio Mendieta (evita restricciones MV3 con archivos locales)
document.getElementById("logo").src =
  "https://mscontables.com/LogoMendietav2.jpg";

(async () => {
  const hash = location.hash.slice(1);
  const sep = hash.lastIndexOf("___");

  function setStatus(msg, sub) {
    document.getElementById("msg").textContent = msg;
    if (sub !== undefined) document.getElementById("sub").textContent = sub;
  }

  function showError(title, detail, showClose) {
    document.getElementById("spinner").classList.add("hidden");
    document.getElementById("card").classList.add("error");
    setStatus(title, detail);
    if (showClose) document.getElementById("closeBtn").style.display = "block";
  }

  if (sep === -1) {
    showError("URL inválida", "No se pudo leer el token de la URL.", false);
    return;
  }

  const proxyBase = hash.slice(0, sep);
  const token = hash.slice(sep + 3);

  // ── 1. Polling hasta que el login esté listo ─────────────────────────────
  const maxAttempts = 30;
  let attempt = 0;
  let resp;

  while (attempt < maxAttempts) {
    try {
      resp = await fetch(`${proxyBase}/get-cookies/${token}`, {
        headers: {
          "ngrok-skip-browser-warning": "true",
          Accept: "application/json",
        },
      });
    } catch (e) {
      showError(
        "Error de conexión",
        "No se pudo contactar el bot. ¿Está corriendo?",
        true,
      );
      return;
    }

    attempt++;

    if (resp.status === 202) {
      setStatus(
        "Conectando con el portal...",
        `Iniciando sesión... (${attempt}/${maxAttempts})`,
      );
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    break;
  }

  if (attempt >= maxAttempts) {
    showError(
      "Timeout",
      "El login tardó demasiado. Cierra esta pestaña e intenta de nuevo.",
      true,
    );
    return;
  }

  if (resp.status === 410) {
    showError(
      "Sesión expirada",
      "El token ya no es válido. Cierra esta pestaña y haz clic en Abrir nuevamente.",
      true,
    );
    return;
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    showError(`Error ${resp.status}`, txt.slice(0, 200), true);
    return;
  }

  let data;
  try {
    data = await resp.json();
  } catch (e) {
    console.error("[spinner] Error parseando JSON de get-cookies:", e);
    showError("Respuesta inválida", "No se pudo leer el JSON del bot.", true);
    return;
  }

  console.log("[spinner] Respuesta get-cookies:", data);

  if (!data.ok || !Array.isArray(data.cookies) || data.cookies.length === 0) {
    console.error(
      "[spinner] Sin cookies válidas. ok=",
      data.ok,
      "cookies=",
      data.cookies,
    );
    showError("Sin cookies", "El bot no devolvió cookies válidas.", true);
    return;
  }

  // ── Detectar portal desde redirect_url ───────────────────────────────────
  const redirectUrl = data.redirect_url || "";
  console.log("[spinner] redirect_url recibido:", redirectUrl);
  const isSunafil = redirectUrl.includes("sunafil.gob.pe");
  // declaracion: mismo dominio que sunat pero con parámetro exe=
  const isDeclaracion = !isSunafil && redirectUrl.includes("exe=");
  console.log(
    "[spinner] portal detectado → isSunafil=",
    isSunafil,
    "isDeclaracion=",
    isDeclaracion,
  );

  const portalLabel = isSunafil
    ? "SUNAFIL"
    : isDeclaracion
      ? "Declaración y Pago"
      : "SUNAT";

  setStatus(`Iniciando en ${portalLabel}...`, "Preparando tu sesión");

  // ── 2. Limpiar cookies existentes ─────────────────────────────────────────
  const sunatDomains = [
    "sunat.gob.pe",
    "e-menu.sunat.gob.pe",
    "ww1.sunat.gob.pe",
    "www.sunat.gob.pe",
    "api-seguridad.sunat.gob.pe",
    "sol.sunat.gob.pe",
  ];

  const sunafilDomains = [
    "sunafil.gob.pe",
    "casillaelectronica.sunafil.gob.pe",
    "api-seguridad.sunat.gob.pe",
  ];

  const domainsToClear = isSunafil ? sunafilDomains : sunatDomains;

  for (const domain of domainsToClear) {
    const existing = await chrome.cookies.getAll({ domain });
    for (const c of existing) {
      const protocol = c.secure ? "https" : "http";
      const cd = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
      try {
        await chrome.cookies.remove({
          url: `${protocol}://${cd}${c.path}`,
          name: c.name,
        });
      } catch (_) {}
    }
  }

  // ── 3. Inyectar nuevas cookies ────────────────────────────────────────────
  let ok = 0,
    fail = 0;
  for (const c of data.cookies) {
    console.log(
      "[spinner] Inyectando cookie:",
      c.name,
      "@",
      c.domain,
      "path=",
      c.path,
    );
    const domain = c.domain || ".sunat.gob.pe";
    const cleanDomain = domain.startsWith(".") ? domain.slice(1) : domain;
    const cookieUrl = `https://${cleanDomain}/`;
    try {
      const result = await chrome.cookies.set({
        url: cookieUrl,
        name: c.name,
        value: c.value,
        domain,
        path: c.path || "/",
        secure: true,
        httpOnly: c.httpOnly || false,
        sameSite: "no_restriction",
        expirationDate: Math.floor(Date.now() / 1000) + 7200,
      });
      if (result) {
        ok++;
        continue;
      }

      // Fallback sin domain explícito
      if (domain.startsWith(".")) {
        const r2 = await chrome.cookies
          .set({
            url: cookieUrl,
            name: c.name,
            value: c.value,
            path: c.path || "/",
            secure: true,
            httpOnly: c.httpOnly || false,
            sameSite: "no_restriction",
            expirationDate: Math.floor(Date.now() / 1000) + 7200,
          })
          .catch(() => null);
        if (r2) {
          ok++;
          continue;
        }
      }
      fail++;
    } catch (e) {
      fail++;
    }
  }

  if (ok === 0) {
    showError(
      "Error al inyectar",
      "Ninguna cookie se pudo inyectar. Intenta de nuevo.",
      true,
    );
    return;
  }

  // ── 4. Redirigir al portal ────────────────────────────────────────────────
  setStatus("¡Listo!", `Redirigiendo a ${portalLabel}...`);
  await new Promise((r) => setTimeout(r, 400));

  if (isDeclaracion) {
    // Declaración y Pago:
    // 1) Marcamos en storage que hay que auto-abrir DDJJ.
    // 2) Redirigimos al Menú SOL estándar; un content script detectará
    //    la marca y hará la navegación interna hacia Declaración y Pago.
    try {
      chrome.storage?.local?.set({ mendieta_auto_declaracion: true });
    } catch (e) {
      console.warn("[spinner] No se pudo guardar flag auto_declaracion:", e);
    }
    const targetMenu =
      "https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?pestana=*&agrupacion=*";
    console.log("[spinner] Redirigiendo a Menú SOL (modo Declaración):", targetMenu);
    window.location.href = targetMenu;
  } else {
    window.location.href =
      redirectUrl ||
      "https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm";
  }
})();

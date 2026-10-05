// ---------------------------------------------------------------------------
// Enregistrement du service worker (mode hors-ligne)
// ---------------------------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((err) => console.error("Service worker non enregistré:", err));
  });
}

const statusEl = document.getElementById("status");
const installBtn = document.getElementById("install");
const hintEl = document.getElementById("install-hint");
const hintTitleEl = document.getElementById("hint-title");
const hintStepsEl = document.getElementById("hint-steps");

// ---------------------------------------------------------------------------
// Détection de la plateforme et du support d'installation
// ---------------------------------------------------------------------------
const ua = navigator.userAgent;

const isFirefox = /firefox|fxios/i.test(ua);
const isIOS =
  /ipad|iphone|ipod/i.test(ua) ||
  (/macintosh/i.test(ua) && "ontouchend" in document);
const isAndroid = /android/i.test(ua);

// Seuls les navigateurs Chromium exposent beforeinstallprompt.
// Firefox (Android ou iOS) ne l'implémente pas : d'où le repli ci-dessous.

// L'app tourne-t-elle déjà en mode installé ?
const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

// ---------------------------------------------------------------------------
// État de connexion en direct
// ---------------------------------------------------------------------------
function updateStatus() {
  statusEl.textContent = navigator.onLine
    ? "En ligne"
    : "Hors-ligne — tout fonctionne quand même ✨";
}

window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
updateStatus();

// ---------------------------------------------------------------------------
// Installation
// ---------------------------------------------------------------------------
let deferredPrompt = null;

function showHint() {
  if (isInstalled()) return;

  if (isIOS) {
    hintTitleEl.textContent = "Pour installer l'application :";
    hintStepsEl.innerHTML =
      "<li>Appuyez sur <strong>Partager</strong> (carré avec une flèche)</li>" +
      "<li>Faites défiler et choisissez <strong>Sur l'écran d'accueil</strong></li>" +
      "<li>Confirmez avec <strong>Ajouter</strong></li>";
  } else if (isFirefox && isAndroid) {
    hintTitleEl.textContent = "Installation limitée dans Firefox";
    hintStepsEl.innerHTML =
      "<li>Menu <strong>⋮</strong> en haut à droite → <strong>Ajouter à l'écran d'accueil</strong></li>" +
      "<li>⚠️ Firefox crée un simple raccourci, pas une vraie application " +
      "(pas de plein écran, pas d'installation réelle).</li>" +
      "<li>Pour une installation complète, ouvrez cette page dans " +
      "<strong>Chrome</strong> : le bouton d'installation apparaîtra ici même.</li>";
  } else {
    hintTitleEl.textContent = "Pour installer l'application :";
    hintStepsEl.innerHTML =
      "<li>Ouvrez le menu de votre navigateur</li>" +
      "<li>Choisissez <strong>Installer l'application</strong> ou " +
      "<strong>Ajouter à l'écran d'accueil</strong></li>";
  }

  hintEl.hidden = false;
}

function hideHint() {
  hintEl.hidden = true;
}

// Navigateurs Chromium : invitation native
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  hideHint();
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installBtn.hidden = true;
  hideHint();
  statusEl.textContent = "Application installée ✅";
});

// Repli : si aucune invitation n'est arrivée, on affiche les instructions.
// Le délai laisse à Chromium le temps de déclencher beforeinstallprompt.
window.addEventListener("load", () => {
  setTimeout(() => {
    if (!deferredPrompt && !isInstalled()) showHint();
    else if (deferredPrompt || isInstalled()) hideHint();
  }, 2500);
});

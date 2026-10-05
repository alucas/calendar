// Enregistrement du service worker (mode hors-ligne)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((err) => console.error("Service worker non enregistré:", err));
  });
}

// État de connexion en direct
const statusEl = document.getElementById("status");

function updateStatus() {
  statusEl.textContent = navigator.onLine
    ? "En ligne"
    : "Hors-ligne — tout fonctionne quand même ✨";
}

window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
updateStatus();

// Bouton d'installation (Android / Chrome / Edge)
let deferredPrompt = null;
const installBtn = document.getElementById("install");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
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
  statusEl.textContent = "Application installée ✅";
});

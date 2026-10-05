// Test de non-régression (TNR) : exécute app.js dans un DOM simulé et vérifie
// le comportement d'installation sur chaque plateforme, ainsi que la cohérence
// de index.html, du manifeste et du service worker.
//
// Lancer avec : npm test
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");

const appSrc = read("app.js");
const html = read("index.html");
const manifest = JSON.parse(read("manifest.webmanifest"));
const sw = read("sw.js");

let passed = 0;
let failed = 0;

function check(name, condition, details) {
  if (condition) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`ECHEC ${name}`);
    if (details) console.log(`      ${details}`);
  }
}

// ---------------------------------------------------------------------------
// Exécution de app.js dans un DOM simulé
// ---------------------------------------------------------------------------
function simulate({ ua, standalone = false, displayStandalone = false, firePrompt = false }) {
  const ids = ["install", "install-hint", "hint-title", "hint-steps", "status"];
  const els = {};
  for (const id of ids) {
    els[id] = { id, hidden: true, textContent: "", innerHTML: "", addEventListener() {} };
  }

  const listeners = {};
  const nav = { userAgent: ua, onLine: true, standalone };
  const win = {
    navigator: nav,
    addEventListener: (t, f) => (listeners[t] ||= []).push(f),
    matchMedia: () => ({ matches: displayStandalone }),
  };

  const timers = [];
  // eslint-disable-next-line no-new-func
  new Function("window", "document", "navigator", "console", "setTimeout", appSrc)(
    win,
    { getElementById: (id) => els[id] },
    nav,
    { error: () => {} },
    (f) => timers.push(f)
  );

  (listeners.load || []).forEach((f) => f());
  timers.forEach((f) => f());
  if (firePrompt) {
    (listeners.beforeinstallprompt || []).forEach((f) => f({ preventDefault() {} }));
  }

  return els;
}

const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";

console.log("\n— Contrat HTML / JS —");
for (const id of ["install", "install-hint", "hint-title", "hint-steps", "status"]) {
  check(
    `#${id} présent dans index.html et app.js`,
    html.includes(`id="${id}"`) && appSrc.includes(`"${id}"`)
  );
}

console.log("\n— Comportement d'installation par plateforme —");
const cases = [
  {
    name: "Firefox Android : repli affiché avec renvoi vers Chrome",
    ua: "Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0",
    expect: (e) =>
      e["install-hint"].hidden === false &&
      /Firefox/.test(e["hint-title"].textContent) &&
      /Chrome/.test(e["hint-steps"].innerHTML),
  },
  {
    name: "iPhone Safari : instructions « écran d'accueil »",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    expect: (e) =>
      e["install-hint"].hidden === false &&
      /\u00e9cran d'accueil/.test(e["hint-steps"].innerHTML) &&
      !/Firefox/.test(e["hint-title"].textContent),
  },
  {
    name: "Chrome Android sans invitation : instructions génériques",
    ua: CHROME_ANDROID,
    expect: (e) =>
      e["install-hint"].hidden === false &&
      /Installer l'application/.test(e["hint-steps"].innerHTML),
  },
  {
    name: "Chrome Android avec invitation : bouton affiché, repli masqué",
    ua: CHROME_ANDROID,
    firePrompt: true,
    expect: (e) => e["install-hint"].hidden === true && e["install"].hidden === false,
  },
  {
    name: "Déjà installé (standalone) : rien n'est affiché",
    ua: CHROME_ANDROID,
    displayStandalone: true,
    expect: (e) => e["install-hint"].hidden === true && e["install"].hidden === true,
  },
  {
    name: "Firefox desktop : instructions génériques",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    expect: (e) =>
      e["install-hint"].hidden === false &&
      /Installer l'application/.test(e["hint-steps"].innerHTML),
  },
];

for (const c of cases) {
  const els = simulate(c);
  check(
    c.name,
    c.expect(els),
    `hint.hidden=${els["install-hint"].hidden} btn.hidden=${els["install"].hidden} ` +
      `titre="${els["hint-title"].textContent}"`
  );
}

console.log("\n— Manifeste —");
check("name = Agenda", manifest.name === "Agenda", `name=${manifest.name}`);
check("display = standalone", manifest.display === "standalone");
check("id défini", typeof manifest.id === "string" && manifest.id.length > 0);
const sizes = manifest.icons.map((i) => i.sizes);
check("icône 192x192", sizes.includes("192x192"));
check("icône 512x512", sizes.includes("512x512"));
check(
  "icône maskable",
  manifest.icons.some((i) => (i.purpose || "").includes("maskable"))
);
check("start_url relatif", manifest.start_url.startsWith("./"), manifest.start_url);
check("scope relatif", manifest.scope.startsWith("./"), manifest.scope);

console.log("\n— Service worker —");
check("contient un gestionnaire fetch", /addEventListener\(\s*["']fetch["']/.test(sw));
check("pré-cache la page", /["']\.\/index\.html["']/.test(sw));
check(
  "version de cache présente",
  /const CACHE = ["']agenda-v\d+["']/.test(sw),
  (sw.match(/const CACHE = .*/) || [""])[0]
);

console.log(`\n${passed} réussis, ${failed} échoués\n`);
process.exit(failed === 0 ? 0 : 1);

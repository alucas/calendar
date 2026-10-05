# Agenda — PWA

Agenda personnel installable sur téléphone et utilisable **hors-ligne**.
Aucun serveur, aucune API : les données sont stockées dans le navigateur (IndexedDB).

## Structure

```
index.html              page (message de bienvenue)
styles.css              mise en forme (clair / sombre)
app.js                  enregistrement du service worker + bouton d'installation
manifest.webmanifest    métadonnées de l'app (nom, icônes, couleurs)
sw.js                   service worker : cache des fichiers pour le mode hors-ligne
icons/                  icônes PNG (192, 512, maskable)
tools/serve.mjs         serveur local de test
tools/make-icons.mjs    générateur d'icônes
tests/                  tests de non-régression
```

## Tester en local

```bash
npm start        # http://localhost:3000
npm test         # tests de non-régression (22 vérifications)
```

> Le mode hors-ligne et l'installation ne fonctionnent que sur **localhost** ou en **HTTPS**.

## Mettre en ligne

Le site est 100 % statique (pas de backend) : dépose simplement le contenu du
dossier sur GitHub Pages, Netlify, Vercel, Cloudflare Pages… L'URL obtenue sera
en HTTPS. L'hébergeur ne fait que livrer les fichiers ; aucune donnée ne lui est
envoyée et rien n'est à maintenir.

## Installer sur un téléphone

- **Android (Chrome)** : ouvrir l'URL → menu ⋮ → « Installer l'application »,
  ou utiliser le bouton affiché dans la page.
- **iPhone (Safari)** : ouvrir l'URL → Partager → « Sur l'écran d'accueil ».
- **Firefox** : n'implémente pas `beforeinstallprompt` et ne sait pas installer de
  vraie PWA. La page affiche alors des instructions de repli ; pour une
  installation réelle, utiliser Chrome. Le mode hors-ligne fonctionne malgré tout.

## Tests

`npm test` exécute `app.js` dans un DOM simulé et vérifie :

- la cohérence des identifiants entre `index.html` et `app.js` ;
- le comportement d'installation sur Firefox Android, iPhone, Chrome (avec et sans
  invitation), Firefox desktop, et une fois installé ;
- la validité du manifeste (nom, `display`, icônes 192/512/maskable, URLs relatives) ;
- la présence du gestionnaire `fetch` et du pré-cache dans le service worker.

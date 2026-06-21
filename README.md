# Coup d'Envoi ⚽

Une application web (PWA) en français : un **jeu de foot quotidien** à installer sur son téléphone et à ouvrir chaque jour.

- **100 % en français**, interface ultra simple (aucun compte, aucun réglage).
- **Le jeu du jour** : *Vrai ou Faux*, *Le Mot du jour* (Wordle des joueurs), *Le Parcours* — un format par jour, avec série (🔥) et statistiques.
- **Fonctionne hors-ligne** une fois installée, et **sans aucun serveur ni clé API**.

> **Version 1 = jeux uniquement.** Les pronostics sur les matchs (Ligue 1 / Ligue des champions / Coupe du monde) sont prêts mais mis de côté dans le dossier `future-predictions/` ; ils pourront être ajoutés plus tard. C'est la partie pronostics qui nécessiterait GitHub Actions + une clé API — pas cette version.

## Comment ça marche

C'est un **site statique** : du HTML, du CSS et du JavaScript, plus quelques fichiers de données (`data/`). Aucune compilation, aucun backend. Toute la progression (jeux réussis, série, club choisi) est stockée **localement sur le téléphone**.

## Mise en ligne sur GitHub Pages (une seule fois)

1. **Crée un dépôt GitHub** et envoie tous ces fichiers dedans (branche `main`).
2. **Active GitHub Pages** : *Settings → Pages → Build and deployment → Source = « Deploy from a branch »*, branche `main`, dossier `/ (root)`. L'URL publique apparaît au bout d'une minute.
3. **Partage le lien** (ou un QR code) avec la personne. Sur le téléphone :
   - **iPhone (Safari)** : *Partager* ⬆️ → *« Sur l'écran d'accueil »*.
   - **Android (Chrome)** : la bannière *Installer* s'affiche, ou menu ⋮ → *Installer l'application*.

C'est tout — rien d'autre à configurer.

## Développement local

```bash
python3 -m http.server 8766
# puis ouvrir http://localhost:8766
```

(Le `fetch()` des fichiers de données ne fonctionne pas en `file://` — il faut un serveur HTTP.)

## Enrichir le contenu

Les jeux sont dans `data/puzzles.json`, regroupés par format (`vraifaux`, `motdujour`, `parcours`). Ajoute simplement des entrées au même format : elles entrent automatiquement dans la rotation. Les clubs proposés à l'inscription sont dans `data/clubs.json`.

## Structure

```
index.html              écran d'accueil + coquille de l'appli
css/styles.css          thème (vert « pelouse »)
js/app.js               démarrage, navigation, installation
js/state.js             stockage local, dates, série
js/puzzles.js           les trois moteurs de jeu
js/util.js              utilitaires
data/clubs.json         clubs proposés à l'inscription
data/puzzles.json       banque de jeux (en français)
sw.js                   service worker (hors-ligne)
icons/                  icônes de l'appli
future-predictions/     module pronostics + job de mise à jour (pour une v2)
```

## Et plus tard ? (les pronostics)

Tout est déjà écrit dans `future-predictions/` : la saisie des scores, le règlement (3 = score exact, 2 = bon écart, 1 = bon résultat), le script de récupération des matchs et le workflow GitHub Actions. Pour activer cette v2, il faudra : remettre ces fichiers à leur place, créer une clé gratuite sur [football-data.org](https://www.football-data.org/) et l'ajouter en secret `FOOTBALL_DATA_TOKEN`. L'appli est structurée pour que ça se rebranche sans tout réécrire.

# calculator-api-js

API REST Calculatrice en Node.js **sans framework**, avec tests Jest et CI GitHub Actions.

## Prérequis

- Node.js **≥ 22**
- npm

## Installation

```bash
npm install
```

## Lancer le serveur

```bash
npm start
# → Serveur démarré sur http://localhost:3000
```

Le serveur sert à la fois l'**API JSON** (`/calculate`) et le **front** : ouvre
<http://localhost:3000/> pour la calculatrice web (HTML/CSS/JS natif, sans framework,
dans `public/`). Le front consomme `GET /calculate` et gère les états loading /
succès / erreur (400, division par zéro, serveur injoignable).

## Endpoint

```
GET /calculate?operation=<op>&a=<nombre>&b=<nombre>
```

Opérations supportées : `add`, `subtract`, `multiply`, `divide`.

### Exemples

```bash
curl "http://localhost:3000/calculate?operation=add&a=5&b=3"
# → {"operation":"add","a":5,"b":3,"result":8}

curl "http://localhost:3000/calculate?operation=divide&a=10&b=0"
# → {"error":"Division par zéro impossible."}
```

### Codes de retour

| Situation | Code |
|---|---|
| Calcul réussi | 200 |
| Front servi (`/`, `/index.html`, `/style.css`, `/app.js`) | 200 |
| Paramètre manquant / non numérique / opération inconnue / division par zéro | 400 |
| Route inconnue (≠ `/calculate` et hors assets front) | 404 |
| Méthode ≠ GET/OPTIONS | 405 + header `Allow: GET, OPTIONS` |
| Préflight CORS (OPTIONS) | 204 sans body |

## Scripts npm

| Commande | Rôle |
|---|---|
| `npm run lint` | Vérification ESLint |
| `npm test` | Tous les tests Jest |
| `npm run test:unit` | Tests unitaires uniquement |
| `npm run test:integration` | Tests d'intégration uniquement |
| `npm run test:coverage` | Tests + rapport HTML (seuil ≥ 90%) |
| `npm run test:ci` | Variante CI (`--ci --coverage`) |

## Structure du projet

```
calculator-api-js/
├── public/                ← front vanilla servi à la racine
│   ├── index.html
│   ├── style.css
│   └── app.js            ← logique testable (buildCalcUrl, validate, interpret)
├── src/
│   ├── calculator.js     ← logique métier
│   └── server.js         ← serveur HTTP natif (API + service statique)
├── tests/
│   ├── calculator.test.js
│   ├── api.test.js
│   ├── front.test.js     ← tests de la logique front
│   └── helpers/
│       └── http.js
├── .github/workflows/ci.yml
├── eslint.config.js
├── jest.config.js
└── package.json
```

## CI

À chaque `git push`, GitHub Actions exécute :
1. **Lint** (ESLint, Node 22)
2. **Tests** en matrice sur **Node 22** et **Node 24** (parallèle, `fail-fast: false`)
3. Upload du rapport de couverture en artefact (rétention 30 jours)

Voir [.github/workflows/ci.yml](.github/workflows/ci.yml).

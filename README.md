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
| Paramètre manquant / non numérique / opération inconnue / division par zéro | 400 |
| Route ≠ `/calculate` | 404 |
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
├── src/
│   ├── calculator.js     ← logique métier
│   └── server.js         ← serveur HTTP natif
├── tests/
│   ├── calculator.test.js
│   ├── api.test.js
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

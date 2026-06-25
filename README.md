# Calculatrice — API multi-langages

API REST Calculatrice implémentée en **6 langages**, avec frontend vanilla, tests unitaires et d'intégration, CI GitHub Actions et Docker Compose.

## Contrat API (commun à tous les backends)

```
GET /calculate?operation=<op>&a=<nombre>&b=<nombre>
```

Opérations : `add`, `subtract`, `multiply`, `divide`.

```bash
curl "http://localhost:3000/calculate?operation=add&a=5&b=3"
# → {"operation":"add","a":5,"b":3,"result":8}

curl "http://localhost:3000/calculate?operation=divide&a=10&b=0"
# → {"error":"Division par zéro impossible."}
```

| Situation | Code |
|---|---|
| Calcul réussi | 200 |
| Assets front (`/`, `/index.html`, `/style.css`, `/app.js`) | 200 |
| Paramètre manquant / non numérique / opération inconnue / ÷ 0 | 400 |
| Route inconnue | 404 |
| Méthode ≠ GET/OPTIONS | 405 + `Allow: GET, OPTIONS` |
| Préflight CORS (OPTIONS) | 204 |

---

## Backends

### Node.js (`Back_js/`)

**Prérequis :** Node.js ≥ 22, npm

```bash
npm install
npm start          # http://localhost:3000
```

**Tests :**
```bash
npm run test:back          # Jest — unitaires + intégration
npm run test:front:unit    # Jest — logique front
npm run test:e2e           # Playwright — E2E (serveur requis)
npm run test:coverage      # couverture ≥ 90 %
npm run lint               # ESLint
```

---

### Go (`Back_go/`)

**Prérequis :** Go ≥ 1.21

```bash
cd Back_go
go run .           # http://localhost:3000
```

**Tests :**
```bash
cd Back_go
go test ./... -v
```

---

### Python — FastAPI (`Back_Python/`)

**Prérequis :** Python ≥ 3.12

```bash
cd Back_Python
pip install -r requirements.txt
python server.py   # http://localhost:3000
```

**Tests :**
```bash
pip install -r requirements-dev.txt
pytest test_calculator.py -v
```

---

### Rust (`back_rust/`)

**Prérequis :** Rust (cargo)

```bash
cd back_rust
cargo run --release   # http://localhost:3000
```

**Tests :**
```bash
cargo test --verbose
```

---

### C (`Back_c/`)

**Prérequis :** GCC, make

```bash
cd Back_c
make && ./calculator-backend   # http://localhost:3000
```

**Tests :**
```bash
make test
```

---

### C# (`Back_csharp/`)

**Prérequis :** .NET SDK 9.0

```bash
cd Back_csharp
dotnet run   # http://localhost:3000
```

**Tests :**
```bash
dotnet run -- test
```

---

## Frontend (`public/`)

Interface web vanilla (HTML/CSS/JS sans framework), servie par chaque backend à la racine `/`.  
Ouvrir <http://localhost:3000/> après avoir démarré l'un des backends.

---

## Docker Compose

Tous les backends se lancent en parallèle depuis la racine du projet :

```bash
docker compose up --build
```

| Service | Backend | Port hôte |
|---|---|---|
| `calculator-js` | Node.js | 3000 |
| `calculator-python` | Python / FastAPI | 3001 |
| `calculator-go` | Go | 3002 |
| `calculator-c` | C | 3003 |
| `calculator-csharp` | C# | 3004 |
| `calculator-rust-front` | Rust + nginx | 3005 |

**Tests E2E en Docker** (contre le backend JS) :
```bash
docker compose --profile e2e up --abort-on-container-exit
```

Ou via le compose interne :
```bash
docker compose -f docker/docker-compose.yml up --build
```

---

## Structure du projet

```
.
├── public/                    ← front vanilla (HTML/CSS/JS)
├── Back_js/                   ← backend Node.js
├── Back_go/                   ← backend Go
├── Back_Python/               ← backend Python (FastAPI)
├── back_rust/                 ← backend Rust
├── Back_c/                    ← backend C
├── Back_csharp/               ← backend C#
├── tests/
│   ├── calculator.test.js     ← Jest — logique JS
│   ├── api.test.js            ← Jest — API HTTP JS
│   ├── front.test.js          ← Jest — logique front
│   └── e2e/
│       └── calculator.spec.js ← Playwright E2E
├── docker/
│   ├── Dockerfile.js
│   ├── Dockerfile.go
│   ├── Dockerfile.python
│   ├── Dockerfile.rust
│   ├── Dockerfile.c
│   ├── Dockerfile.csharp
│   ├── nginx.conf             ← proxy nginx pour Rust
│   └── docker-compose.yml     ← compose alternatif
├── docker-compose.yml         ← compose principal (racine)
├── Dockerfile.playwright      ← image E2E
└── .github/workflows/ci.yml
```

---

## CI GitHub Actions

À chaque `git push`, le pipeline exécute en parallèle :

| Job | Outil | Dépendance |
|---|---|---|
| **Lint** | ESLint | — |
| **test-backend** | Jest (Node 22 & 24) | lint |
| **test-frontend-unit** | Jest | lint |
| **test-go** | `go test` | — |
| **test-python** | pytest | — |
| **test-rust** | `cargo test` | — |
| **test-c** | `make test` (GCC) | — |
| **test-csharp** | `dotnet run -- test` | — |
| **e2e** | Playwright (chromium + firefox) | test-backend, test-frontend-unit |
| **docker** | `docker compose build` (tous les backends) | tous les tests |

Voir [.github/workflows/ci.yml](.github/workflows/ci.yml).

# Backend C — Calculatrice (4ᵉ implémentation)

Réimplémentation en **C** de l'API calculatrice, à iso-contrat avec les autres
backends du projet :

| #   | Langage | Emplacement                  | Auteur |
| --- | ------- | ---------------------------- | ------ |
| 1   | Node.js | [`../src/`](../src/)         | —      |
| 2   | Go      | (dossier dédié)              | Théo   |
| 3   | Rust    | [`../backend-rust/`](../backend-rust/) | nous   |
| 4   | C       | `backend-c/` (ce dossier)    | nous   |

Objectif : exposer **exactement la même API** que [`../src/server.js`](../src/server.js),
afin que le même front-end et les mêmes tests fonctionnent quel que soit le backend.

> ⚙️ Aucune dépendance externe : sockets bruts (Winsock sous Windows, sockets
> POSIX sous Linux) + bibliothèque standard C. C11.

## Structure

```text
backend-c/
├── calculator.h   # interface de la logique métier
├── calculator.c   # add / subtract / multiply / divide
├── server.c       # serveur HTTP : sockets, routage, parsing, CORS
├── test.c         # tests unitaires (logique + routage)
├── Makefile       # cibles : all, test, run, clean
└── Dockerfile     # build multi-étapes (gcc → debian:slim)
```

## Contrat de l'API

Endpoint principal : `GET /calculate?operation=<op>&a=<n>&b=<n>`

Opérations supportées : `add`, `subtract`, `multiply`, `divide`.

| Requête                                   | Code  | Corps                                                         |
| ----------------------------------------- | ----- | ------------------------------------------------------------- |
| `GET /calculate?operation=add&a=2&b=3`    | `200` | `{"operation":"add","a":2,"b":3,"result":5}`                  |
| `GET /calculate` (paramètre manquant)     | `400` | `{"error":"Parametres attendus : operation, a, b"}`           |
| `GET /calculate?operation=add&a=x&b=2`    | `400` | `{"error":"Les parametres a et b doivent etre des nombres."}` |
| `GET /calculate?operation=modulo&a=1&b=2` | `400` | `{"error":"Operation inconnue. ..."}`                         |
| `GET /calculate?operation=divide&a=1&b=0` | `400` | `{"error":"Division par zero impossible."}`                   |
| `GET /`                                   | `200` | `OK` (sonde de santé)                                         |
| Route inconnue                            | `404` | `{"error":"Route introuvable."}`                              |
| Méthode ≠ GET                             | `405` | `{"error":"Methode non autorisee. Utiliser GET."}`            |
| `OPTIONS *` (préflight CORS)              | `204` | _(vide)_                                                      |

En-têtes CORS (`Access-Control-Allow-Origin/Methods/Headers`) ajoutés sur toutes
les réponses.

## Prérequis

Un compilateur C (`gcc`, `clang` ou MinGW sous Windows) et `make`.

## Compiler & lancer

Avec `make` (Linux/macOS, ou MinGW + `mingw32-make` sous Windows) :

```bash
cd backend-c
make            # produit ./calculator-backend
make run        # écoute sur http://localhost:3000
PORT=8080 make run
```

Sans `make`, compilation directe :

```bash
# Linux / macOS
gcc -O2 -std=c11 -o calculator-backend server.c calculator.c -lm

# Windows (MinGW)
gcc -O2 -std=c11 -o calculator-backend.exe server.c calculator.c -lws2_32
```

Exemple de requête :

```bash
curl "http://localhost:3000/calculate?operation=divide&a=10&b=4"
# {"operation":"divide","a":10,"b":4,"result":2.5}
```

## Tests

```bash
make test       # compile test.c + server.c (sans main) et exécute la suite
```

## Docker

```bash
docker build -t calc-c ./backend-c
docker run -p 3000:3000 calc-c
```

Le `Dockerfile` utilise un build multi-étapes : compilation dans `gcc:13`, puis
copie du seul binaire dans une image `debian:bookworm-slim`.

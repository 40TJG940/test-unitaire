# Backend Rust — Calculatrice (3ᵉ implémentation)

Réimplémentation en **Rust** de l'API calculatrice, à iso-contrat avec les
autres backends du projet :

| #   | Langage | Emplacement                  | Auteur |
| --- | ------- | ---------------------------- | ------ |
| 1   | Node.js | [`../src/`](../src/)         | —      |
| 2   | Go      | (dossier dédié)              | Théo   |
| 3   | Rust    | `backend-rust/` (ce dossier) | nous   |

Objectif : exposer **exactement la même API** que [`../src/server.js`](../src/server.js),
afin que le même front-end et les mêmes tests fonctionnent quel que soit le backend.

> ⚙️ Aucune dépendance externe : uniquement la **bibliothèque standard** Rust
> (`std::net`, `std::io`, `std::thread`). Le projet compile hors-ligne.

## Structure

```text
backend-rust/
├── Cargo.toml          # métadonnées + profil release (LTO)
├── Dockerfile          # build multi-étapes (rust:slim → debian:slim)
├── README.md
└── src/
    ├── main.rs         # serveur HTTP : routage, parsing, réponses, CORS
    └── calculator.rs   # logique métier + tests unitaires
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

[Rust](https://rustup.rs/) (édition 2021, `cargo` ≥ 1.70).

ℹ️ Sur cette machine `cargo` est installé dans `~/.cargo/bin` mais absent du
`PATH`. L'ajouter à la session PowerShell :

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
```

## Lancer en local

```bash
cd backend-rust
cargo run             # écoute sur http://localhost:3000
PORT=8080 cargo run   # port personnalisé via la variable d'env PORT
```

Exemple de requête :

```bash
curl "http://localhost:3000/calculate?operation=divide&a=10&b=4"
# {"operation":"divide","a":10,"b":4,"result":2.5}
```

## Tests

```bash
cargo test            # 14 tests : logique métier + routage HTTP
```

## Docker

```bash
# Build de l'image
docker build -t calc-rust ./backend-rust

# Lancement
docker run -p 3000:3000 calc-rust
```

Le `Dockerfile` utilise un build multi-étapes : compilation dans `rust:slim`,
puis copie du seul binaire dans une image `debian:bookworm-slim` légère.

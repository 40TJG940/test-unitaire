# Backend C# — Calculatrice (5ᵉ implémentation)

Réimplémentation en **C# / .NET 9** de l'API calculatrice, à iso-contrat avec
les autres backends du projet :

| #   | Langage | Emplacement                            | Auteur |
| --- | ------- | -------------------------------------- | ------ |
| 1   | Node.js | [`../src/`](../src/)                   | —      |
| 2   | Go      | (dossier dédié)                        | Théo   |
| 3   | Rust    | [`../backend-rust/`](../backend-rust/) | nous   |
| 4   | C       | [`../backend-c/`](../backend-c/)       | nous   |
| 5   | C#      | `backend-csharp/` (ce dossier)         | nous   |

Objectif : exposer **exactement la même API** que [`../src/server.js`](../src/server.js),
afin que le même front-end et les mêmes tests fonctionnent quel que soit le backend.

> ⚙️ Aucune dépendance NuGet : uniquement `System.Net.HttpListener` et la BCL.

## Structure

```text
backend-csharp/
├── backend-csharp.csproj   # projet console net9.0
├── Calculator.cs           # logique métier + formatage des nombres
├── Router.cs               # routage de l'API (fonction pure, testable)
├── Program.cs              # serveur HttpListener + service du front
├── Tests.cs                # suite de tests maison
└── Dockerfile              # build multi-étapes (sdk → runtime)
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
| `GET /` ou `/index.html`                  | `200` | le front (HTML)                                               |
| Route inconnue                            | `404` | `{"error":"Route introuvable."}`                              |
| Méthode ≠ GET                             | `405` | `{"error":"Methode non autorisee. Utiliser GET."}`            |
| `OPTIONS *` (préflight CORS)              | `204` | _(vide)_                                                      |

En-têtes CORS (`Access-Control-Allow-Origin/Methods/Headers`) ajoutés sur toutes
les réponses. Le serveur sert aussi `index.html`, `style.css` et `app.js` depuis
`../public` : ouvrir `http://localhost:3000/` affiche directement la calculatrice.

## Prérequis

[.NET SDK 9](https://dotnet.microsoft.com/download).

## Lancer en local

```bash
cd backend-csharp
dotnet run               # écoute sur http://localhost:3000
PORT=8080 dotnet run     # port personnalisé
```

Puis ouvrir **http://localhost:3000/**.

Exemple de requête :

```bash
curl "http://localhost:3000/calculate?operation=divide&a=10&b=4"
# {"operation":"divide","a":10,"b":4,"result":2.5}
```

## Tests

```bash
dotnet run -- test       # exécute la suite (logique métier + routage)
```

## Docker

```bash
docker build -t calc-csharp ./backend-csharp
docker run -p 3000:3000 calc-csharp
```

# ⚠️ Coordination — deux sessions Claude en parallèle

Une **seconde session Claude** travaille en parallèle sur ce dépôt (elle porte
le backend en **Rust**, dans `backend-rust/`). Périmètres **disjoints**.

## Périmètre de CETTE session (backend Python)
- **Objectif** : porter le backend du TP1 (`Back_js/`) vers **Python + FastAPI**,
  à contrat **strictement identique** (mêmes endpoints, mêmes réponses, mêmes
  headers), afin de remplacer le backend Node.js **sans toucher au front**
  (`public/`).
- **Écrit UNIQUEMENT dans `Back_Python/`** : `calculator.py`, `server.py`,
  `requirements.txt`, `Dockerfile`. Aucun autre fichier du dépôt n'est modifié.

## Ce que cette session NE touche PAS (pour éviter tout conflit)
- `Back_js/`, `public/`, `tests/`, `.github/`, `Dockerfile*`,
  `docker-compose.yml`, `nginx.conf`, `package.json`, `eslint.config.js`,
  `jest.config.js`, `README.md`.
- **Aucun `git add` / `commit` / `reset`** : le staging en cours de l'autre
  session (renommage `src/ → Back_js/`, etc.) est laissé intact.

> Si tu es l'autre session : merci de ne pas modifier `Back_Python/`.

# Image de production du backend Python (FastAPI + uvicorn).
# Équivalent du Dockerfile Node racine (stage `production`), côté Python.
#
# ⚠️ À builder depuis la RACINE du projet : le front (`public/`) doit être
#    dans le contexte de build.
#   docker build -f Back_Python/Dockerfile --target production -t calculator-backend-py .
#   docker run -p 3000:3000 calculator-backend-py
FROM python:3.12-slim AS production

WORKDIR /app

# Dépendances d'abord (cache de couche) : réinstallées seulement si requirements change.
COPY Back_Python/requirements.txt ./Back_Python/requirements.txt
RUN pip install --no-cache-dir -r Back_Python/requirements.txt

# Code backend + front servi à la racine (mêmes chemins que le backend Node).
COPY Back_Python/ ./Back_Python/
COPY public/ ./public/

# Écoute sur toutes les interfaces (accessible hors du conteneur / derrière nginx).
ENV PORT=3000 \
    HOST=0.0.0.0
EXPOSE 3000

# Réplique l'intention du healthcheck du docker-compose (GET / doit répondre 200).
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=5s \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:3000/').status==200 else 1)"

CMD ["python", "Back_Python/server.py"]

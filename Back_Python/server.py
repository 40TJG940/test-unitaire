"""Serveur HTTP de la calculatrice — portage Python (FastAPI) de `Back_js/server.js`.

Contrat identique au backend Node.js d'origine, pour un remplacement « seamless »
sans toucher au front (servi depuis `../public`) :

    GET /calculate?operation=<op>&a=<n>&b=<n>  → 200 {operation, a, b, result}
    GET / | /index.html | /style.css | /app.js → assets du front
    OPTIONS *                                   → 204 (préflight CORS)
    méthode ≠ GET/OPTIONS                        → 405 + header Allow
    route inconnue                               → 404 {error}
    paramètre manquant / non numérique / opération inconnue / ÷0 → 400 {error}

Les nombres sont sérialisés comme le ferait `JSON.stringify` de Node :
entiers sans décimale, ±Infinity et NaN → null, -0 → 0.
"""

import json
import math
import os
import re
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import Response

from calculator import Calculator

PORT = int(os.environ.get("PORT", "3000"))
HOST = os.environ.get("HOST", "0.0.0.0")
ALLOWED_OPERATIONS = ("add", "subtract", "multiply", "divide")

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"

# Assets statiques servis à la racine. Whitelist explicite : tout autre
# chemin GET reste un 404 JSON (le contrat de l'API ne change pas).
STATIC_ROUTES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "application/javascript; charset=utf-8"),
}

# Chargés une fois au démarrage : pas d'I/O ni de branche d'erreur par requête.
STATIC_CACHE = {
    route: ((PUBLIC_DIR / filename).read_bytes(), content_type)
    for route, (filename, content_type) in STATIC_ROUTES.items()
}

# En-têtes CORS communs à toutes les réponses JSON. Le Content-Type est ajouté
# au cas par cas afin de rester maître de la sérialisation des nombres.
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}
JSON_CONTENT_TYPE = "application/json; charset=utf-8"

calculator = Calculator()

# Littéral numérique décimal accepté par Number() de JS (entier, flottant,
# notation scientifique). Distingue un nombre valide d'une saisie invalide.
_NUMBER_RE = re.compile(r"^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$")


def to_number(raw):
    """Reproduit `Number(string)` de JS pour les besoins de l'API.

    "" ou espaces → 0 ; "Infinity"/"-Infinity" → ±inf ; littéral décimal → float ;
    tout le reste → NaN (déclenche le 400 « doivent être des nombres »).
    """
    text = raw.strip()
    if text == "":
        return 0.0
    if text in ("Infinity", "+Infinity"):
        return math.inf
    if text == "-Infinity":
        return -math.inf
    if _NUMBER_RE.match(text):
        return float(text)
    return math.nan


def js_number(value):
    """Convertit un float en l'équivalent produit par `JSON.stringify` de Node :
    entiers sans décimale, ±Infinity et NaN → None (null), -0 → 0."""
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        if value == 0:
            return 0
        if value.is_integer() and abs(value) < 1e21:
            return int(value)
    return value


def json_response(status, payload, extra_headers=None):
    """Réponse JSON au format Node : séparateurs compacts, UTF-8, nombres « JS »."""
    normalized = {
        key: js_number(val) if isinstance(val, float) else val
        for key, val in payload.items()
    }
    body = json.dumps(normalized, ensure_ascii=False, separators=(",", ":"))
    headers = {**CORS_HEADERS, "Content-Type": JSON_CONTENT_TYPE}
    if extra_headers:
        headers.update(extra_headers)
    return Response(content=body.encode("utf-8"), status_code=status, headers=headers)


app = FastAPI()
# Pas de redirection automatique : « /calculate/ » doit rester un 404, pas un 307.
app.router.redirect_slashes = False


@app.middleware("http")
async def method_gate(request: Request, call_next):
    # OPTIONS → 204 sans body (préflight CORS), quel que soit le chemin.
    if request.method == "OPTIONS":
        return Response(
            status_code=204,
            headers={**CORS_HEADERS, "Content-Type": JSON_CONTENT_TYPE},
        )
    # Toute méthode ≠ GET → 405 + Allow, quel que soit le chemin.
    if request.method != "GET":
        return json_response(
            405,
            {"error": "Méthode non autorisée. Utiliser GET."},
            {"Allow": "GET, OPTIONS"},
        )
    return await call_next(request)


@app.get("/calculate")
async def calculate(request: Request):
    params = request.query_params
    operation = params.get("operation")
    a = params.get("a")
    b = params.get("b")

    # operation, a ou b manquant → 400
    if operation is None or a is None or b is None:
        return json_response(400, {"error": "Paramètres attendus : operation, a, b"})

    # a / b non numériques → 400
    num_a = to_number(a)
    num_b = to_number(b)
    if math.isnan(num_a) or math.isnan(num_b):
        return json_response(
            400, {"error": "Les paramètres a et b doivent être des nombres."}
        )

    # Opération inconnue → 400
    if operation not in ALLOWED_OPERATIONS:
        return json_response(
            400,
            {"error": "Opération inconnue. Utiliser : add, subtract, multiply, divide"},
        )

    # Exécuter l'opération ; la division par zéro lève une exception → 400.
    try:
        result = getattr(calculator, operation)(num_a, num_b)
    except ValueError as err:
        return json_response(400, {"error": str(err)})

    return json_response(
        200, {"operation": operation, "a": num_a, "b": num_b, "result": result}
    )


@app.get("/")
@app.get("/index.html")
@app.get("/style.css")
@app.get("/app.js")
async def serve_static(request: Request):
    body, content_type = STATIC_CACHE[request.url.path]
    return Response(
        content=body,
        headers={"Content-Type": content_type, "Access-Control-Allow-Origin": "*"},
    )


@app.get("/{full_path:path}")
async def not_found(full_path: str):
    # Route ≠ /calculate et hors assets whitelistés → 404 JSON (contrat API).
    return json_response(404, {"error": "Route introuvable."})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)

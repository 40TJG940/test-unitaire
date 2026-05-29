const http = require("http");
const url = require("url");
const Calculator = require("./calculator");

const PORT = process.env.PORT || 3000;
const ALLOWED_OPERATIONS = ["add", "subtract", "multiply", "divide"];

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const calculator = new Calculator();

function sendJSON(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, { ...CORS_HEADERS, ...extraHeaders });
  res.end(JSON.stringify(payload));
}

function requestHandler(req, res) {
  // 2. OPTIONS → 204 sans body
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // 3. Méthode ≠ GET → 405 + Allow
  if (req.method !== "GET") {
    sendJSON(
      res,
      405,
      { error: "Méthode non autorisée. Utiliser GET." },
      { Allow: "GET, OPTIONS" }
    );
    return;
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // 4. Route ≠ /calculate → 404
  if (pathname !== "/calculate") {
    sendJSON(res, 404, { error: "Route introuvable." });
    return;
  }

  const { operation, a, b } = parsed.query;

  // 5. operation, a ou b manquants → 400
  if (operation === undefined || a === undefined || b === undefined) {
    sendJSON(res, 400, { error: "Paramètres attendus : operation, a, b" });
    return;
  }

  // 6. Convertir a et b en Number, si NaN → 400
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isNaN(numA) || Number.isNaN(numB)) {
    sendJSON(res, 400, { error: "Les paramètres a et b doivent être des nombres." });
    return;
  }

  // 8. Opération inconnue → 400
  if (!ALLOWED_OPERATIONS.includes(operation)) {
    sendJSON(res, 400, {
      error: "Opération inconnue. Utiliser : add, subtract, multiply, divide",
    });
    return;
  }

  // 7. Exécuter l'opération via Calculator dans un try/catch
  try {
    const result = calculator[operation](numA, numB);
    // 9. Répondre 200 avec { operation, a, b, result }
    sendJSON(res, 200, { operation, a: numA, b: numB, result });
  } catch (err) {
    sendJSON(res, 400, { error: err.message });
  }
}

const server = http.createServer(requestHandler);

/* istanbul ignore next */
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });
}

module.exports = { requestHandler, server };

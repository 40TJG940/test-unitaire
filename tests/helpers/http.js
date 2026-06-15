const http = require("http");

/**
 * Envoie une requête HTTP à une instance de serveur de test.
 * @param {http.Server} server - Instance déjà en écoute
 * @param {string} path       - Chemin + query string
 * @param {string} method     - Méthode HTTP (défaut : "GET")
 * @returns {Promise<{status, headers, body, duration}>}
 */
function request(server, path, method = "GET") {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const start = Date.now();
    const req = http.request(
      { hostname: "127.0.0.1", port: addr.port, path, method },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          // Parse JSON uniquement si la réponse est du JSON ; sinon body brut
          // (les assets statiques HTML/CSS/JS sont renvoyés en texte).
          const contentType = res.headers["content-type"] || "";
          let body = null;
          if (data) {
            body = contentType.includes("application/json")
              ? JSON.parse(data)
              : data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            duration: Date.now() - start,
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

module.exports = { request };

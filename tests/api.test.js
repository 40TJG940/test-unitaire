const http = require("http");
const { requestHandler } = require("../Back_js/server");
const { request } = require("./helpers/http");

describe("API /calculate", () => {
  let server;

  beforeAll((done) => {
    server = http.createServer(requestHandler);
    server.listen(0, "127.0.0.1", done);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe("Performance", () => {
    it("une requête valide répond en moins de 100 ms", async () => {
      const { duration } = await request(server, "/calculate?operation=add&a=1&b=2");
      expect(duration).toBeLessThan(100);
    });

    it("une requête en erreur 400 répond en moins de 100 ms", async () => {
      const { duration } = await request(server, "/calculate?operation=add&a=2");
      expect(duration).toBeLessThan(100);
    });
  });

  describe("Headers de réponse", () => {
    it("réponse 200 — Content-Type et CORS corrects", async () => {
      const { status, headers } = await request(
        server,
        "/calculate?operation=add&a=2&b=3"
      );
      expect(status).toBe(200);
      expect(headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(headers["access-control-allow-origin"]).toBe("*");
    });

    it("réponse 400 — Content-Type et CORS corrects", async () => {
      const { status, headers } = await request(server, "/calculate?operation=add&a=2");
      expect(status).toBe(400);
      expect(headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(headers["access-control-allow-origin"]).toBe("*");
    });

    it("réponse 404 — Content-Type et CORS corrects", async () => {
      const { status, headers } = await request(server, "/unknown");
      expect(status).toBe(404);
      expect(headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(headers["access-control-allow-origin"]).toBe("*");
    });
  });

  describe("OPTIONS /calculate — preflight CORS", () => {
    it("doit répondre 204 sans body avec les bons headers CORS", async () => {
      const { status, body, headers } = await request(server, "/calculate", "OPTIONS");
      expect(status).toBe(204);
      expect(body).toBeNull();
      expect(headers["access-control-allow-origin"]).toBe("*");
      expect(headers["access-control-allow-methods"]).toContain("GET");
    });
  });

  describe("GET /calculate — cas nominaux", () => {
    it.each`
      operation     | a      | b      | expected
      ${"add"}      | ${2}   | ${3}   | ${5}
      ${"subtract"} | ${10}  | ${4}   | ${6}
      ${"multiply"} | ${6}   | ${7}   | ${42}
      ${"divide"}   | ${20}  | ${5}   | ${4}
      ${"add"}      | ${-5}  | ${-3}  | ${-8}
      ${"subtract"} | ${-5}  | ${-3}  | ${-2}
      ${"multiply"} | ${-3}  | ${-4}  | ${12}
      ${"divide"}   | ${-10} | ${-2}  | ${5}
    `(
      "$operation($a, $b) doit retourner $expected",
      async ({ operation, a, b, expected }) => {
        const { status, body } = await request(
          server,
          `/calculate?operation=${operation}&a=${a}&b=${b}`
        );
        expect(status).toBe(200);
        expect(body).toMatchObject({ operation, a, b, result: expected });
      }
    );

    it("division décimale 10/3 doit approcher 3.333", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=divide&a=10&b=3"
      );
      expect(status).toBe(200);
      expect(body.result).toBeCloseTo(3.333, 3);
    });

    it("décimaux en query string 1.5 + 2.5 = 4", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=add&a=1.5&b=2.5"
      );
      expect(status).toBe(200);
      expect(body.result).toBe(4);
    });

    it("contrat JSON 200 — body contient operation, a, b, result et pas error", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=multiply&a=3&b=4"
      );
      expect(status).toBe(200);
      expect(body).toHaveProperty("operation");
      expect(body).toHaveProperty("a");
      expect(body).toHaveProperty("b");
      expect(body).toHaveProperty("result");
      expect(body).not.toHaveProperty("error");
    });
  });

  describe("Méthode non autorisée", () => {
    it("POST → 405 avec error dans le body", async () => {
      const { status, body } = await request(server, "/calculate", "POST");
      expect(status).toBe(405);
      expect(body).toHaveProperty("error");
    });

    it("POST → header allow contient GET", async () => {
      const { status, headers } = await request(server, "/calculate", "POST");
      expect(status).toBe(405);
      expect(headers["allow"]).toContain("GET");
    });

    it("PUT → 405", async () => {
      const { status } = await request(server, "/calculate", "PUT");
      expect(status).toBe(405);
    });
  });

  describe("GET /calculate — erreurs 400", () => {
    it("b manquant → 400 message /Paramètres attendus/", async () => {
      const { status, body } = await request(server, "/calculate?operation=add&a=2");
      expect(status).toBe(400);
      expect(body.error).toMatch(/Paramètres attendus/);
    });

    it("a manquant → 400 message /Paramètres attendus/", async () => {
      const { status, body } = await request(server, "/calculate?operation=add&b=2");
      expect(status).toBe(400);
      expect(body.error).toMatch(/Paramètres attendus/);
    });

    it("a non numérique → 400 message /doivent être des nombres/", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=add&a=abc&b=3"
      );
      expect(status).toBe(400);
      expect(body.error).toMatch(/doivent être des nombres/);
    });

    it("b non numérique → 400 message /doivent être des nombres/", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=add&a=3&b=abc"
      );
      expect(status).toBe(400);
      expect(body.error).toMatch(/doivent être des nombres/);
    });

    it("division par zéro → 400 message exact \"Division par zéro impossible.\"", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=divide&a=10&b=0"
      );
      expect(status).toBe(400);
      expect(body.error).toBe("Division par zéro impossible.");
    });

    it("opération inconnue → 400 message /Opération inconnue/", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=modulo&a=10&b=3"
      );
      expect(status).toBe(400);
      expect(body.error).toMatch(/Opération inconnue/);
    });

    it("operation absent → 400 message /Paramètres attendus/", async () => {
      const { status, body } = await request(server, "/calculate?a=5&b=3");
      expect(status).toBe(400);
      expect(body.error).toMatch(/Paramètres attendus/);
    });

    it("contrat JSON erreur — body a error et pas result", async () => {
      const { status, body } = await request(server, "/calculate?operation=add&a=2");
      expect(status).toBe(400);
      expect(body).toHaveProperty("error");
      expect(body).not.toHaveProperty("result");
    });
  });

  describe("GET — autres routes", () => {
    it("route inconnue /unknown → 404 message exact \"Route introuvable.\"", async () => {
      const { status, body } = await request(server, "/unknown");
      expect(status).toBe(404);
      expect(body.error).toBe("Route introuvable.");
    });

    it("slash final /calculate/ → 404 avec error", async () => {
      const { status, body } = await request(server, "/calculate/");
      expect(status).toBe(404);
      expect(body).toHaveProperty("error");
    });
  });

  describe("Cas limites — edge cases", () => {
    it("très grande valeur 1e308 + 1e308 → 200, result vaut Infinity ou null/\"Infinity\"", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=add&a=1e308&b=1e308"
      );
      expect(status).toBe(200);
      // JSON.stringify(Infinity) produit "null" — le client reçoit null
      const acceptableValues = [null, Infinity, "Infinity"];
      expect(acceptableValues).toContain(body.result);
    });

    it("a=-0 → 200, body.result === 5, body.a === 0", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=add&a=-0&b=5"
      );
      expect(status).toBe(200);
      expect(body.result).toBe(5);
      // JSON.stringify(-0) produit "0" → le client reçoit 0
      expect(body.a).toBe(0);
    });
  });

  describe("Front statique servi à la racine", () => {
    it("racine / → 200 HTML (page calculatrice)", async () => {
      const { status, headers, body } = await request(server, "/");
      expect(status).toBe(200);
      expect(headers["content-type"]).toBe("text/html; charset=utf-8");
      expect(body).toContain("<!DOCTYPE html>");
      expect(body).toContain("/app.js");
    });

    it("/index.html → 200 HTML", async () => {
      const { status, headers } = await request(server, "/index.html");
      expect(status).toBe(200);
      expect(headers["content-type"]).toBe("text/html; charset=utf-8");
    });

    it("/style.css → 200 CSS", async () => {
      const { status, headers, body } = await request(server, "/style.css");
      expect(status).toBe(200);
      expect(headers["content-type"]).toBe("text/css; charset=utf-8");
      expect(body).toContain(".calculator");
    });

    it("/app.js → 200 JavaScript", async () => {
      const { status, headers, body } = await request(server, "/app.js");
      expect(status).toBe(200);
      expect(headers["content-type"]).toBe("application/javascript; charset=utf-8");
      expect(body).toContain("buildCalcUrl");
    });

    it("un asset non whitelisté (/secret.js) → 404 JSON (contrat API préservé)", async () => {
      const { status, body } = await request(server, "/secret.js");
      expect(status).toBe(404);
      expect(body.error).toBe("Route introuvable.");
    });
  });
});

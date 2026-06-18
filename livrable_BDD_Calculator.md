# Mini-Projet BDD — API Calculatrice

> Projet : **calculator-api-js** — API REST Node.js sans framework + front vanilla
> Approche : User Story → Critères d'acceptation → Scénarios BDD (Gherkin) → Résultat du test (réel, automatisé)

---

## 1. Calcul d'une opération arithmétique

**User story**
En tant qu'utilisateur de la calculatrice, je veux pouvoir additionner, soustraire, multiplier ou diviser deux nombres, afin d'obtenir un résultat fiable.

**Critères d'acceptation**
- `add`, `subtract`, `multiply`, `divide` retournent le bon résultat pour des entiers.
- Les flottants sont gérés (ex. 0.1 + 0.2 ≈ 0.3 — comparaison à `toBeCloseTo`).
- Les nombres négatifs sont gérés.
- L'API renvoie `200` avec un body `{ operation, a, b, result }`.

**Scénario BDD**
```gherkin
Scenario: Addition de deux entiers positifs
  Given le serveur est démarré
  When une requête GET /calculate?operation=add&a=2&b=3 est envoyée
  Then la réponse a le statut 200
  And le body est { operation: "add", a: 2, b: 3, result: 5 }

Scenario: Division décimale
  Given le serveur est démarré
  When une requête GET /calculate?operation=divide&a=10&b=3 est envoyée
  Then la réponse a le statut 200
  And body.result est proche de 3.333
```

**Résultat du test (réel) :** ✓ Validé — `tests/calculator.test.js` couvre les 4 opérations × 5 cas (entiers positifs/négatifs/zéro/flottants) ; `tests/api.test.js` couvre les 8 combinaisons nominales via `it.each`. **100 % de couverture** sur `calculator.js`.

---

## 2. Validation des paramètres d'entrée

**User story**
En tant que développeur consommant l'API, je veux recevoir une erreur claire quand mes paramètres sont invalides, afin de corriger ma requête.

**Critères d'acceptation**
- Si `operation`, `a` ou `b` est absent → `400` + message exact `"Paramètres attendus : operation, a, b"`.
- Si `a` ou `b` n'est pas numérique → `400` + message exact `"Les paramètres a et b doivent être des nombres."`.
- Si `operation` est inconnue → `400` + message exact `"Opération inconnue. Utiliser : add, subtract, multiply, divide"`.
- Aucune exception non gérée ne remonte au client.

**Scénario BDD**
```gherkin
Scenario: Paramètre b manquant
  When une requête GET /calculate?operation=add&a=2 est envoyée
  Then la réponse a le statut 400
  And body.error correspond à /Paramètres attendus/

Scenario: Valeur non numérique
  When une requête GET /calculate?operation=add&a=abc&b=3 est envoyée
  Then la réponse a le statut 400
  And body.error correspond à /doivent être des nombres/

Scenario: Opération inconnue
  When une requête GET /calculate?operation=modulo&a=10&b=3 est envoyée
  Then la réponse a le statut 400
  And body.error correspond à /Opération inconnue/
```

**Résultat du test (réel) :** ✓ Validé — bloc `describe("GET /calculate — erreurs 400")` couvre **7 cas** (paramètre manquant, a non numérique, b non numérique, opération inconnue, operation absent, contrat JSON erreur). Tous les messages sont vérifiés mot pour mot.

---

## 3. Gestion de la division par zéro

**User story**
En tant qu'utilisateur, je veux savoir clairement quand je tente une division par zéro, afin de ne pas obtenir un résultat ambigu.

**Critères d'acceptation**
- API : `divide(a, 0)` lève une `Error` avec le message exact `"Division par zéro impossible."`.
- API : la route répond `400` avec ce même message dans `body.error`.
- Front : 1/0 affiche `∞`, -1/0 affiche `−∞`, 0/0 affiche `Erreur` (indéfini).
- Le scénario est isolé : aucune autre opération valide n'est impactée.

**Scénario BDD**
```gherkin
Scenario: Division par zéro côté API
  When une requête GET /calculate?operation=divide&a=10&b=0 est envoyée
  Then la réponse a le statut 400
  And body.error vaut exactement "Division par zéro impossible."

Scenario: Division par zéro côté front (calculatrice web)
  Given l'utilisateur a tapé 1, ÷, 0
  When il clique sur "="
  Then l'afficheur montre "∞"
  And l'état n'est pas en erreur

Scenario: Zéro divisé par zéro côté front
  Given l'utilisateur a tapé 0, ÷, 0
  When il clique sur "="
  Then l'afficheur montre "Erreur"
```

**Résultat du test (réel) :** ✓ Validé — `tests/calculator.test.js` vérifie le throw avec `.toThrow("Division par zéro impossible.")`. `tests/api.test.js` vérifie le 400 + message exact. `tests/front.test.js` couvre `resolveDivideByZero` (5 cas : +∞, −∞, 0/0 erreur, autre opération → pas d'override, b≠0 → pas d'override) et `formatNumber(Infinity)` → "∞".

---

## 4. Conformité HTTP & headers CORS

**User story**
En tant que développeur front, je veux pouvoir appeler l'API depuis n'importe quelle origine et en JSON, afin d'intégrer la calculatrice dans une page web.

**Critères d'acceptation**
- Toute réponse a `Content-Type: application/json; charset=utf-8` (sauf assets statiques front).
- Toute réponse a `Access-Control-Allow-Origin: *`.
- Une requête `OPTIONS /calculate` répond `204` sans body.
- Les headers CORS sont présents sur le 204 (Allow-Origin, Allow-Methods avec "GET").

**Scénario BDD**
```gherkin
Scenario: Preflight CORS OPTIONS
  When une requête OPTIONS /calculate est envoyée
  Then la réponse a le statut 204
  And le body est null
  And le header Access-Control-Allow-Origin vaut "*"
  And le header Access-Control-Allow-Methods contient "GET"

Scenario: Content-Type sur réponse 200
  When une requête GET /calculate?operation=add&a=2&b=3 est envoyée
  Then le header content-type vaut "application/json; charset=utf-8"
```

**Résultat du test (réel) :** ✓ Validé — blocs `describe("Headers de réponse")` (3 tests : statut 200, 400, 404) et `describe("OPTIONS /calculate — preflight CORS")` (1 test) passent tous.

---

## 5. Méthode HTTP non autorisée

**User story**
En tant qu'utilisateur d'API mal documentée, je veux savoir quelles méthodes HTTP sont supportées, afin de corriger mon appel.

**Critères d'acceptation**
- `POST`, `PUT`, `DELETE`, `PATCH` sur `/calculate` → `405`.
- Le body contient `{ error: "Méthode non autorisée. Utiliser GET." }`.
- Le header `Allow: GET, OPTIONS` est présent (RFC 7231).

**Scénario BDD**
```gherkin
Scenario: POST refusé avec header Allow
  When une requête POST /calculate est envoyée
  Then la réponse a le statut 405
  And body.error contient "Méthode non autorisée"
  And le header allow contient "GET"

Scenario: PUT refusé
  When une requête PUT /calculate est envoyée
  Then la réponse a le statut 405
```

**Résultat du test (réel) :** ✓ Validé — bloc `describe("Méthode non autorisée")` couvre 3 tests (POST → 405 + body error, POST → header allow contient GET, PUT → 405).

---

## 6. Route inconnue

**User story**
En tant que développeur, je veux qu'une URL erronée renvoie une erreur claire, afin de ne pas confondre avec une panne serveur.

**Critères d'acceptation**
- Toute route ≠ `/calculate` (et hors assets front `index.html`, `app.js`, `style.css`) → `404`.
- Body : `{ error: "Route introuvable." }` (message exact).
- `/`, `/calculate/` (avec slash final), `/unknown` doivent tous tomber en 404.

**Scénario BDD**
```gherkin
Scenario: Route /unknown introuvable
  When une requête GET /unknown est envoyée
  Then la réponse a le statut 404
  And body.error vaut "Route introuvable."

Scenario: Slash final non géré
  When une requête GET /calculate/ est envoyée
  Then la réponse a le statut 404
  And body.error est présent
```

**Résultat du test (réel) :** ✓ Validé — bloc `describe("GET — autres routes")` couvre 3 tests (`/unknown`, `/`, `/calculate/`). Le message exact est vérifié pour `/unknown`.

---

## 7. Performance et cas limites

**User story**
En tant qu'utilisateur, je veux une réponse instantanée à chaque calcul, afin que la calculatrice reste fluide.

**Critères d'acceptation**
- Toute requête valide ou en erreur 400 répond en **< 100 ms** localement.
- Les très grandes valeurs (1e308 + 1e308) renvoient `200` avec `result` sérialisé (Infinity → `null` en JSON).
- `a=-0` retourne `body.a === 0` (JSON.stringify(-0) = "0").
- Le serveur supporte le port aléatoire `listen(0)` pour les tests parallèles en CI.

**Scénario BDD**
```gherkin
Scenario: Performance d'une requête valide
  When une requête GET /calculate?operation=add&a=1&b=2 est envoyée
  Then la durée de la requête est inférieure à 100 ms

Scenario: Très grande valeur (overflow → Infinity)
  When une requête GET /calculate?operation=add&a=1e308&b=1e308 est envoyée
  Then la réponse a le statut 200
  And body.result est null ou Infinity (Infinity sérialisé en JSON null)

Scenario: Zéro négatif normalisé
  When une requête GET /calculate?operation=add&a=-0&b=5 est envoyée
  Then body.a vaut 0
  And body.result vaut 5
```

**Résultat du test (réel) :** ✓ Validé — blocs `describe("Performance")` (2 tests, durée < 100 ms) et `describe("Cas limites — edge cases")` (2 tests, overflow + zéro négatif) passent.

---

## Conclusion

**Synthèse des tests automatisés**

| Fonctionnalité | Statut | Couverture |
|---|---|---|
| F1 Calcul opérations | ✓ Validé | 100 % sur `calculator.js` |
| F2 Validation params | ✓ Validé | 7 cas d'erreur 400 |
| F3 Division par zéro | ✓ Validé | API (throw + 400) + Front (∞ / −∞ / Erreur) |
| F4 HTTP & CORS | ✓ Validé | 3 statuts × Content-Type + preflight OPTIONS |
| F5 Méthode non autorisée | ✓ Validé | POST, PUT → 405 + header Allow |
| F6 Route inconnue | ✓ Validé | `/unknown`, `/`, `/calculate/` |
| F7 Performance & limites | ✓ Validé | < 100 ms + overflow + zéro négatif |

**Métriques globales (npm run test:coverage)**
- **58+ tests** dans la suite back (calculator + api)
- **Couverture : 100 %** sur stmts / branches / functions / lines
- Lint ESLint : **0 erreur**
- CI GitHub Actions : pipeline en 5 jobs (lint → test-backend matrice Node 22/24 → test-frontend-unit → e2e Playwright Chromium/Firefox → docker build)

**Ce que la démarche apporte (vs TP0 BDD AliExpress)**
- Les **scénarios BDD** sont ici **exécutables automatiquement** par Jest, pas seulement validés à la main.
- Les **messages d'erreur exacts** font partie du contrat d'API, vérifiés mot pour mot par les tests — le BDD oblige à les figer en amont.
- Le **TDD** s'applique naturellement : on écrit d'abord le scénario Gherkin → on traduit en test Jest → on implémente le code minimal pour passer.

**Leçons tirées**
1. **BDD + tests automatisés = contrat vivant** : tant que les tests passent, le comportement reste conforme aux scénarios métier. Toute régression est détectée à la prochaine CI.
2. **Côté API, on respecte la spec à la lettre** (division par zéro → 400). Côté front, on **adapte l'UX** (afficher ∞). Les deux ne sont pas contradictoires : la couche d'interprétation traduit le code d'erreur en affichage.
3. **Pyramide des tests** : ici on a beaucoup de tests unitaires (`calculator.test.js`), une couche d'intégration moyenne (`api.test.js`) et une couche E2E réduite (Playwright). C'est exactement la forme recommandée par le cours.
4. **Couverture ≠ qualité** : viser 100 % oblige à tester chaque branche (notamment les cas d'erreur), mais ne garantit pas que tous les cas métier sont pensés — d'où l'utilité de partir des **scénarios BDD** (besoin) plutôt que du code (implémentation).

**À retenir**
Le BDD écrit en amont (TP0) sert à **aligner** dev/QA/métier sur le comportement attendu. Le BDD outillé en tests automatisés (TP1) sert à **garantir** ce comportement dans la durée. Les deux sont les deux faces d'une même médaille : **on parle d'abord, on automatise ensuite**.

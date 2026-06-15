const { test, expect } = require("@playwright/test");

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Clique sur la touche d'un chiffre. */
const digit = (page, d) => page.click(`[data-digit="${d}"]`);

/** Clique sur une touche opérateur (ex. "+", "−", "×", "÷"). */
const op = (page, symbol) => page.click(`[data-op="${symbol}"]`);

/** Clique sur une touche d'action (clear, back, equals, decimal, negate, percent). */
const action = (page, name) => page.click(`[data-action="${name}"]`);

/** Retourne la valeur courante de l'écran. */
const display = (page) => page.locator("#display");

// ─── Chargement ─────────────────────────────────────────────────────────────

test.describe("Chargement de la page", () => {
  test("affiche le titre et la calculatrice", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("La calculatrice");
    await expect(display(page)).toBeVisible();
    await expect(display(page)).toHaveValue("0");
    await expect(page.locator(".keys")).toBeVisible();
  });

  test("l'horloge affiche la date et l'heure", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#date")).not.toBeEmpty();
    await expect(page.locator("#time")).not.toBeEmpty();
  });
});

// ─── Opérations de base ─────────────────────────────────────────────────────

test.describe("Opérations de base", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("addition : 5 + 3 = 8", async ({ page }) => {
    await digit(page, "5");
    await op(page, "+");
    await digit(page, "3");
    await action(page, "equals");
    await expect(display(page)).toHaveValue("8");
  });

  test("soustraction : 10 − 4 = 6", async ({ page }) => {
    await digit(page, "1");
    await digit(page, "0");
    await op(page, "−");
    await digit(page, "4");
    await action(page, "equals");
    await expect(display(page)).toHaveValue("6");
  });

  test("multiplication : 6 × 7 = 42", async ({ page }) => {
    await digit(page, "6");
    await op(page, "×");
    await digit(page, "7");
    await action(page, "equals");
    await expect(display(page)).toHaveValue("42");
  });

  test("division : 15 ÷ 3 = 5", async ({ page }) => {
    await digit(page, "1");
    await digit(page, "5");
    await op(page, "÷");
    await digit(page, "3");
    await action(page, "equals");
    await expect(display(page)).toHaveValue("5");
  });

  test("division par zéro affiche Erreur", async ({ page }) => {
    await digit(page, "8");
    await op(page, "÷");
    await digit(page, "0");
    await action(page, "equals");
    await expect(display(page)).toHaveValue("Erreur");
  });

  test("enchaînement : 2 + 3 = 5, puis × 4 = 20", async ({ page }) => {
    await digit(page, "2");
    await op(page, "+");
    await digit(page, "3");
    await action(page, "equals");
    await expect(display(page)).toHaveValue("5");

    await op(page, "×");
    await digit(page, "4");
    await action(page, "equals");
    await expect(display(page)).toHaveValue("20");
  });
});

// ─── Contrôles ──────────────────────────────────────────────────────────────

test.describe("Contrôles", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("CE remet l'écran à 0", async ({ page }) => {
    await digit(page, "9");
    await digit(page, "9");
    await action(page, "clear");
    await expect(display(page)).toHaveValue("0");
  });

  test("← efface le dernier chiffre", async ({ page }) => {
    await digit(page, "1");
    await digit(page, "2");
    await digit(page, "3");
    await action(page, "back");
    await expect(display(page)).toHaveValue("12");
  });

  test("← sur un seul chiffre retombe sur 0", async ({ page }) => {
    await digit(page, "7");
    await action(page, "back");
    await expect(display(page)).toHaveValue("0");
  });

  test("± bascule le signe positif / négatif", async ({ page }) => {
    await digit(page, "5");
    await action(page, "negate");
    await expect(display(page)).toHaveValue("-5");
    await action(page, "negate");
    await expect(display(page)).toHaveValue("5");
  });

  test("% divise par 100 (50 → 0,5)", async ({ page }) => {
    await digit(page, "5");
    await digit(page, "0");
    await action(page, "percent");
    await expect(display(page)).toHaveValue("0,5");
  });

  test("après une erreur, saisir un chiffre repart à zéro", async ({ page }) => {
    await digit(page, "8");
    await op(page, "÷");
    await digit(page, "0");
    await action(page, "equals");
    await expect(display(page)).toHaveValue("Erreur");

    await digit(page, "5");
    await expect(display(page)).toHaveValue("5");
  });
});

// ─── Saisie décimale ────────────────────────────────────────────────────────

test.describe("Nombres décimaux", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1,5 + 2,5 = 4", async ({ page }) => {
    await digit(page, "1");
    await action(page, "decimal");
    await digit(page, "5");
    await op(page, "+");
    await digit(page, "2");
    await action(page, "decimal");
    await digit(page, "5");
    await action(page, "equals");
    await expect(display(page)).toHaveValue("4");
  });

  test("la virgule n'est insérée qu'une seule fois", async ({ page }) => {
    await digit(page, "3");
    await action(page, "decimal");
    await action(page, "decimal");
    await digit(page, "1");
    await expect(display(page)).toHaveValue("3,1");
  });
});

// ─── Historique ─────────────────────────────────────────────────────────────

test.describe("Historique", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("un calcul apparaît dans l'historique", async ({ page }) => {
    await digit(page, "5");
    await op(page, "+");
    await digit(page, "3");
    await action(page, "equals");

    await page.click("#history-toggle");
    await expect(page.locator("#history-list li")).toHaveCount(1);
    await expect(page.locator("#history-list li")).toContainText("5 + 3 = 8");
  });

  test("plusieurs calculs s'empilent dans l'historique", async ({ page }) => {
    await digit(page, "2");
    await op(page, "+");
    await digit(page, "2");
    await action(page, "equals");

    await digit(page, "9");
    await op(page, "−");
    await digit(page, "4");
    await action(page, "equals");

    await page.click("#history-toggle");
    await expect(page.locator("#history-list li")).toHaveCount(2);
  });

  test("le bouton Effacer vide l'historique", async ({ page }) => {
    await digit(page, "5");
    await op(page, "+");
    await digit(page, "3");
    await action(page, "equals");

    await page.click("#history-toggle");
    await page.click("#history-clear");
    await expect(page.locator("#history-list li")).toHaveCount(0);
    await expect(page.locator("#history-empty")).toBeVisible();
  });

  test("le bouton ✕ ferme le panneau", async ({ page }) => {
    await page.click("#history-toggle");
    await expect(page.locator("#history-panel")).toHaveAttribute("aria-hidden", "false");

    await page.click("#history-close");
    await expect(page.locator("#history-panel")).toHaveAttribute("aria-hidden", "true");
  });
});

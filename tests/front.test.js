const {
  operationFor,
  buildCalcUrl,
  interpret,
  appendDigit,
  appendDecimal,
  toggleSign,
  applyPercent,
  backspace,
  formatNumber,
  toDisplay,
  formatHistoryEntry,
} = require("../public/app");

describe("Front — operationFor (symbole → opération API)", () => {
  it("mappe chaque symbole vers le nom attendu par l'API", () => {
    expect(operationFor("+")).toBe("add");
    expect(operationFor("−")).toBe("subtract");
    expect(operationFor("×")).toBe("multiply");
    expect(operationFor("÷")).toBe("divide");
  });

  it("renvoie null pour un symbole inconnu", () => {
    expect(operationFor("?")).toBeNull();
  });
});

describe("Front — buildCalcUrl", () => {
  it("construit l'URL avec les paramètres encodés", () => {
    expect(buildCalcUrl("add", 5, 3)).toBe("/calculate?operation=add&a=5&b=3");
  });
});

describe("Front — interpret (réponse API → état)", () => {
  it("200 avec result → ok + value", () => {
    expect(interpret(200, { result: 8 })).toEqual({ ok: true, value: 8 });
  });

  it("200 avec result null (Infinity) → ok + value null", () => {
    expect(interpret(200, { result: null })).toEqual({ ok: true, value: null });
  });

  it("400 avec error → échec + message de l'API", () => {
    expect(interpret(400, { error: "Division par zéro impossible." })).toEqual({
      ok: false,
      message: "Division par zéro impossible.",
    });
  });

  it("statut inattendu sans body → échec + message avec code HTTP", () => {
    expect(interpret(500, null).ok).toBe(false);
    expect(interpret(500, null).message).toMatch(/HTTP 500/);
  });
});

describe("Front — saisie", () => {
  it("appendDigit remplace le zéro initial puis concatène", () => {
    expect(appendDigit("0", "7")).toBe("7");
    expect(appendDigit("7", "5")).toBe("75");
  });

  it("appendDecimal n'ajoute qu'un seul séparateur", () => {
    expect(appendDecimal("12")).toBe("12.");
    expect(appendDecimal("12.5")).toBe("12.5");
  });

  it("backspace efface le dernier caractère et retombe sur 0", () => {
    expect(backspace("123")).toBe("12");
    expect(backspace("5")).toBe("0");
    expect(backspace("-7")).toBe("0");
  });
});

describe("Front — transformations", () => {
  it("toggleSign bascule le signe (sauf zéro)", () => {
    expect(toggleSign("5")).toBe("-5");
    expect(toggleSign("-5")).toBe("5");
    expect(toggleSign("0")).toBe("0");
  });

  it("applyPercent divise par 100", () => {
    expect(applyPercent("50")).toBe("0.5");
    expect(applyPercent("200")).toBe("2");
  });
});

describe("Front — formatNumber / toDisplay", () => {
  it("formate un nombre fini et tronque les flottants longs", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(10 / 3)).toBe("3.33333333333");
  });

  it("Infinity → '∞', -Infinity → '−∞'", () => {
    expect(formatNumber(Infinity)).toBe("∞");
    expect(formatNumber(-Infinity)).toBe("−∞");
  });

  it("null / NaN → 'Erreur'", () => {
    expect(formatNumber(null)).toBe("Erreur");
    expect(formatNumber(NaN)).toBe("Erreur");
  });

  it("toDisplay affiche le point décimal en virgule (FR)", () => {
    expect(toDisplay("3.5")).toBe("3,5");
    expect(toDisplay("42")).toBe("42");
  });
});

describe("Front — formatHistoryEntry (ligne d'historique)", () => {
  it("formate 'a op b = résultat' en virgule FR", () => {
    expect(formatHistoryEntry(22, "÷", "7", 22 / 7)).toBe("22 ÷ 7 = 3,14285714286");
  });

  it("gère les opérandes décimaux", () => {
    expect(formatHistoryEntry(1.5, "+", "2.5", 4)).toBe("1,5 + 2,5 = 4");
  });
});

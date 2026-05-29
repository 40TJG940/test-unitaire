const Calculator = require("../src/calculator");

describe("Calculator", () => {
  let calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe("add", () => {
    it.each`
      a       | b       | expected
      ${2}    | ${3}    | ${5}
      ${-5}   | ${-3}   | ${-8}
      ${-5}   | ${3}    | ${-2}
      ${7}    | ${0}    | ${7}
    `("devrait retourner $a + $b = $expected", ({ a, b, expected }) => {
      expect(calculator.add(a, b)).toBe(expected);
    });

    it("devrait gérer les flottants (0.1 + 0.2 ≈ 0.3)", () => {
      expect(calculator.add(0.1, 0.2)).toBeCloseTo(0.3);
    });
  });

  describe("subtract", () => {
    it.each`
      a       | b       | expected
      ${10}   | ${4}    | ${6}
      ${3}    | ${10}   | ${-7}
      ${5}    | ${0}    | ${5}
      ${-5}   | ${-3}   | ${-2}
    `("devrait retourner $a - $b = $expected", ({ a, b, expected }) => {
      expect(calculator.subtract(a, b)).toBe(expected);
    });

    it("devrait gérer les flottants (0.3 - 0.1 ≈ 0.2)", () => {
      expect(calculator.subtract(0.3, 0.1)).toBeCloseTo(0.2);
    });
  });

  describe("multiply", () => {
    it.each`
      a       | b       | expected
      ${6}    | ${7}    | ${42}
      ${0}    | ${999}  | ${0}
      ${-3}   | ${-4}   | ${12}
      ${3}    | ${-4}   | ${-12}
    `("devrait retourner $a * $b = $expected", ({ a, b, expected }) => {
      expect(calculator.multiply(a, b)).toBe(expected);
    });

    it("devrait gérer les flottants (0.1 * 0.2 ≈ 0.02)", () => {
      expect(calculator.multiply(0.1, 0.2)).toBeCloseTo(0.02);
    });
  });

  describe("divide", () => {
    it.each`
      a       | b       | expected
      ${20}   | ${5}    | ${4}
      ${0}    | ${5}    | ${0}
      ${-10}  | ${-2}   | ${5}
      ${-7}   | ${2}    | ${-3.5}
    `("devrait retourner $a / $b = $expected", ({ a, b, expected }) => {
      expect(calculator.divide(a, b)).toBe(expected);
    });

    it("devrait approcher 10 / 3 ≈ 3.333", () => {
      expect(calculator.divide(10, 3)).toBeCloseTo(3.333);
    });

    it("devrait lever une Error avec le message exact lors d'une division par zéro", () => {
      expect(() => calculator.divide(10, 0)).toThrow("Division par zéro impossible.");
    });
  });

  describe("Coercion de types JS (comportement natif documenté)", () => {
    it("add(null, 2) → 2 (null coercé en 0)", () => {
      expect(calculator.add(null, 2)).toBe(2);
    });

    it("subtract(undefined, 5) → NaN", () => {
      expect(calculator.subtract(undefined, 5)).toBeNaN();
    });

    it("multiply(\"abc\", 3) → NaN", () => {
      expect(calculator.multiply("abc", 3)).toBeNaN();
    });

    it("divide(NaN, 5) → NaN (NaN se propage)", () => {
      expect(calculator.divide(NaN, 5)).toBeNaN();
    });
  });
});

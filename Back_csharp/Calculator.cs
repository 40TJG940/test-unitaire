using System.Globalization;

namespace CalculatorBackend;

/// <summary>
/// Logique metier de la calculatrice (equivalent de ../src/calculator.js).
/// </summary>
public static class Calculator
{
    public static double Add(double a, double b) => a + b;
    public static double Subtract(double a, double b) => a - b;
    public static double Multiply(double a, double b) => a * b;

    public static double Divide(double a, double b)
    {
        if (b == 0.0)
        {
            throw new DivideByZeroException("Division par zero impossible.");
        }
        return a / b;
    }

    /// <summary>
    /// Dispatch par nom d'operation. Renvoie false si l'operation est inconnue
    /// (le serveur traduira ca en 400 "Operation inconnue").
    /// </summary>
    public static bool TryCompute(string operation, double a, double b, out double result)
    {
        result = operation switch
        {
            "add" => Add(a, b),
            "subtract" => Subtract(a, b),
            "multiply" => Multiply(a, b),
            "divide" => Divide(a, b),
            _ => double.NaN,
        };
        return operation is "add" or "subtract" or "multiply" or "divide";
    }

    /// <summary>
    /// Formatte un double facon JSON.stringify : un entier reste sans
    /// decimales, sinon plus courte representation (round-trip "R").
    /// </summary>
    public static string FormatNumber(double n)
    {
        if (double.IsFinite(n) && n == Math.Truncate(n) && Math.Abs(n) < 1e15)
        {
            return ((long)n).ToString(CultureInfo.InvariantCulture);
        }
        return n.ToString("R", CultureInfo.InvariantCulture);
    }
}

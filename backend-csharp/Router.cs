using System.Globalization;

namespace CalculatorBackend;

/// <summary>Reponse HTTP logique (avant ecriture sur le reseau).</summary>
public readonly record struct ApiResponse(int Status, string Body, bool Json, string? Allow = null);

/// <summary>
/// Routage de l'API, en fonction pure (testable sans serveur reseau).
/// Replique le contrat de ../src/server.js.
/// </summary>
public static class Router
{
    private static string JsonError(string message)
    {
        // Echappe le message pour rester du JSON valide.
        string escaped = message
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\n", "\\n")
            .Replace("\r", "\\r")
            .Replace("\t", "\\t");
        return $"{{\"error\":\"{escaped}\"}}";
    }

    /// <summary>Equivalent de Number(x) : vide ou non numerique -> echec.</summary>
    private static bool TryParseNumber(string s, out double value)
    {
        value = 0;
        string t = s.Trim();
        if (t.Length == 0) return false;
        if (!double.TryParse(t, NumberStyles.Float, CultureInfo.InvariantCulture, out value))
            return false;
        return double.IsFinite(value);
    }

    public static ApiResponse Route(string method, string target)
    {
        // Preflight CORS
        if (method == "OPTIONS")
            return new ApiResponse(204, "", true);

        // Seul GET est autorise
        if (method != "GET")
            return new ApiResponse(405, JsonError("Methode non autorisee. Utiliser GET."), true, "GET, OPTIONS");

        // Separe le chemin de la query string
        int q = target.IndexOf('?');
        string path = q >= 0 ? target[..q] : target;
        string query = q >= 0 ? target[(q + 1)..] : "";

        // Sonde de sante
        if (path == "/")
            return new ApiResponse(200, "OK", false);

        if (path != "/calculate")
            return new ApiResponse(404, JsonError("Route introuvable."), true);

        return HandleCalculate(query);
    }

    private static ApiResponse HandleCalculate(string query)
    {
        var p = ParseQuery(query);
        bool hasOp = p.TryGetValue("operation", out string? operation);
        bool hasA = p.TryGetValue("a", out string? aRaw);
        bool hasB = p.TryGetValue("b", out string? bRaw);

        if (!hasOp || !hasA || !hasB)
            return new ApiResponse(400, JsonError("Parametres attendus : operation, a, b"), true);

        if (!TryParseNumber(aRaw!, out double a) || !TryParseNumber(bRaw!, out double b))
            return new ApiResponse(400, JsonError("Les parametres a et b doivent etre des nombres."), true);

        if (operation is not ("add" or "subtract" or "multiply" or "divide"))
            return new ApiResponse(400, JsonError("Operation inconnue. Utiliser : add, subtract, multiply, divide"), true);

        try
        {
            Calculator.TryCompute(operation!, a, b, out double result);
            string body = $"{{\"operation\":\"{operation}\",\"a\":{Calculator.FormatNumber(a)}," +
                          $"\"b\":{Calculator.FormatNumber(b)},\"result\":{Calculator.FormatNumber(result)}}}";
            return new ApiResponse(200, body, true);
        }
        catch (DivideByZeroException ex)
        {
            return new ApiResponse(400, JsonError(ex.Message), true);
        }
    }

    /// <summary>Parse "a=1&b=2" en dictionnaire, valeurs URL-decodees.</summary>
    private static Dictionary<string, string> ParseQuery(string query)
    {
        var result = new Dictionary<string, string>();
        foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            int eq = pair.IndexOf('=');
            string key = eq >= 0 ? pair[..eq] : pair;
            string val = eq >= 0 ? pair[(eq + 1)..] : "";
            result[Uri.UnescapeDataString(key.Replace('+', ' '))] =
                Uri.UnescapeDataString(val.Replace('+', ' '));
        }
        return result;
    }
}

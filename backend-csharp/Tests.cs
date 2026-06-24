namespace CalculatorBackend;

/// <summary>
/// Suite de tests sans dependance : on appelle Router.Route() directement.
/// Lancee via `dotnet run -- test` (ou `dotnet test` equivalent maison).
/// </summary>
public static class Tests
{
    private static int _failures;

    private static void Check(string name, bool cond)
    {
        Console.WriteLine($"{(cond ? "[ok]  " : "[FAIL]")} {name}");
        if (!cond) _failures++;
    }

    public static int Run()
    {
        _failures = 0;

        // --- logique metier ---
        Check("add", Calculator.Add(2, 3) == 5);
        Check("subtract", Calculator.Subtract(5, 3) == 2);
        Check("multiply", Calculator.Multiply(4, 3) == 12);
        Check("divide", Calculator.Divide(10, 2) == 5);
        Check("format_integer", Calculator.FormatNumber(5) == "5");
        Check("format_decimal", Calculator.FormatNumber(2.5) == "2.5");

        bool threw = false;
        try { Calculator.Divide(1, 0); } catch (DivideByZeroException) { threw = true; }
        Check("divide_by_zero_throws", threw);

        // --- routage HTTP ---
        Check("valid_add_200", Router.Route("GET", "/calculate?operation=add&a=2&b=3").Status == 200);
        Check("valid_add_result",
            Router.Route("GET", "/calculate?operation=add&a=2&b=3").Body.Contains("\"result\":5"));
        Check("divide_decimal",
            Router.Route("GET", "/calculate?operation=divide&a=10&b=4").Body.Contains("\"result\":2.5"));
        Check("missing_param_400", Router.Route("GET", "/calculate?operation=add&a=1").Status == 400);
        Check("non_numeric_400", Router.Route("GET", "/calculate?operation=add&a=x&b=2").Status == 400);
        Check("unknown_operation_400", Router.Route("GET", "/calculate?operation=modulo&a=1&b=2").Status == 400);
        Check("divide_by_zero_400", Router.Route("GET", "/calculate?operation=divide&a=1&b=0").Status == 400);
        Check("post_405", Router.Route("POST", "/calculate").Status == 405);
        Check("options_204", Router.Route("OPTIONS", "/calculate").Status == 204);
        Check("unknown_route_404", Router.Route("GET", "/nope").Status == 404);
        Check("health_200", Router.Route("GET", "/").Status == 200);

        Console.WriteLine();
        Console.WriteLine(_failures == 0
            ? "TOUS LES TESTS PASSENT (0 echec)"
            : $"ECHECS ({_failures})");
        return _failures == 0 ? 0 : 1;
    }
}

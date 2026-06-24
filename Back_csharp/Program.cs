using System.Net;
using System.Text;
using CalculatorBackend;

// Mode test : `dotnet run -- test` execute la suite et sort. Sinon, serveur.
if (args.Length > 0 && args[0] == "test")
{
    return Tests.Run();
}

int port = 3000;
string? envPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(envPort) && int.TryParse(envPort, out int p) && p > 0)
{
    port = p;
}

string publicDir = Environment.GetEnvironmentVariable("PUBLIC_DIR") ?? "../public";

// Assets statiques servis a la racine (whitelist explicite, comme le Node).
var staticRoutes = new Dictionary<string, (string File, string Type)>
{
    ["/"] = ("index.html", "text/html; charset=utf-8"),
    ["/index.html"] = ("index.html", "text/html; charset=utf-8"),
    ["/style.css"] = ("style.css", "text/css; charset=utf-8"),
    ["/app.js"] = ("app.js", "application/javascript; charset=utf-8"),
};

var listener = new HttpListener();
// "+" (toutes interfaces) marche sous Linux/Docker ; sous Windows sans droits
// admin il echoue -> on retombe sur localhost.
try
{
    listener.Prefixes.Add($"http://+:{port}/");
    listener.Start();
}
catch (HttpListenerException)
{
    listener = new HttpListener();
    listener.Prefixes.Add($"http://localhost:{port}/");
    listener.Start();
}

Console.WriteLine($"Serveur C# demarre sur http://localhost:{port}");

while (true)
{
    HttpListenerContext ctx = listener.GetContext();
    try
    {
        HandleRequest(ctx, staticRoutes, publicDir);
    }
    catch
    {
        try { ctx.Response.Abort(); } catch { /* connexion deja fermee */ }
    }
}

static void HandleRequest(
    HttpListenerContext ctx,
    Dictionary<string, (string File, string Type)> staticRoutes,
    string publicDir)
{
    HttpListenerRequest req = ctx.Request;
    string method = req.HttpMethod;
    string target = req.RawUrl ?? "/";
    string path = target.Contains('?') ? target[..target.IndexOf('?')] : target;

    // GET sur un asset statique whiteliste -> on sert le front.
    if (method == "GET" && staticRoutes.TryGetValue(path, out var asset))
    {
        string full = Path.Combine(publicDir, asset.File);
        if (File.Exists(full))
        {
            byte[] bytes = File.ReadAllBytes(full);
            ctx.Response.StatusCode = 200;
            ctx.Response.Headers["Access-Control-Allow-Origin"] = "*";
            ctx.Response.ContentType = asset.Type;
            ctx.Response.ContentLength64 = bytes.Length;
            ctx.Response.OutputStream.Write(bytes, 0, bytes.Length);
            ctx.Response.OutputStream.Close();
            return;
        }
    }

    // Sinon : contrat API (/calculate, 404, 405, OPTIONS...).
    ApiResponse r = Router.Route(method, target);
    WriteApiResponse(ctx.Response, r);
}

static void WriteApiResponse(HttpListenerResponse res, ApiResponse r)
{
    res.StatusCode = r.Status;
    res.Headers["Access-Control-Allow-Origin"] = "*";
    res.Headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    res.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    if (r.Allow is not null)
    {
        res.Headers["Allow"] = r.Allow;
    }

    if (r.Status == 204)
    {
        res.OutputStream.Close();
        return;
    }

    byte[] body = Encoding.UTF8.GetBytes(r.Body);
    res.ContentType = r.Json ? "application/json; charset=utf-8" : "text/plain; charset=utf-8";
    res.ContentLength64 = body.Length;
    res.OutputStream.Write(body, 0, body.Length);
    res.OutputStream.Close();
}

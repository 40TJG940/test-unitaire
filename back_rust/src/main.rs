//! 3e backend de la calculatrice — serveur HTTP en Rust, std uniquement.
//!
//! Replique le contrat de `src/server.js` :
//!   GET /calculate?operation=&a=&b=  -> 200 { operation, a, b, result }
//!   OPTIONS *                        -> 204 (preflight CORS)
//!   methode != GET                   -> 405 { error } + header Allow
//!   route inconnue                   -> 404 { error }
//!   parametres manquants / invalides -> 400 { error }
//!   division par zero                -> 400 { error }
//!   GET /                            -> 200 (sonde de sante)

mod calculator;

use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;

const ALLOWED_OPERATIONS: [&str; 4] = ["add", "subtract", "multiply", "divide"];

fn main() {
    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = format!("0.0.0.0:{port}");
    let listener = TcpListener::bind(&addr).expect("impossible d'ouvrir le port");
    println!("Serveur Rust demarre sur http://localhost:{port}");

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                thread::spawn(move || handle_connection(stream));
            }
            Err(e) => eprintln!("connexion refusee : {e}"),
        }
    }
}

fn handle_connection(mut stream: TcpStream) {
    let mut reader = BufReader::new(match stream.try_clone() {
        Ok(s) => s,
        Err(_) => return,
    });

    // Ligne de requete : "GET /calculate?... HTTP/1.1"
    let mut request_line = String::new();
    if reader.read_line(&mut request_line).is_err() || request_line.is_empty() {
        return;
    }

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let target = parts.next().unwrap_or("");

    // On lit (et ignore) le reste des en-tetes jusqu'a la ligne vide, pour
    // laisser la socket dans un etat propre.
    let mut content_length = 0usize;
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).is_err() || line == "\r\n" || line.is_empty() {
            break;
        }
        if let Some(v) = line.to_ascii_lowercase().strip_prefix("content-length:") {
            content_length = v.trim().parse().unwrap_or(0);
        }
    }
    if content_length > 0 {
        let mut body = vec![0u8; content_length];
        let _ = reader.read_exact(&mut body);
    }

    let response = route(method, target);
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn route(method: &str, target: &str) -> String {
    // Preflight CORS
    if method == "OPTIONS" {
        return build_response(204, "", true, None);
    }

    // Seul GET est autorise
    if method != "GET" {
        let body = json_error("Methode non autorisee. Utiliser GET.");
        return build_response(405, &body, true, Some("GET, OPTIONS"));
    }

    let (path, query) = match target.split_once('?') {
        Some((p, q)) => (p, q),
        None => (target, ""),
    };

    // Sonde de sante (equivalent du GET / cote Node)
    if path == "/" {
        return build_response(200, "OK", false, None);
    }

    if path != "/calculate" {
        let body = json_error("Route introuvable.");
        return build_response(404, &body, true, None);
    }

    handle_calculate(query)
}

fn handle_calculate(query: &str) -> String {
    let params = parse_query(query);
    let operation = params.iter().find(|(k, _)| k == "operation").map(|(_, v)| v);
    let a = params.iter().find(|(k, _)| k == "a").map(|(_, v)| v);
    let b = params.iter().find(|(k, _)| k == "b").map(|(_, v)| v);

    // Parametres manquants
    let (operation, a, b) = match (operation, a, b) {
        (Some(op), Some(a), Some(b)) => (op, a, b),
        _ => {
            let body = json_error("Parametres attendus : operation, a, b");
            return build_response(400, &body, true, None);
        }
    };

    // a et b doivent etre des nombres
    let (num_a, num_b) = match (parse_number(a), parse_number(b)) {
        (Some(na), Some(nb)) => (na, nb),
        _ => {
            let body = json_error("Les parametres a et b doivent etre des nombres.");
            return build_response(400, &body, true, None);
        }
    };

    // Operation inconnue
    if !ALLOWED_OPERATIONS.contains(&operation.as_str()) {
        let body = json_error("Operation inconnue. Utiliser : add, subtract, multiply, divide");
        return build_response(400, &body, true, None);
    }

    match calculator::compute(operation, num_a, num_b) {
        Some(Ok(result)) => {
            let body = format!(
                "{{\"operation\":{},\"a\":{},\"b\":{},\"result\":{}}}",
                json_string(operation),
                format_number(num_a),
                format_number(num_b),
                format_number(result)
            );
            build_response(200, &body, true, None)
        }
        Some(Err(msg)) => build_response(400, &json_error(&msg), true, None),
        None => {
            let body = json_error("Operation inconnue. Utiliser : add, subtract, multiply, divide");
            build_response(400, &body, true, None)
        }
    }
}

/// Parse une query string `a=1&b=2` en paires (cle, valeur) decodees.
fn parse_query(query: &str) -> Vec<(String, String)> {
    query
        .split('&')
        .filter(|p| !p.is_empty())
        .map(|pair| match pair.split_once('=') {
            Some((k, v)) => (url_decode(k), url_decode(v)),
            None => (url_decode(pair), String::new()),
        })
        .collect()
}

/// Decodage URL minimal : `%XX` et `+` -> espace.
fn url_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'%' if i + 2 < bytes.len() => {
                let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or("");
                match u8::from_str_radix(hex, 16) {
                    Ok(byte) => {
                        out.push(byte);
                        i += 3;
                    }
                    Err(_) => {
                        out.push(b'%');
                        i += 1;
                    }
                }
            }
            b'+' => {
                out.push(b' ');
                i += 1;
            }
            byte => {
                out.push(byte);
                i += 1;
            }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Equivalent de `Number(x)` en JS pour nos besoins : une chaine vide ou non
/// numerique echoue (None). On accepte les flottants standards.
fn parse_number(s: &str) -> Option<f64> {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return None;
    }
    trimmed.parse::<f64>().ok().filter(|n| n.is_finite())
}

/// Formatte un f64 facon JSON.stringify : un entier reste sans decimales.
fn format_number(n: f64) -> String {
    if n == n.trunc() && n.is_finite() && n.abs() < 1e15 {
        format!("{}", n as i64)
    } else {
        format!("{n}")
    }
}

fn json_error(message: &str) -> String {
    format!("{{\"error\":{}}}", json_string(message))
}

/// Echappe une chaine pour l'inserer dans du JSON.
fn json_string(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

/// Construit une reponse HTTP complete avec les en-tetes CORS.
fn build_response(status: u16, body: &str, json: bool, allow: Option<&str>) -> String {
    let reason = match status {
        200 => "OK",
        204 => "No Content",
        400 => "Bad Request",
        404 => "Not Found",
        405 => "Method Not Allowed",
        _ => "OK",
    };

    let content_type = if json {
        "application/json; charset=utf-8"
    } else {
        "text/plain; charset=utf-8"
    };

    let mut headers = String::new();
    headers.push_str(&format!("HTTP/1.1 {status} {reason}\r\n"));
    headers.push_str("Access-Control-Allow-Origin: *\r\n");
    headers.push_str("Access-Control-Allow-Methods: GET, OPTIONS\r\n");
    headers.push_str("Access-Control-Allow-Headers: Content-Type, Authorization\r\n");
    if let Some(allow) = allow {
        headers.push_str(&format!("Allow: {allow}\r\n"));
    }

    if status == 204 {
        // Pas de corps pour un 204.
        headers.push_str("\r\n");
        return headers;
    }

    headers.push_str(&format!("Content-Type: {content_type}\r\n"));
    headers.push_str(&format!("Content-Length: {}\r\n", body.len()));
    headers.push_str("\r\n");
    headers.push_str(body);
    headers
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_params_is_400() {
        assert!(route("GET", "/calculate?operation=add&a=1").starts_with("HTTP/1.1 400"));
    }

    #[test]
    fn non_numeric_is_400() {
        assert!(route("GET", "/calculate?operation=add&a=x&b=2").starts_with("HTTP/1.1 400"));
    }

    #[test]
    fn unknown_operation_is_400() {
        let r = route("GET", "/calculate?operation=modulo&a=1&b=2");
        assert!(r.starts_with("HTTP/1.1 400"));
    }

    #[test]
    fn valid_add_is_200_with_result() {
        let r = route("GET", "/calculate?operation=add&a=2&b=3");
        assert!(r.starts_with("HTTP/1.1 200"));
        assert!(r.contains("\"result\":5"));
    }

    #[test]
    fn divide_by_zero_is_400() {
        let r = route("GET", "/calculate?operation=divide&a=1&b=0");
        assert!(r.starts_with("HTTP/1.1 400"));
    }

    #[test]
    fn post_is_405() {
        assert!(route("POST", "/calculate").starts_with("HTTP/1.1 405"));
    }

    #[test]
    fn options_is_204() {
        assert!(route("OPTIONS", "/calculate").starts_with("HTTP/1.1 204"));
    }

    #[test]
    fn unknown_route_is_404() {
        assert!(route("GET", "/nope").starts_with("HTTP/1.1 404"));
    }
}

/*
 * 4e backend de la calculatrice — serveur HTTP en C (portable Windows/POSIX).
 *
 * Replique le contrat de ../src/server.js :
 *   GET /calculate?operation=&a=&b=  -> 200 { operation, a, b, result }
 *   OPTIONS *                        -> 204 (preflight CORS)
 *   methode != GET                   -> 405 { error } + header Allow
 *   route inconnue                   -> 404 { error }
 *   parametres manquants / invalides -> 400 { error }
 *   division par zero                -> 400 { error }
 *   GET /                            -> 200 (sonde de sante)
 *
 * Aucune dependance externe : sockets bruts + bibliotheque standard C.
 */

#include "calculator.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#ifdef _MSC_VER
#pragma comment(lib, "ws2_32.lib")
#endif
typedef int socklen_t;
#define CLOSESOCK closesocket
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
typedef int SOCKET;
#define INVALID_SOCKET (-1)
#define CLOSESOCK close
#endif

#define DEFAULT_PORT 3000
#define BUF_SIZE 8192

/* ---- Helpers de formatage ---------------------------------------------- */

/* Echappe une chaine pour l'inserer dans du JSON. */
static void json_escape(const char *src, char *dst, size_t cap) {
    size_t j = 0;
    for (size_t i = 0; src[i] != '\0' && j + 2 < cap; i++) {
        char c = src[i];
        switch (c) {
            case '"':  if (j + 2 < cap) { dst[j++] = '\\'; dst[j++] = '"'; } break;
            case '\\': if (j + 2 < cap) { dst[j++] = '\\'; dst[j++] = '\\'; } break;
            case '\n': if (j + 2 < cap) { dst[j++] = '\\'; dst[j++] = 'n'; } break;
            case '\r': if (j + 2 < cap) { dst[j++] = '\\'; dst[j++] = 'r'; } break;
            case '\t': if (j + 2 < cap) { dst[j++] = '\\'; dst[j++] = 't'; } break;
            default:   dst[j++] = c; break;
        }
    }
    dst[j] = '\0';
}

/* Formatte un double facon JSON.stringify : un entier reste sans decimales,
 * sinon on cherche la plus courte representation qui re-parse a l'identique
 * (comportement "shortest round-trip" comme JS/Rust). */
static void format_number(double n, char *buf, size_t cap) {
    if (isfinite(n) && n == (double)(long long)n && fabs(n) < 1e15) {
        snprintf(buf, cap, "%lld", (long long)n);
        return;
    }
    for (int prec = 1; prec <= 17; prec++) {
        snprintf(buf, cap, "%.*g", prec, n);
        if (strtod(buf, NULL) == n) {
            return;
        }
    }
    snprintf(buf, cap, "%.17g", n);
}

/* ---- Parsing ------------------------------------------------------------ */

/* Decodage URL en place : %XX et '+' -> espace. */
static void url_decode(char *s) {
    char *r = s, *w = s;
    while (*r) {
        if (*r == '%' && isxdigit((unsigned char)r[1]) && isxdigit((unsigned char)r[2])) {
            char hex[3] = { r[1], r[2], '\0' };
            *w++ = (char)strtol(hex, NULL, 16);
            r += 3;
        } else if (*r == '+') {
            *w++ = ' ';
            r++;
        } else {
            *w++ = *r++;
        }
    }
    *w = '\0';
}

/* Recupere la valeur d'un parametre de la query. Renvoie 1 si trouve. */
static int query_get(const char *query, const char *key, char *out, size_t cap) {
    size_t klen = strlen(key);
    const char *p = query;
    while (p && *p) {
        const char *eq = strchr(p, '=');
        const char *amp = strchr(p, '&');
        size_t name_len = eq ? (size_t)(eq - p) : strlen(p);
        if (eq && name_len == klen && strncmp(p, key, klen) == 0) {
            const char *vstart = eq + 1;
            size_t vlen = amp ? (size_t)(amp - vstart) : strlen(vstart);
            if (vlen >= cap) vlen = cap - 1;
            memcpy(out, vstart, vlen);
            out[vlen] = '\0';
            url_decode(out);
            return 1;
        }
        if (!amp) break;
        p = amp + 1;
    }
    return 0;
}

/* Equivalent de Number(x) pour nos besoins : chaine vide ou non numerique
 * -> echec (renvoie 0). Ecrit le double dans *out si succes. */
static int parse_number(const char *s, double *out) {
    while (isspace((unsigned char)*s)) s++;
    if (*s == '\0') return 0;
    char *end;
    double v = strtod(s, &end);
    while (isspace((unsigned char)*end)) end++;
    if (*end != '\0') return 0;
    if (!isfinite(v)) return 0;
    *out = v;
    return 1;
}

/* ---- Construction de la reponse ---------------------------------------- */

static const char *reason_phrase(int status) {
    switch (status) {
        case 200: return "OK";
        case 204: return "No Content";
        case 400: return "Bad Request";
        case 404: return "Not Found";
        case 405: return "Method Not Allowed";
        default:  return "OK";
    }
}

/* Ecrit une reponse HTTP complete dans out. json=1 -> Content-Type JSON. */
static void build_response(char *out, size_t cap, int status, const char *body,
                           int json, const char *allow) {
    const char *ctype = json ? "application/json; charset=utf-8"
                             : "text/plain; charset=utf-8";
    int n = snprintf(out, cap,
        "HTTP/1.1 %d %s\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type, Authorization\r\n",
        status, reason_phrase(status));

    if (allow) {
        n += snprintf(out + n, cap - n, "Allow: %s\r\n", allow);
    }

    if (status == 204) {
        snprintf(out + n, cap - n, "\r\n");
        return;
    }

    snprintf(out + n, cap - n,
        "Content-Type: %s\r\n"
        "Content-Length: %zu\r\n"
        "\r\n"
        "%s",
        ctype, strlen(body), body);
}

static void json_error(char *out, size_t cap, const char *message) {
    char esc[512];
    json_escape(message, esc, sizeof(esc));
    snprintf(out, cap, "{\"error\":\"%s\"}", esc);
}

/* ---- Routage ------------------------------------------------------------ */

static void handle_calculate(const char *query, char *resp, size_t cap) {
    char body[1024];
    char op[64], a_raw[128], b_raw[128];

    int has_op = query_get(query, "operation", op, sizeof(op));
    int has_a = query_get(query, "a", a_raw, sizeof(a_raw));
    int has_b = query_get(query, "b", b_raw, sizeof(b_raw));

    if (!has_op || !has_a || !has_b) {
        json_error(body, sizeof(body), "Parametres attendus : operation, a, b");
        build_response(resp, cap, 400, body, 1, NULL);
        return;
    }

    double na, nb;
    if (!parse_number(a_raw, &na) || !parse_number(b_raw, &nb)) {
        json_error(body, sizeof(body), "Les parametres a et b doivent etre des nombres.");
        build_response(resp, cap, 400, body, 1, NULL);
        return;
    }

    CalcResult res = calc_compute(op, na, nb);

    if (res.unknown) {
        json_error(body, sizeof(body),
                   "Operation inconnue. Utiliser : add, subtract, multiply, divide");
        build_response(resp, cap, 400, body, 1, NULL);
        return;
    }
    if (!res.ok) {
        json_error(body, sizeof(body), res.error);
        build_response(resp, cap, 400, body, 1, NULL);
        return;
    }

    char op_esc[128], sa[64], sb[64], sr[64];
    json_escape(op, op_esc, sizeof(op_esc));
    format_number(na, sa, sizeof(sa));
    format_number(nb, sb, sizeof(sb));
    format_number(res.value, sr, sizeof(sr));
    snprintf(body, sizeof(body),
             "{\"operation\":\"%s\",\"a\":%s,\"b\":%s,\"result\":%s}",
             op_esc, sa, sb, sr);
    build_response(resp, cap, 200, body, 1, NULL);
}

/* Construit la reponse complete a partir de la methode et de la cible. */
void route(const char *method, const char *target, char *resp, size_t cap) {
    char body[1024];

    if (strcmp(method, "OPTIONS") == 0) {
        build_response(resp, cap, 204, "", 1, NULL);
        return;
    }

    if (strcmp(method, "GET") != 0) {
        json_error(body, sizeof(body), "Methode non autorisee. Utiliser GET.");
        build_response(resp, cap, 405, body, 1, "GET, OPTIONS");
        return;
    }

    /* Separe le chemin de la query string. */
    char path[1024];
    const char *q = strchr(target, '?');
    const char *query = "";
    if (q) {
        size_t plen = (size_t)(q - target);
        if (plen >= sizeof(path)) plen = sizeof(path) - 1;
        memcpy(path, target, plen);
        path[plen] = '\0';
        query = q + 1;
    } else {
        strncpy(path, target, sizeof(path) - 1);
        path[sizeof(path) - 1] = '\0';
    }

    if (strcmp(path, "/") == 0) {
        build_response(resp, cap, 200, "OK", 0, NULL);
        return;
    }

    if (strcmp(path, "/calculate") != 0) {
        json_error(body, sizeof(body), "Route introuvable.");
        build_response(resp, cap, 404, body, 1, NULL);
        return;
    }

    handle_calculate(query, resp, cap);
}

/* ---- Fichiers statiques (front-end) ------------------------------------- */

#ifndef CALC_NO_MAIN

/* Associe un chemin a un fichier du dossier public + son Content-Type.
 * Whitelist explicite, comme STATIC_ROUTES cote Node. Renvoie 1 si match. */
static int static_file_for(const char *path, const char **file, const char **type) {
    if (strcmp(path, "/") == 0 || strcmp(path, "/index.html") == 0) {
        *file = "index.html"; *type = "text/html; charset=utf-8"; return 1;
    }
    if (strcmp(path, "/style.css") == 0) {
        *file = "style.css"; *type = "text/css; charset=utf-8"; return 1;
    }
    if (strcmp(path, "/app.js") == 0) {
        *file = "app.js"; *type = "application/javascript; charset=utf-8"; return 1;
    }
    return 0;
}

/* Lit le fichier depuis PUBLIC_DIR (defaut ../public) et l'envoie. Renvoie 1
 * en cas de succes, 0 si le fichier est introuvable (le serveur basculera
 * alors sur la logique API/404). */
static int serve_static(SOCKET client, const char *file, const char *type) {
    const char *dir = getenv("PUBLIC_DIR");
    if (!dir || !*dir) dir = "../public";

    char fullpath[1024];
    snprintf(fullpath, sizeof(fullpath), "%s/%s", dir, file);

    FILE *f = fopen(fullpath, "rb");
    if (!f) return 0;

    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (size < 0) { fclose(f); return 0; }

    char *body = malloc((size_t)size);
    if (!body) { fclose(f); return 0; }
    size_t read_n = fread(body, 1, (size_t)size, f);
    fclose(f);

    char header[512];
    int hlen = snprintf(header, sizeof(header),
        "HTTP/1.1 200 OK\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %zu\r\n"
        "\r\n",
        type, read_n);

    send(client, header, hlen, 0);
    send(client, body, (int)read_n, 0);
    free(body);
    return 1;
}

/* ---- Boucle serveur ----------------------------------------------------- */

static void handle_client(SOCKET client) {
    char buf[BUF_SIZE];
    int received = recv(client, buf, sizeof(buf) - 1, 0);
    if (received <= 0) {
        CLOSESOCK(client);
        return;
    }
    buf[received] = '\0';

    /* Premiere ligne : "GET /calculate?... HTTP/1.1" */
    char method[16] = "", target[2048] = "";
    sscanf(buf, "%15s %2047s", method, target);

    /* Chemin sans la query string. */
    char path[1024];
    const char *q = strchr(target, '?');
    size_t plen = q ? (size_t)(q - target) : strlen(target);
    if (plen >= sizeof(path)) plen = sizeof(path) - 1;
    memcpy(path, target, plen);
    path[plen] = '\0';

    /* GET sur un asset statique whiteliste -> on sert le front. */
    const char *file, *type;
    if (strcmp(method, "GET") == 0 && static_file_for(path, &file, &type)) {
        if (serve_static(client, file, type)) {
            CLOSESOCK(client);
            return;
        }
    }

    /* Sinon : contrat API (/calculate, 404, 405, OPTIONS...). */
    char resp[BUF_SIZE];
    route(method, target, resp, sizeof(resp));

    send(client, resp, (int)strlen(resp), 0);
    CLOSESOCK(client);
}

int main(void) {
    int port = DEFAULT_PORT;
    const char *env_port = getenv("PORT");
    if (env_port && *env_port) {
        int p = atoi(env_port);
        if (p > 0) port = p;
    }

#ifdef _WIN32
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        fprintf(stderr, "WSAStartup a echoue\n");
        return 1;
    }
#endif

    SOCKET srv = socket(AF_INET, SOCK_STREAM, 0);
    if (srv == INVALID_SOCKET) {
        fprintf(stderr, "creation socket impossible\n");
        return 1;
    }

    int opt = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, (const char *)&opt, sizeof(opt));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons((unsigned short)port);

    if (bind(srv, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        fprintf(stderr, "bind sur le port %d impossible\n", port);
        return 1;
    }
    if (listen(srv, 16) < 0) {
        fprintf(stderr, "listen impossible\n");
        return 1;
    }

    printf("Serveur C demarre sur http://localhost:%d\n", port);
    fflush(stdout);

    for (;;) {
        SOCKET client = accept(srv, NULL, NULL);
        if (client == INVALID_SOCKET) continue;
        handle_client(client);
    }

    /* jamais atteint */
#ifdef _WIN32
    WSACleanup();
#endif
    CLOSESOCK(srv);
    return 0;
}
#endif /* CALC_NO_MAIN */

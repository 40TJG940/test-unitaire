/* Tests unitaires : logique metier + routage HTTP.
 * On compile server.c avec CALC_NO_MAIN pour reutiliser route()/calc_compute()
 * sans le main(). Lancer avec `make test`. */

#include "calculator.h"
#include <stdio.h>
#include <string.h>

/* expose par server.c (compile sans main grace a CALC_NO_MAIN) */
void route(const char *method, const char *target, char *resp, size_t cap);

static int failures = 0;

static void check(const char *name, int cond) {
    printf("%s %s\n", cond ? "[ok]  " : "[FAIL]", name);
    if (!cond) failures++;
}

static int status_is(const char *resp, const char *code) {
    return strncmp(resp, "HTTP/1.1 ", 9) == 0 &&
           strncmp(resp + 9, code, strlen(code)) == 0;
}

int main(void) {
    char r[8192];

    /* --- logique metier --- */
    check("add", calc_compute("add", 2, 3).value == 5.0);
    check("subtract", calc_compute("subtract", 5, 3).value == 2.0);
    check("multiply", calc_compute("multiply", 4, 3).value == 12.0);
    check("divide", calc_compute("divide", 10, 2).value == 5.0);
    check("divide_by_zero_errors", calc_compute("divide", 1, 0).ok == 0);
    check("unknown_op", calc_compute("modulo", 1, 2).unknown == 1);

    /* --- routage HTTP --- */
    route("GET", "/calculate?operation=add&a=2&b=3", r, sizeof(r));
    check("valid_add_200", status_is(r, "200"));
    check("valid_add_result", strstr(r, "\"result\":5") != NULL);

    route("GET", "/calculate?operation=divide&a=10&b=4", r, sizeof(r));
    check("divide_decimal", strstr(r, "\"result\":2.5") != NULL);

    route("GET", "/calculate?operation=add&a=1", r, sizeof(r));
    check("missing_param_400", status_is(r, "400"));

    route("GET", "/calculate?operation=add&a=x&b=2", r, sizeof(r));
    check("non_numeric_400", status_is(r, "400"));

    route("GET", "/calculate?operation=modulo&a=1&b=2", r, sizeof(r));
    check("unknown_operation_400", status_is(r, "400"));

    route("GET", "/calculate?operation=divide&a=1&b=0", r, sizeof(r));
    check("divide_by_zero_400", status_is(r, "400"));

    route("POST", "/calculate", r, sizeof(r));
    check("post_405", status_is(r, "405"));

    route("OPTIONS", "/calculate", r, sizeof(r));
    check("options_204", status_is(r, "204"));

    route("GET", "/nope", r, sizeof(r));
    check("unknown_route_404", status_is(r, "404"));

    route("GET", "/", r, sizeof(r));
    check("health_200", status_is(r, "200"));

    printf("\n%s (%d echec(s))\n", failures == 0 ? "TOUS LES TESTS PASSENT" : "ECHECS", failures);
    return failures == 0 ? 0 : 1;
}

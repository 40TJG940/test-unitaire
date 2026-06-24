#include "calculator.h"
#include <string.h>

CalcResult calc_compute(const char *operation, double a, double b) {
    CalcResult r = {0, 0, 0.0, NULL};

    if (strcmp(operation, "add") == 0) {
        r.ok = 1;
        r.value = a + b;
    } else if (strcmp(operation, "subtract") == 0) {
        r.ok = 1;
        r.value = a - b;
    } else if (strcmp(operation, "multiply") == 0) {
        r.ok = 1;
        r.value = a * b;
    } else if (strcmp(operation, "divide") == 0) {
        if (b == 0.0) {
            r.ok = 0;
            r.error = "Division par zero impossible.";
        } else {
            r.ok = 1;
            r.value = a / b;
        }
    } else {
        r.unknown = 1;
    }

    return r;
}

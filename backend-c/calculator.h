/* Logique metier de la calculatrice (equivalent de ../src/calculator.js). */
#ifndef CALCULATOR_H
#define CALCULATOR_H

/* Resultat d'une operation.
 * ok = 1  -> value contient le resultat
 * ok = 0  -> error contient le message (ex. division par zero)
 * unknown = 1 -> operation inconnue (le serveur renvoie 400). */
typedef struct {
    int ok;
    int unknown;
    double value;
    const char *error;
} CalcResult;

CalcResult calc_compute(const char *operation, double a, double b);

#endif /* CALCULATOR_H */

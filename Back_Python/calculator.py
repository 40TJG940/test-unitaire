"""Logique métier de la calculatrice.

Portage Python de `Back_js/calculator.js` : mêmes opérations et même contrat
d'erreur (la division par zéro lève une exception au message identique).
"""


class Calculator:
    def add(self, a, b):
        return a + b

    def subtract(self, a, b):
        return a - b

    def multiply(self, a, b):
        return a * b

    def divide(self, a, b):
        if b == 0:
            raise ValueError("Division par zéro impossible.")
        return a / b

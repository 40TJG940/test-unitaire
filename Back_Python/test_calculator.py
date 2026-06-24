"""Tests unitaires (Calculator) et intégration (API) pour le backend Python."""

import math
import pytest
from fastapi.testclient import TestClient

from calculator import Calculator
from server import app

client = TestClient(app)

# ── Calculator — tests unitaires ───────────────────────────────────────────

class TestAdd:
    def test_positive_integers(self):
        assert Calculator().add(5, 3) == 8

    def test_negative_integers(self):
        assert Calculator().add(-5, -3) == -8

    def test_mixed_sign(self):
        assert Calculator().add(-5, 3) == -2

    def test_with_zero(self):
        assert Calculator().add(5, 0) == 5

    def test_floats(self):
        assert abs(Calculator().add(0.1, 0.2) - 0.3) < 1e-9


class TestSubtract:
    def test_positive_result(self):
        assert Calculator().subtract(5, 3) == 2

    def test_negative_result(self):
        assert Calculator().subtract(3, 5) == -2

    def test_two_negatives(self):
        assert Calculator().subtract(-5, -3) == -2

    def test_with_zero(self):
        assert Calculator().subtract(5, 0) == 5

    def test_floats(self):
        assert abs(Calculator().subtract(0.3, 0.1) - 0.2) < 1e-9


class TestMultiply:
    def test_two_positives(self):
        assert Calculator().multiply(5, 3) == 15

    def test_with_zero(self):
        assert Calculator().multiply(5, 0) == 0

    def test_two_negatives(self):
        assert Calculator().multiply(-5, -3) == 15

    def test_mixed_sign(self):
        assert Calculator().multiply(5, -3) == -15

    def test_floats(self):
        assert abs(Calculator().multiply(0.1, 3) - 0.3) < 1e-9


class TestDivide:
    def test_integer_result(self):
        assert Calculator().divide(10, 2) == 5

    def test_negative_result(self):
        assert Calculator().divide(-10, 2) == -5

    def test_decimal_result(self):
        assert abs(Calculator().divide(10, 3) - 10 / 3) < 1e-10

    def test_by_negative(self):
        assert Calculator().divide(10, -2) == -5

    def test_by_zero_raises(self):
        with pytest.raises(ValueError, match="Division par zéro impossible."):
            Calculator().divide(10, 0)

    def test_zero_by_zero_raises(self):
        with pytest.raises(ValueError):
            Calculator().divide(0, 0)


# ── API — tests d'intégration ─────────────────────────────────────────────

class TestOptions:
    def test_preflight_returns_204(self):
        r = client.options("/calculate")
        assert r.status_code == 204

    def test_preflight_has_cors_header(self):
        r = client.options("/calculate")
        assert r.headers.get("access-control-allow-origin") == "*"


class TestMethodNotAllowed:
    @pytest.mark.parametrize("method", ["POST", "PUT", "DELETE", "PATCH"])
    def test_non_get_returns_405(self, method):
        r = client.request(method, "/calculate")
        assert r.status_code == 405

    def test_405_has_allow_header(self):
        r = client.request("POST", "/calculate")
        assert "GET" in r.headers.get("allow", "")


class TestUnknownRoute:
    def test_unknown_path_returns_404(self):
        r = client.get("/unknown")
        assert r.status_code == 404

    def test_404_body_has_error_key(self):
        r = client.get("/unknown")
        assert "error" in r.json()


class TestMissingParams:
    def test_no_params_returns_400(self):
        r = client.get("/calculate")
        assert r.status_code == 400

    def test_missing_b_returns_400(self):
        r = client.get("/calculate?operation=add&a=5")
        assert r.status_code == 400

    def test_missing_a_returns_400(self):
        r = client.get("/calculate?operation=add&b=3")
        assert r.status_code == 400

    def test_missing_operation_returns_400(self):
        r = client.get("/calculate?a=5&b=3")
        assert r.status_code == 400

    def test_error_message(self):
        r = client.get("/calculate")
        assert r.json()["error"] == "Paramètres attendus : operation, a, b"


class TestNonNumericParams:
    def test_non_numeric_a_returns_400(self):
        r = client.get("/calculate?operation=add&a=abc&b=3")
        assert r.status_code == 400

    def test_non_numeric_b_returns_400(self):
        r = client.get("/calculate?operation=add&a=5&b=xyz")
        assert r.status_code == 400

    def test_error_message(self):
        r = client.get("/calculate?operation=add&a=abc&b=3")
        assert r.json()["error"] == "Les paramètres a et b doivent être des nombres."


class TestUnknownOperation:
    @pytest.mark.parametrize("op", ["modulo", "power", "sqrt", "ADD"])
    def test_unknown_op_returns_400(self, op):
        r = client.get(f"/calculate?operation={op}&a=5&b=3")
        assert r.status_code == 400

    def test_error_message(self):
        r = client.get("/calculate?operation=modulo&a=5&b=3")
        assert r.json()["error"] == "Opération inconnue. Utiliser : add, subtract, multiply, divide"


class TestDivisionByZero:
    def test_returns_400(self):
        r = client.get("/calculate?operation=divide&a=5&b=0")
        assert r.status_code == 400

    def test_error_message(self):
        r = client.get("/calculate?operation=divide&a=5&b=0")
        assert r.json()["error"] == "Division par zéro impossible."


class TestNominalOperations:
    def test_add(self):
        r = client.get("/calculate?operation=add&a=5&b=3")
        assert r.status_code == 200
        body = r.json()
        assert body["operation"] == "add"
        assert body["a"] == 5
        assert body["b"] == 3
        assert body["result"] == 8

    def test_subtract(self):
        r = client.get("/calculate?operation=subtract&a=10&b=4")
        assert r.status_code == 200
        assert r.json()["result"] == 6

    def test_multiply(self):
        r = client.get("/calculate?operation=multiply&a=4&b=3")
        assert r.status_code == 200
        assert r.json()["result"] == 12

    def test_divide(self):
        r = client.get("/calculate?operation=divide&a=10&b=2")
        assert r.status_code == 200
        assert r.json()["result"] == 5

    def test_negative_operands(self):
        r = client.get("/calculate?operation=add&a=-5&b=-3")
        assert r.status_code == 200
        assert r.json()["result"] == -8

    def test_float_operands(self):
        r = client.get("/calculate?operation=add&a=1.5&b=2.5")
        assert r.status_code == 200
        assert r.json()["result"] == 4

    def test_response_echoes_operands(self):
        r = client.get("/calculate?operation=multiply&a=7&b=6")
        body = r.json()
        assert body["a"] == 7
        assert body["b"] == 6


class TestCORSHeaders:
    def test_cors_on_success(self):
        r = client.get("/calculate?operation=add&a=1&b=2")
        assert r.headers.get("access-control-allow-origin") == "*"

    def test_cors_on_error(self):
        r = client.get("/calculate?operation=add&a=bad&b=2")
        assert r.headers.get("access-control-allow-origin") == "*"

    def test_content_type_is_json(self):
        r = client.get("/calculate?operation=add&a=1&b=2")
        assert "application/json" in r.headers.get("content-type", "")

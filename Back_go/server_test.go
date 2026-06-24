package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// testHandler creates a handler with no public dir so static-file logic is skipped.
func testHandler() http.Handler {
	return NewHandler("")
}

// helpers -------------------------------------------------------------------

func doRequest(t *testing.T, h http.Handler, method, url string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, url, nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	return w
}

func decodeError(t *testing.T, w *httptest.ResponseRecorder) string {
	t.Helper()
	var body errorResponse
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	return body.Error
}

func decodeCalc(t *testing.T, w *httptest.ResponseRecorder) calcResponse {
	t.Helper()
	var body calcResponse
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode calc response: %v", err)
	}
	return body
}

// OPTIONS -------------------------------------------------------------------

func TestOptionsReturns204(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodOptions, "/calculate")
	if w.Code != http.StatusNoContent {
		t.Errorf("OPTIONS /calculate: got %d, want 204", w.Code)
	}
	if body := w.Body.String(); body != "" {
		t.Errorf("OPTIONS body should be empty, got %q", body)
	}
}

func TestOptionsSetsCORSHeaders(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodOptions, "/calculate")
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("Access-Control-Allow-Origin = %q, want *", got)
	}
	if got := w.Header().Get("Access-Control-Allow-Methods"); got != "GET, OPTIONS" {
		t.Errorf("Access-Control-Allow-Methods = %q, want 'GET, OPTIONS'", got)
	}
}

// Method not allowed --------------------------------------------------------

func TestNonGetMethodsReturn405(t *testing.T) {
	h := testHandler()
	for _, method := range []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch} {
		t.Run(method, func(t *testing.T) {
			w := doRequest(t, h, method, "/calculate")
			if w.Code != http.StatusMethodNotAllowed {
				t.Errorf("%s: got %d, want 405", method, w.Code)
			}
			if allow := w.Header().Get("Allow"); allow != "GET, OPTIONS" {
				t.Errorf("%s Allow header = %q, want 'GET, OPTIONS'", method, allow)
			}
			if msg := decodeError(t, w); msg != errMethodNotAllowed {
				t.Errorf("%s error = %q, want %q", method, msg, errMethodNotAllowed)
			}
		})
	}
}

// Unknown route -------------------------------------------------------------

func TestUnknownRouteReturns404(t *testing.T) {
	h := testHandler()
	routes := []string{"/unknown", "/foo/bar", "/api"}
	for _, route := range routes {
		t.Run(route, func(t *testing.T) {
			w := doRequest(t, h, http.MethodGet, route)
			if w.Code != http.StatusNotFound {
				t.Errorf("GET %s: got %d, want 404", route, w.Code)
			}
			if msg := decodeError(t, w); msg != errRouteNotFound {
				t.Errorf("GET %s error = %q, want %q", route, msg, errRouteNotFound)
			}
		})
	}
}

// Missing parameters --------------------------------------------------------

func TestMissingAllParamsReturns400(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate")
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", w.Code)
	}
	if msg := decodeError(t, w); msg != errMissingParams {
		t.Errorf("error = %q, want %q", msg, errMissingParams)
	}
}

func TestMissingBParamReturns400(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=add&a=5")
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", w.Code)
	}
	if msg := decodeError(t, w); msg != errMissingParams {
		t.Errorf("error = %q, want %q", msg, errMissingParams)
	}
}

func TestMissingAParamReturns400(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=add&b=3")
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", w.Code)
	}
	if msg := decodeError(t, w); msg != errMissingParams {
		t.Errorf("error = %q, want %q", msg, errMissingParams)
	}
}

func TestMissingOperationParamReturns400(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?a=5&b=3")
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", w.Code)
	}
	if msg := decodeError(t, w); msg != errMissingParams {
		t.Errorf("error = %q, want %q", msg, errMissingParams)
	}
}

// Non-numeric parameters ----------------------------------------------------

func TestNonNumericAReturns400(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=add&a=abc&b=3")
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", w.Code)
	}
	if msg := decodeError(t, w); msg != errNotANumber {
		t.Errorf("error = %q, want %q", msg, errNotANumber)
	}
}

func TestNonNumericBReturns400(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=add&a=5&b=xyz")
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", w.Code)
	}
	if msg := decodeError(t, w); msg != errNotANumber {
		t.Errorf("error = %q, want %q", msg, errNotANumber)
	}
}

func TestNaNStringReturns400(t *testing.T) {
	h := testHandler()
	// "NaN" parses without error in Go's strconv but should be rejected like JS Number.isNaN
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=add&a=NaN&b=3")
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", w.Code)
	}
	if msg := decodeError(t, w); msg != errNotANumber {
		t.Errorf("error = %q, want %q", msg, errNotANumber)
	}
}

// Unknown operation ---------------------------------------------------------

func TestUnknownOperationReturns400(t *testing.T) {
	h := testHandler()
	for _, op := range []string{"modulo", "power", "sqrt", "ADD"} {
		t.Run(op, func(t *testing.T) {
			w := doRequest(t, h, http.MethodGet, "/calculate?operation="+op+"&a=5&b=3")
			if w.Code != http.StatusBadRequest {
				t.Errorf("operation=%s: got %d, want 400", op, w.Code)
			}
			if msg := decodeError(t, w); msg != errUnknownOp {
				t.Errorf("operation=%s error = %q, want %q", op, msg, errUnknownOp)
			}
		})
	}
}

// Division by zero ----------------------------------------------------------

func TestDivisionByZeroReturns400(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=divide&a=5&b=0")
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", w.Code)
	}
	want := "Division par zéro impossible."
	if msg := decodeError(t, w); msg != want {
		t.Errorf("error = %q, want %q", msg, want)
	}
}

// Nominal operations --------------------------------------------------------

func TestAddReturns200WithResult(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=add&a=5&b=3")
	if w.Code != http.StatusOK {
		t.Fatalf("got %d, want 200", w.Code)
	}
	body := decodeCalc(t, w)
	if body.Operation != "add" || body.A != 5 || body.B != 3 || body.Result != 8 {
		t.Errorf("unexpected response: %+v", body)
	}
}

func TestSubtractReturns200WithResult(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=subtract&a=10&b=4")
	if w.Code != http.StatusOK {
		t.Fatalf("got %d, want 200", w.Code)
	}
	body := decodeCalc(t, w)
	if body.Operation != "subtract" || body.Result != 6 {
		t.Errorf("unexpected response: %+v", body)
	}
}

func TestMultiplyReturns200WithResult(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=multiply&a=4&b=3")
	if w.Code != http.StatusOK {
		t.Fatalf("got %d, want 200", w.Code)
	}
	body := decodeCalc(t, w)
	if body.Operation != "multiply" || body.Result != 12 {
		t.Errorf("unexpected response: %+v", body)
	}
}

func TestDivideReturns200WithResult(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=divide&a=10&b=2")
	if w.Code != http.StatusOK {
		t.Fatalf("got %d, want 200", w.Code)
	}
	body := decodeCalc(t, w)
	if body.Operation != "divide" || body.Result != 5 {
		t.Errorf("unexpected response: %+v", body)
	}
}

func TestNegativeOperands(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=add&a=-5&b=-3")
	if w.Code != http.StatusOK {
		t.Fatalf("got %d, want 200", w.Code)
	}
	body := decodeCalc(t, w)
	if body.Result != -8 {
		t.Errorf("Add(-5,-3) result = %v, want -8", body.Result)
	}
}

func TestFloatOperands(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=add&a=1.5&b=2.5")
	if w.Code != http.StatusOK {
		t.Fatalf("got %d, want 200", w.Code)
	}
	body := decodeCalc(t, w)
	if body.Result != 4 {
		t.Errorf("Add(1.5, 2.5) result = %v, want 4", body.Result)
	}
}

func TestResponseIncludesOperandsEchoedBack(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=multiply&a=7&b=6")
	body := decodeCalc(t, w)
	if body.A != 7 || body.B != 6 {
		t.Errorf("response should echo a=7 b=6, got a=%v b=%v", body.A, body.B)
	}
}

// CORS headers --------------------------------------------------------------

func TestCORSHeaderOnSuccessResponse(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=add&a=1&b=2")
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("Access-Control-Allow-Origin = %q, want *", got)
	}
}

func TestCORSHeaderOnErrorResponse(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=add&a=bad&b=2")
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("Access-Control-Allow-Origin = %q, want *", got)
	}
}

func TestContentTypeIsJSON(t *testing.T) {
	h := testHandler()
	w := doRequest(t, h, http.MethodGet, "/calculate?operation=add&a=1&b=2")
	want := "application/json; charset=utf-8"
	if got := w.Header().Get("Content-Type"); got != want {
		t.Errorf("Content-Type = %q, want %q", got, want)
	}
}

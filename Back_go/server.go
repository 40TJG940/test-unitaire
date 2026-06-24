package main

import (
	"encoding/json"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
)

// Error messages — exact strings match the JS implementation.
const (
	errMissingParams    = "Paramètres attendus : operation, a, b"
	errNotANumber       = "Les paramètres a et b doivent être des nombres."
	errUnknownOp        = "Opération inconnue. Utiliser : add, subtract, multiply, divide"
	errRouteNotFound    = "Route introuvable."
	errMethodNotAllowed = "Méthode non autorisée. Utiliser GET."
)

type calcResponse struct {
	Operation string  `json:"operation"`
	A         float64 `json:"a"`
	B         float64 `json:"b"`
	Result    float64 `json:"result"`
}

type errorResponse struct {
	Error string `json:"error"`
}

// staticAssets maps URL paths to their filename and MIME type, mirroring the JS whitelist.
var staticAssets = map[string]struct{ file, ct string }{
	"/":           {"index.html", "text/html; charset=utf-8"},
	"/index.html": {"index.html", "text/html; charset=utf-8"},
	"/style.css":  {"style.css", "text/css; charset=utf-8"},
	"/app.js":     {"app.js", "application/javascript; charset=utf-8"},
}

func applyCORS(w http.ResponseWriter) {
	h := w.Header()
	h.Set("Access-Control-Allow-Origin", "*")
	h.Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	h.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	applyCORS(w)
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// NewHandler builds the HTTP handler.
// publicDir is the path to the static-assets folder; pass "" to skip static serving (useful in tests).
func NewHandler(publicDir string) http.Handler {
	calc := Calculator{}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// OPTIONS → 204 No Content (CORS preflight)
		if r.Method == http.MethodOptions {
			applyCORS(w)
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Only GET is allowed
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", "GET, OPTIONS")
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{errMethodNotAllowed})
			return
		}

		path := r.URL.Path

		// Serve whitelisted static assets when publicDir is set
		if publicDir != "" {
			if asset, ok := staticAssets[path]; ok {
				data, err := os.ReadFile(filepath.Join(publicDir, asset.file))
				if err == nil {
					w.Header().Set("Content-Type", asset.ct)
					w.Header().Set("Access-Control-Allow-Origin", "*")
					w.WriteHeader(http.StatusOK)
					w.Write(data) //nolint:errcheck
					return
				}
			}
		}

		if path != "/calculate" {
			writeJSON(w, http.StatusNotFound, errorResponse{errRouteNotFound})
			return
		}

		q := r.URL.Query()

		// All three query parameters must be present
		_, hasOp := q["operation"]
		_, hasA := q["a"]
		_, hasB := q["b"]
		if !hasOp || !hasA || !hasB {
			writeJSON(w, http.StatusBadRequest, errorResponse{errMissingParams})
			return
		}

		operation := q.Get("operation")
		aStr := q.Get("a")
		bStr := q.Get("b")

		// Parse and validate numeric parameters (NaN check mirrors JS Number.isNaN)
		numA, errA := strconv.ParseFloat(aStr, 64)
		numB, errB := strconv.ParseFloat(bStr, 64)
		if errA != nil || errB != nil || math.IsNaN(numA) || math.IsNaN(numB) {
			writeJSON(w, http.StatusBadRequest, errorResponse{errNotANumber})
			return
		}

		// Validate operation name
		switch operation {
		case "add", "subtract", "multiply", "divide":
			// valid
		default:
			writeJSON(w, http.StatusBadRequest, errorResponse{errUnknownOp})
			return
		}

		// Execute
		var result float64
		var calcErr error
		switch operation {
		case "add":
			result = calc.Add(numA, numB)
		case "subtract":
			result = calc.Subtract(numA, numB)
		case "multiply":
			result = calc.Multiply(numA, numB)
		case "divide":
			result, calcErr = calc.Divide(numA, numB)
		}

		if calcErr != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{calcErr.Error()})
			return
		}

		writeJSON(w, http.StatusOK, calcResponse{
			Operation: operation,
			A:         numA,
			B:         numB,
			Result:    result,
		})
	})
}

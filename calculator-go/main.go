package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// Default: public/ is one level up (sibling of this directory)
	publicDir := filepath.Join("..", "public")

	handler := NewHandler(publicDir)

	fmt.Printf("Serveur démarré sur http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		fmt.Fprintf(os.Stderr, "Erreur serveur : %v\n", err)
		os.Exit(1)
	}
}

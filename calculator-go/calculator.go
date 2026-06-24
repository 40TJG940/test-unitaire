package main

import "errors"

// Calculator provides the four basic arithmetic operations.
type Calculator struct{}

func (c Calculator) Add(a, b float64) float64 {
	return a + b
}

func (c Calculator) Subtract(a, b float64) float64 {
	return a - b
}

func (c Calculator) Multiply(a, b float64) float64 {
	return a * b
}

// Divide returns an error when b is zero, matching the JS behaviour:
// throw new Error("Division par zéro impossible.")
func (c Calculator) Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("Division par zéro impossible.")
	}
	return a / b, nil
}

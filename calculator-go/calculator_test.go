package main

import (
	"math"
	"testing"
)

// --- Add ---

func TestAddPositiveIntegers(t *testing.T) {
	c := Calculator{}
	if got := c.Add(5, 3); got != 8 {
		t.Errorf("Add(5, 3) = %v, want 8", got)
	}
}

func TestAddNegativeIntegers(t *testing.T) {
	c := Calculator{}
	if got := c.Add(-5, -3); got != -8 {
		t.Errorf("Add(-5, -3) = %v, want -8", got)
	}
}

func TestAddMixedSign(t *testing.T) {
	c := Calculator{}
	if got := c.Add(-5, 3); got != -2 {
		t.Errorf("Add(-5, 3) = %v, want -2", got)
	}
}

func TestAddWithZero(t *testing.T) {
	c := Calculator{}
	if got := c.Add(5, 0); got != 5 {
		t.Errorf("Add(5, 0) = %v, want 5", got)
	}
}

func TestAddFloats(t *testing.T) {
	c := Calculator{}
	got := c.Add(0.1, 0.2)
	// IEEE 754 produces 0.30000000000000004 — same as JavaScript
	if math.Abs(got-0.3) > 1e-9 {
		t.Errorf("Add(0.1, 0.2) = %v, want ≈ 0.3", got)
	}
}

// --- Subtract ---

func TestSubtractPositiveResult(t *testing.T) {
	c := Calculator{}
	if got := c.Subtract(5, 3); got != 2 {
		t.Errorf("Subtract(5, 3) = %v, want 2", got)
	}
}

func TestSubtractNegativeResult(t *testing.T) {
	c := Calculator{}
	if got := c.Subtract(3, 5); got != -2 {
		t.Errorf("Subtract(3, 5) = %v, want -2", got)
	}
}

func TestSubtractTwoNegatives(t *testing.T) {
	c := Calculator{}
	if got := c.Subtract(-5, -3); got != -2 {
		t.Errorf("Subtract(-5, -3) = %v, want -2", got)
	}
}

func TestSubtractZero(t *testing.T) {
	c := Calculator{}
	if got := c.Subtract(5, 0); got != 5 {
		t.Errorf("Subtract(5, 0) = %v, want 5", got)
	}
}

func TestSubtractFloats(t *testing.T) {
	c := Calculator{}
	got := c.Subtract(0.3, 0.1)
	if math.Abs(got-0.2) > 1e-9 {
		t.Errorf("Subtract(0.3, 0.1) = %v, want ≈ 0.2", got)
	}
}

// --- Multiply ---

func TestMultiplyTwoPositives(t *testing.T) {
	c := Calculator{}
	if got := c.Multiply(5, 3); got != 15 {
		t.Errorf("Multiply(5, 3) = %v, want 15", got)
	}
}

func TestMultiplyWithZero(t *testing.T) {
	c := Calculator{}
	if got := c.Multiply(5, 0); got != 0 {
		t.Errorf("Multiply(5, 0) = %v, want 0", got)
	}
}

func TestMultiplyTwoNegatives(t *testing.T) {
	c := Calculator{}
	if got := c.Multiply(-5, -3); got != 15 {
		t.Errorf("Multiply(-5, -3) = %v, want 15", got)
	}
}

func TestMultiplyMixedSign(t *testing.T) {
	c := Calculator{}
	if got := c.Multiply(5, -3); got != -15 {
		t.Errorf("Multiply(5, -3) = %v, want -15", got)
	}
}

func TestMultiplyFloats(t *testing.T) {
	c := Calculator{}
	got := c.Multiply(0.1, 3)
	if math.Abs(got-0.3) > 1e-9 {
		t.Errorf("Multiply(0.1, 3) = %v, want ≈ 0.3", got)
	}
}

// --- Divide ---

func TestDivideIntegerResult(t *testing.T) {
	c := Calculator{}
	got, err := c.Divide(10, 2)
	if err != nil {
		t.Fatalf("Divide(10, 2) unexpected error: %v", err)
	}
	if got != 5 {
		t.Errorf("Divide(10, 2) = %v, want 5", got)
	}
}

func TestDivideNegativeResult(t *testing.T) {
	c := Calculator{}
	got, err := c.Divide(-10, 2)
	if err != nil {
		t.Fatalf("Divide(-10, 2) unexpected error: %v", err)
	}
	if got != -5 {
		t.Errorf("Divide(-10, 2) = %v, want -5", got)
	}
}

func TestDivideDecimalResult(t *testing.T) {
	c := Calculator{}
	got, err := c.Divide(10, 3)
	if err != nil {
		t.Fatalf("Divide(10, 3) unexpected error: %v", err)
	}
	if math.Abs(got-3.3333333333333335) > 1e-10 {
		t.Errorf("Divide(10, 3) = %v, want ≈ 3.333", got)
	}
}

func TestDivideByNegative(t *testing.T) {
	c := Calculator{}
	got, err := c.Divide(10, -2)
	if err != nil {
		t.Fatalf("Divide(10, -2) unexpected error: %v", err)
	}
	if got != -5 {
		t.Errorf("Divide(10, -2) = %v, want -5", got)
	}
}

func TestDivideFloat(t *testing.T) {
	c := Calculator{}
	got, err := c.Divide(1, 4)
	if err != nil {
		t.Fatalf("Divide(1, 4) unexpected error: %v", err)
	}
	if got != 0.25 {
		t.Errorf("Divide(1, 4) = %v, want 0.25", got)
	}
}

func TestDivideByZeroReturnsError(t *testing.T) {
	c := Calculator{}
	_, err := c.Divide(10, 0)
	if err == nil {
		t.Fatal("Divide(10, 0): expected error, got nil")
	}
	want := "Division par zéro impossible."
	if err.Error() != want {
		t.Errorf("Divide(10, 0) error = %q, want %q", err.Error(), want)
	}
}

func TestDivideZeroByZeroReturnsError(t *testing.T) {
	c := Calculator{}
	_, err := c.Divide(0, 0)
	if err == nil {
		t.Fatal("Divide(0, 0): expected error, got nil")
	}
}

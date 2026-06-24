//! Logique metier de la calculatrice.
//!
//! Equivalent Rust de `src/calculator.js`. Chaque operation prend deux `f64`
//! et renvoie un `Result` : `divide` echoue sur une division par zero, comme
//! le `throw new Error("Division par zero impossible.")` cote Node.

pub fn add(a: f64, b: f64) -> Result<f64, String> {
    Ok(a + b)
}

pub fn subtract(a: f64, b: f64) -> Result<f64, String> {
    Ok(a - b)
}

pub fn multiply(a: f64, b: f64) -> Result<f64, String> {
    Ok(a * b)
}

pub fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 {
        return Err("Division par zero impossible.".to_string());
    }
    Ok(a / b)
}

/// Dispatch par nom d'operation. Renvoie `None` si l'operation est inconnue
/// (le serveur traduira ca en 400 "Operation inconnue").
pub fn compute(operation: &str, a: f64, b: f64) -> Option<Result<f64, String>> {
    match operation {
        "add" => Some(add(a, b)),
        "subtract" => Some(subtract(a, b)),
        "multiply" => Some(multiply(a, b)),
        "divide" => Some(divide(a, b)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_works() {
        assert_eq!(add(2.0, 3.0).unwrap(), 5.0);
    }

    #[test]
    fn subtract_works() {
        assert_eq!(subtract(5.0, 3.0).unwrap(), 2.0);
    }

    #[test]
    fn multiply_works() {
        assert_eq!(multiply(4.0, 3.0).unwrap(), 12.0);
    }

    #[test]
    fn divide_works() {
        assert_eq!(divide(10.0, 2.0).unwrap(), 5.0);
    }

    #[test]
    fn divide_by_zero_errors() {
        assert!(divide(1.0, 0.0).is_err());
    }

    #[test]
    fn compute_unknown_is_none() {
        assert!(compute("modulo", 1.0, 2.0).is_none());
    }
}

use semantic::diagnostics::*;
use lexer::SourceLocation;

// ============================================================================
// Diagnostic Creation Tests
// ============================================================================

#[test]
fn test_error_diagnostic_creation() {
    let loc = SourceLocation::new(1, 5, 4);
    let diag = Diagnostic::error(
        ErrorCode::UndefinedVariable,
        "Variable 'x' is not defined".to_string(),
        loc,
    );
    
    assert_eq!(diag.severity, Severity::Error);
    assert_eq!(diag.code, ErrorCode::UndefinedVariable);
    assert_eq!(diag.message, "Variable 'x' is not defined");
    assert_eq!(diag.location, loc);
    assert!(diag.suggestion.is_none());
}

#[test]
fn test_warning_diagnostic_creation() {
    let loc = SourceLocation::new(2, 10, 15);
    let diag = Diagnostic::warning(
        ErrorCode::MissingReturn,
        "Query should have a RETURN clause".to_string(),
        loc,
    );
    
    assert_eq!(diag.severity, Severity::Warning);
    assert_eq!(diag.code, ErrorCode::MissingReturn);
}

#[test]
fn test_info_diagnostic_creation() {
    let loc = SourceLocation::new(1, 1, 0);
    let diag = Diagnostic::info(
        ErrorCode::Other("hint".to_string()),
        "Consider adding an index".to_string(),
        loc,
    );
    
    assert_eq!(diag.severity, Severity::Info);
}

#[test]
fn test_diagnostic_with_suggestion() {
    let loc = SourceLocation::new(1, 1, 0);
    let diag = Diagnostic::error(
        ErrorCode::UndefinedProperty,
        "Property 'nam' not found".to_string(),
        loc,
    ).with_suggestion("Did you mean 'name'?".to_string());
    
    assert_eq!(diag.suggestion, Some("Did you mean 'name'?".to_string()));
}

// ============================================================================
// ErrorCode Display Tests
// ============================================================================

#[test]
fn test_error_code_display() {
    let test_cases = vec![
        (ErrorCode::UndefinedVariable, "E001"),
        (ErrorCode::UndefinedProperty, "E002"),
        (ErrorCode::TypeMismatch, "E003"),
        (ErrorCode::InvalidFunction, "E004"),
        (ErrorCode::InvalidArgument, "E005"),
        (ErrorCode::UndefinedType, "E006"),
        (ErrorCode::InvalidPattern, "E007"),
        (ErrorCode::InvalidClause, "E008"),
        (ErrorCode::MissingReturn, "E009"),
        (ErrorCode::InvalidSchema, "E010"),
        (ErrorCode::Other("custom".to_string()), "E999"),
    ];
    
    for (code, expected) in test_cases {
        assert_eq!(format!("{}", code), expected, "Failed for {:?}", code);
    }
}

#[test]
fn test_error_code_equality() {
    assert_eq!(ErrorCode::UndefinedVariable, ErrorCode::UndefinedVariable);
    assert_ne!(ErrorCode::UndefinedVariable, ErrorCode::UndefinedProperty);
    assert_eq!(ErrorCode::Other("x".to_string()), ErrorCode::Other("x".to_string()));
}

// ============================================================================
// DiagnosticBag Tests
// ============================================================================

#[test]
fn test_diagnostic_bag_empty() {
    let bag = DiagnosticBag::new();
    
    assert!(!bag.has_errors());
    assert!(bag.errors().is_empty());
    assert!(bag.warnings().is_empty());
    assert!(bag.diagnostics().is_empty());
}

#[test]
fn test_diagnostic_bag_add_error() {
    let mut bag = DiagnosticBag::new();
    let loc = SourceLocation::new(1, 1, 0);
    
    bag.add_error(
        ErrorCode::TypeMismatch,
        "Type mismatch".to_string(),
        loc,
    );
    
    assert!(bag.has_errors());
    assert_eq!(bag.errors().len(), 1);
    assert_eq!(bag.warnings().len(), 0);
}

#[test]
fn test_diagnostic_bag_add_warning() {
    let mut bag = DiagnosticBag::new();
    let loc = SourceLocation::new(1, 1, 0);
    
    bag.add_warning(
        ErrorCode::MissingReturn,
        "Missing return".to_string(),
        loc,
    );
    
    assert!(!bag.has_errors()); // Warnings don't count as errors
    assert_eq!(bag.errors().len(), 0);
    assert_eq!(bag.warnings().len(), 1);
}

#[test]
fn test_diagnostic_bag_mixed() {
    let mut bag = DiagnosticBag::new();
    let loc = SourceLocation::new(1, 1, 0);
    
    bag.add_error(ErrorCode::TypeMismatch, "Error 1".to_string(), loc);
    bag.add_warning(ErrorCode::MissingReturn, "Warning 1".to_string(), loc);
    bag.add_error(ErrorCode::InvalidFunction, "Error 2".to_string(), loc);
    bag.add_warning(ErrorCode::UndefinedType, "Warning 2".to_string(), loc);
    
    assert!(bag.has_errors());
    assert_eq!(bag.errors().len(), 2);
    assert_eq!(bag.warnings().len(), 2);
    assert_eq!(bag.diagnostics().len(), 4);
}

#[test]
fn test_diagnostic_bag_clone() {
    let mut bag = DiagnosticBag::new();
    bag.add_error(
        ErrorCode::InvalidClause,
        "Test".to_string(),
        SourceLocation::new(1, 1, 0),
    );
    
    let cloned = bag.clone();
    assert!(cloned.has_errors());
    assert_eq!(cloned.errors().len(), 1);
}

// ============================================================================
// Severity Tests
// ============================================================================

#[test]
fn test_severity_equality() {
    assert_eq!(Severity::Error, Severity::Error);
    assert_ne!(Severity::Error, Severity::Warning);
    assert_ne!(Severity::Warning, Severity::Info);
}

// ============================================================================
// Serialization Tests
// ============================================================================

#[test]
fn test_diagnostic_serialization() {
    let diag = Diagnostic::error(
        ErrorCode::UndefinedVariable,
        "Test message".to_string(),
        SourceLocation::new(1, 1, 0),
    );
    
    let json = serde_json::to_string(&diag).unwrap();
    // Serde serializes enum variants as strings, not Display values
    assert!(json.contains("Error"));
    assert!(json.contains("UndefinedVariable"));
    assert!(json.contains("Test message"));
}

#[test]
fn test_diagnostic_bag_serialization() {
    let mut bag = DiagnosticBag::new();
    bag.add_error(
        ErrorCode::TypeMismatch,
        "Test".to_string(),
        SourceLocation::new(1, 1, 0),
    );
    
    let json = serde_json::to_string(&bag).unwrap();
    assert!(json.contains("diagnostics"));
}

#[test]
fn test_diagnostic_deserialization() {
    let json = r#"{"severity":"Error","code":"UndefinedVariable","message":"x not found","location":{"line":1,"column":5,"offset":4},"suggestion":null}"#;
    let diag: Diagnostic = serde_json::from_str(json).unwrap();
    
    assert_eq!(diag.severity, Severity::Error);
    assert_eq!(diag.message, "x not found");
    assert_eq!(diag.location.line, 1);
}
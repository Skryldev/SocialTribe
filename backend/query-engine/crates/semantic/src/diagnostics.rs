use serde::{Deserialize, Serialize};
use lexer::SourceLocation;

/// Severity level of a diagnostic
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Severity {
    Error,
    Warning,
    Info,
}

/// Error codes for semantic validation
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorCode {
    UndefinedVariable,
    UndefinedProperty,
    TypeMismatch,
    InvalidFunction,
    InvalidArgument,
    UndefinedType,
    InvalidPattern,
    InvalidClause,
    MissingReturn,
    InvalidSchema,
    Other(String),
}

impl std::fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ErrorCode::UndefinedVariable => write!(f, "E001"),
            ErrorCode::UndefinedProperty => write!(f, "E002"),
            ErrorCode::TypeMismatch => write!(f, "E003"),
            ErrorCode::InvalidFunction => write!(f, "E004"),
            ErrorCode::InvalidArgument => write!(f, "E005"),
            ErrorCode::UndefinedType => write!(f, "E006"),
            ErrorCode::InvalidPattern => write!(f, "E007"),
            ErrorCode::InvalidClause => write!(f, "E008"),
            ErrorCode::MissingReturn => write!(f, "E009"),
            ErrorCode::InvalidSchema => write!(f, "E010"),
            ErrorCode::Other(_) => write!(f, "E999"),
        }
    }
}

/// A diagnostic message for semantic errors
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Diagnostic {
    pub severity: Severity,
    pub code: ErrorCode,
    pub message: String,
    pub location: SourceLocation,
    pub suggestion: Option<String>,
}

impl Diagnostic {
    /// Creates a new error diagnostic
    pub fn error(code: ErrorCode, message: String, location: SourceLocation) -> Self {
        Diagnostic {
            severity: Severity::Error,
            code,
            message,
            location,
            suggestion: None,
        }
    }
    
    /// Creates a new warning diagnostic
    pub fn warning(code: ErrorCode, message: String, location: SourceLocation) -> Self {
        Diagnostic {
            severity: Severity::Warning,
            code,
            message,
            location,
            suggestion: None,
        }
    }
    
    /// Creates a new info diagnostic
    pub fn info(code: ErrorCode, message: String, location: SourceLocation) -> Self {
        Diagnostic {
            severity: Severity::Info,
            code,
            message,
            location,
            suggestion: None,
        }
    }
    
    /// Adds a suggestion to the diagnostic
    pub fn with_suggestion(mut self, suggestion: String) -> Self {
        self.suggestion = Some(suggestion);
        self
    }
}

/// Collection of diagnostics
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DiagnosticBag {
    diagnostics: Vec<Diagnostic>,
}

impl DiagnosticBag {
    /// Creates a new empty diagnostic bag
    pub fn new() -> Self {
        DiagnosticBag {
            diagnostics: Vec::new(),
        }
    }
    
    /// Adds a diagnostic
    pub fn add(&mut self, diagnostic: Diagnostic) {
        self.diagnostics.push(diagnostic);
    }
    
    /// Adds an error diagnostic
    pub fn add_error(&mut self, code: ErrorCode, message: String, location: SourceLocation) {
        self.add(Diagnostic::error(code, message, location));
    }
    
    /// Adds a warning diagnostic
    pub fn add_warning(&mut self, code: ErrorCode, message: String, location: SourceLocation) {
        self.add(Diagnostic::warning(code, message, location));
    }
    
    /// Returns all diagnostics
    pub fn diagnostics(&self) -> &[Diagnostic] {
        &self.diagnostics
    }
    
    /// Returns true if there are any errors
    pub fn has_errors(&self) -> bool {
        self.diagnostics.iter().any(|d| d.severity == Severity::Error)
    }
    
    /// Returns only error diagnostics
    pub fn errors(&self) -> Vec<&Diagnostic> {
        self.diagnostics.iter().filter(|d| d.severity == Severity::Error).collect()
    }
    
    /// Returns only warning diagnostics
    pub fn warnings(&self) -> Vec<&Diagnostic> {
        self.diagnostics.iter().filter(|d| d.severity == Severity::Warning).collect()
    }
}
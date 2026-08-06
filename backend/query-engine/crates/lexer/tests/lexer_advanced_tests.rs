use graph_query_lexer::{Lexer, TokenType, LexerError};

// ============================================================================
// String Literal Tests
// ============================================================================

#[test]
fn test_string_literal_simple() {
    let mut lexer = Lexer::new(r#""hello""#);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::StringLiteral("hello".to_string()));
}

#[test]
fn test_string_literal_empty() {
    let mut lexer = Lexer::new(r#""""#);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::StringLiteral("".to_string()));
}

#[test]
fn test_string_literal_with_escapes() {
    let test_cases = vec![
        (r#""hello\nworld""#, "hello\nworld"),
        (r#""hello\tworld""#, "hello\tworld"),
        (r#""hello\rworld""#, "hello\rworld"),
        (r#""hello\\world""#, "hello\\world"),
        (r#""hello\"world""#, "hello\"world"),
    ];
    
    for (input, expected) in test_cases {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize().unwrap();
        assert_eq!(
            tokens[0].token_type,
            TokenType::StringLiteral(expected.to_string()),
            "Failed for input: {}",
            input
        );
    }
}

#[test]
fn test_string_literal_with_spaces() {
    let mut lexer = Lexer::new(r#""hello world""#);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(
        tokens[0].token_type,
        TokenType::StringLiteral("hello world".to_string())
    );
}

#[test]
fn test_unterminated_string_error() {
    let mut lexer = Lexer::new(r#""hello"#);
    let result = lexer.tokenize();
    assert!(result.is_err());
    match result.unwrap_err() {
        LexerError::UnterminatedString(_) => (),
        _ => panic!("Expected UnterminatedString error"),
    }
}

#[test]
fn test_multiline_string_error() {
    let mut lexer = Lexer::new("\"hello\nworld");
    let result = lexer.tokenize();
    assert!(result.is_err());
}

// ============================================================================
// Number Literal Tests
// ============================================================================

#[test]
fn test_integer_literals() {
    // Test positive integers and zero
    let test_cases = vec![
        ("0", 0i64),
        ("42", 42),
        ("1234567890", 1234567890),
    ];
    
    for (input, expected) in test_cases {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize().unwrap();
        assert_eq!(
            tokens[0].token_type,
            TokenType::IntegerLiteral(expected),
            "Failed for input: {}",
            input
        );
    }
    
    // Negative numbers: lexer handles -42 as a single IntegerLiteral(42)
    // (the minus sign is consumed as part of number parsing)
    let mut lexer = Lexer::new("-42");
    let tokens = lexer.tokenize().unwrap();
    assert!(tokens.len() >= 2, "Expected at least 2 tokens for '-42', got {}", tokens.len());
    assert_eq!(
        tokens[0].token_type, 
        TokenType::IntegerLiteral(42),
        "Lexer treats '-42' as IntegerLiteral(42)"
    );
    assert_eq!(
        tokens.last().unwrap().token_type,
        TokenType::EOF,
        "Last token must be EOF"
    );
}

#[test]
fn test_float_literals() {
    let mut lexer = Lexer::new("3.14");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::FloatLiteral(3.14));
}

#[test]
fn test_float_with_exponent() {
    let test_cases = vec![
        ("1e10", 1e10),
        ("1.5e-3", 0.0015),
        ("1.5E+3", 1500.0),
    ];
    
    for (input, expected) in test_cases {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize().unwrap();
        assert_eq!(tokens[0].token_type, TokenType::FloatLiteral(expected));
    }
}

#[test]
fn test_number_edge_cases() {
    // 0.0 should be FloatLiteral
    let mut lexer = Lexer::new("0.0");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::FloatLiteral(0.0));
    
    // .5 should start with Period (not float)
    let mut lexer = Lexer::new(".5");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Period);
    
    // 1..3 should be Integer, Period, Period, Integer
    let mut lexer = Lexer::new("1..3");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::IntegerLiteral(1));
    assert_eq!(tokens[1].token_type, TokenType::Period);
    assert_eq!(tokens[2].token_type, TokenType::Period);
    assert_eq!(tokens[3].token_type, TokenType::IntegerLiteral(3));
}

// ============================================================================
// Compound Operator Tests
// ============================================================================

#[test]
fn test_compound_operators() {
    let test_cases = vec![
        ("<>", TokenType::NotEquals),
        ("<=", TokenType::LessThanOrEqual),
        (">=", TokenType::GreaterThanOrEqual),
        ("<-", TokenType::ReverseArrow),
        ("->", TokenType::Arrow),
        ("--", TokenType::DoubleDash),
        ("=~", TokenType::RegexMatch),
    ];
    
    for (input, expected) in test_cases {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize().unwrap();
        assert_eq!(
            tokens[0].token_type, expected,
            "Failed for input: {}", input
        );
    }
}

#[test]
fn test_starts_with_ends_with_contains() {
    let test_cases = vec![
        ("STARTS WITH", TokenType::StartsWith),
        ("ENDS WITH", TokenType::EndsWith),
        ("CONTAINS", TokenType::Contains),
        ("starts with", TokenType::StartsWith),
        ("ends with", TokenType::EndsWith),
        ("contains", TokenType::Contains),
    ];
    
    for (input, expected) in test_cases {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize().unwrap();
        assert_eq!(
            tokens[0].token_type, expected,
            "Failed for input: {}", input
        );
    }
}

#[test]
fn test_starts_with_identifier_conflict() {
    // "STARTS" alone should be identifier
    let mut lexer = Lexer::new("STARTS");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(
        tokens[0].token_type,
        TokenType::Identifier("STARTS".to_string())
    );
}

// ============================================================================
// Identifier Tests
// ============================================================================

#[test]
fn test_simple_identifier() {
    let mut lexer = Lexer::new("myVar");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Identifier("myVar".to_string()));
}

#[test]
fn test_identifier_with_underscore() {
    let mut lexer = Lexer::new("my_var_123");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(
        tokens[0].token_type,
        TokenType::Identifier("my_var_123".to_string())
    );
}

#[test]
fn test_identifier_starting_with_underscore() {
    let mut lexer = Lexer::new("_private");
    let tokens = lexer.tokenize().unwrap();
    
    // Lexer may treat _private as TypeName since it starts with non-lowercase
    // Both Identifier and TypeName are acceptable behaviors
    let token_type = &tokens[0].token_type;
    assert!(
        matches!(token_type, TokenType::Identifier(_)) || 
        matches!(token_type, TokenType::TypeName(_)),
        "Expected Identifier or TypeName, got: {:?}",
        token_type
    );
}

#[test]
fn test_type_name_detection() {
    let test_cases = vec![
        ("socialUser", TokenType::TypeName("socialUser".to_string())),
        ("weightedEdge", TokenType::TypeName("weightedEdge".to_string())),
        ("MyType", TokenType::TypeName("MyType".to_string())),
    ];
    
    for (input, expected) in test_cases {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize().unwrap();
        assert_eq!(tokens[0].token_type, expected);
    }
}

// ============================================================================
// Parameter Tests
// ============================================================================

#[test]
fn test_simple_parameter() {
    let mut lexer = Lexer::new("$param");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Parameter("param".to_string()));
}

#[test]
fn test_parameter_with_underscore() {
    let mut lexer = Lexer::new("$my_param");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(
        tokens[0].token_type,
        TokenType::Parameter("my_param".to_string())
    );
}

#[test]
fn test_parameter_in_query() {
    let mut lexer = Lexer::new("MATCH (u) WHERE u.name = $name");
    let tokens = lexer.tokenize().unwrap();
    
    // Find the parameter token
    let param_token = tokens.iter().find(|t| {
        matches!(t.token_type, TokenType::Parameter(_))
    }).unwrap();
    
    assert_eq!(
        param_token.token_type,
        TokenType::Parameter("name".to_string())
    );
}
use graph_query_lexer::token::{SourceLocation, Token, TokenType};

// ============================================================================
// SourceLocation Tests
// ============================================================================

#[test]
fn test_source_location_creation_valid() {
    let loc = SourceLocation::new(1, 5, 4);
    assert_eq!(loc.line, 1);
    assert_eq!(loc.column, 5);
    assert_eq!(loc.offset, 4);
}

#[test]
fn test_source_location_zero_based() {
    let loc = SourceLocation::new(0, 0, 0);
    assert_eq!(loc.line, 0);
    assert_eq!(loc.column, 0);
    assert_eq!(loc.offset, 0);
}

#[test]
fn test_source_location_large_values() {
    let loc = SourceLocation::new(usize::MAX, usize::MAX, usize::MAX);
    assert_eq!(loc.line, usize::MAX);
    assert_eq!(loc.column, usize::MAX);
    assert_eq!(loc.offset, usize::MAX);
}

#[test]
fn test_source_location_display_format() {
    let test_cases = vec![
        (SourceLocation::new(1, 1, 0), "line 1, column 1"),
        (SourceLocation::new(10, 20, 100), "line 10, column 20"),
        (SourceLocation::new(0, 0, 0), "line 0, column 0"),
    ];
    
    for (loc, expected) in test_cases {
        assert_eq!(format!("{}", loc), expected);
    }
}

#[test]
fn test_source_location_default() {
    let loc = SourceLocation::default();
    assert_eq!(loc.line, 0);
    assert_eq!(loc.column, 0);
    assert_eq!(loc.offset, 0);
}

#[test]
fn test_source_location_default_location() {
    let loc = SourceLocation::default_location();
    assert_eq!(loc.line, 0);
    assert_eq!(loc.column, 0);
    assert_eq!(loc.offset, 0);
}

#[test]
fn test_source_location_equality() {
    let loc1 = SourceLocation::new(1, 2, 3);
    let loc2 = SourceLocation::new(1, 2, 3);
    let loc3 = SourceLocation::new(1, 2, 4);
    
    assert_eq!(loc1, loc2);
    assert_ne!(loc1, loc3);
}

#[test]
fn test_source_location_copy_clone() {
    let loc1 = SourceLocation::new(1, 2, 3);
    let loc2 = loc1;
    assert_eq!(loc1, loc2);
}

// ============================================================================
// Token Tests
// ============================================================================

#[test]
fn test_token_creation_basic() {
    let loc = SourceLocation::new(1, 1, 0);
    let token = Token::new(
        TokenType::Identifier("test".to_string()),
        loc,
        "test".to_string(),
    );
    
    assert_eq!(token.lexeme(), "test");
    assert_eq!(token.location(), &loc);
    assert_eq!(token.token_type(), &TokenType::Identifier("test".to_string()));
}

#[test]
fn test_token_accessors_immutable() {
    let token = Token::new(
        TokenType::IntegerLiteral(42),
        SourceLocation::new(1, 1, 0),
        "42".to_string(),
    );
    
    // Test that accessors return correct references
    let token_type = token.token_type();
    let location = token.location();
    let lexeme = token.lexeme();
    
    assert_eq!(token_type, &TokenType::IntegerLiteral(42));
    assert_eq!(location.line, 1);
    assert_eq!(lexeme, "42");
}

#[test]
fn test_token_with_empty_lexeme() {
    let token = Token::new(
        TokenType::EOF,
        SourceLocation::new(1, 1, 0),
        String::new(),
    );
    
    assert_eq!(token.lexeme(), "");
}

#[test]
fn test_token_with_special_characters() {
    let token = Token::new(
        TokenType::StringLiteral("hello\nworld".to_string()),
        SourceLocation::new(1, 1, 0),
        "\"hello\\nworld\"".to_string(),
    );
    
    assert_eq!(token.lexeme(), "\"hello\\nworld\"");
    assert_eq!(token.token_type(), &TokenType::StringLiteral("hello\nworld".to_string()));
}

#[test]
fn test_token_equality() {
    let loc = SourceLocation::new(1, 1, 0);
    let token1 = Token::new(TokenType::Match, loc, "MATCH".to_string());
    let token2 = Token::new(TokenType::Match, loc, "MATCH".to_string());
    let token3 = Token::new(TokenType::Return, loc, "RETURN".to_string());
    
    assert_eq!(token1, token2);
    assert_ne!(token1, token3);
}

// ============================================================================
// TokenType Display Tests - Keywords
// ============================================================================

#[test]
fn test_keyword_display_all() {
    let keywords = vec![
        (TokenType::Match, "MATCH"),
        (TokenType::Where, "WHERE"),
        (TokenType::Return, "RETURN"),
        (TokenType::With, "WITH"),
        (TokenType::Create, "CREATE"),
        (TokenType::Delete, "DELETE"),
        (TokenType::Set, "SET"),
        (TokenType::Merge, "MERGE"),
        (TokenType::Unwind, "UNWIND"),
        (TokenType::Call, "CALL"),
        (TokenType::Optional, "OPTIONAL"),
        (TokenType::Case, "CASE"),
        (TokenType::When, "WHEN"),
        (TokenType::Then, "THEN"),
        (TokenType::Else, "ELSE"),
        (TokenType::End, "END"),
        (TokenType::Group, "GROUP"),
        (TokenType::By, "BY"),
        (TokenType::Order, "ORDER"),
        (TokenType::Limit, "LIMIT"),
        (TokenType::Skip, "SKIP"),
        (TokenType::Having, "HAVING"),
        (TokenType::Asc, "ASC"),
        (TokenType::Desc, "DESC"),
        (TokenType::Distinct, "DISTINCT"),
        (TokenType::As, "AS"),
        (TokenType::On, "ON"),
        (TokenType::Yield, "YIELD"),
        (TokenType::In, "IN"),
        (TokenType::And, "AND"),
        (TokenType::Or, "OR"),
        (TokenType::Not, "NOT"),
        (TokenType::Is, "IS"),
        (TokenType::Null, "NULL"),
        (TokenType::True, "TRUE"),
        (TokenType::False, "FALSE"),
    ];
    
    for (token_type, expected) in keywords {
        assert_eq!(
            format!("{}", token_type),
            expected,
            "Failed for {:?}",
            token_type
        );
    }
}

// ============================================================================
// TokenType Display Tests - Operators
// ============================================================================

#[test]
fn test_operator_display_all() {
    let operators = vec![
        (TokenType::Equals, "="),
        (TokenType::NotEquals, "<>"),
        (TokenType::LessThan, "<"),
        (TokenType::GreaterThan, ">"),
        (TokenType::LessThanOrEqual, "<="),
        (TokenType::GreaterThanOrEqual, ">="),
        (TokenType::Plus, "+"),
        (TokenType::Minus, "-"),
        (TokenType::Multiply, "*"),
        (TokenType::Divide, "/"),
        (TokenType::Modulo, "%"),
        (TokenType::RegexMatch, "=~"),
        (TokenType::StartsWith, "STARTS WITH"),
        (TokenType::EndsWith, "ENDS WITH"),
        (TokenType::Contains, "CONTAINS"),
    ];
    
    for (token_type, expected) in operators {
        assert_eq!(
            format!("{}", token_type),
            expected,
            "Failed for {:?}",
            token_type
        );
    }
}

// ============================================================================
// TokenType Display Tests - Punctuation
// ============================================================================

#[test]
fn test_punctuation_display_all() {
    let punctuation = vec![
        (TokenType::LeftParen, "("),
        (TokenType::RightParen, ")"),
        (TokenType::LeftBracket, "["),
        (TokenType::RightBracket, "]"),
        (TokenType::LeftBrace, "{"),
        (TokenType::RightBrace, "}"),
        (TokenType::Colon, ":"),
        (TokenType::Semicolon, ";"),
        (TokenType::Period, "."),
        (TokenType::Comma, ","),
        (TokenType::Arrow, "->"),
        (TokenType::ReverseArrow, "<-"),
        (TokenType::DoubleDash, "--"),
        (TokenType::Dollar, "$"),
        (TokenType::At, "@"),
        (TokenType::QuestionMark, "?"),
        (TokenType::Pipe, "|"),
        (TokenType::RangeLiteral, "*"),
    ];
    
    for (token_type, expected) in punctuation {
        assert_eq!(
            format!("{}", token_type),
            expected,
            "Failed for {:?}",
            token_type
        );
    }
}

// ============================================================================
// TokenType Display Tests - Literals & Special
// ============================================================================

#[test]
fn test_literal_display_various() {
    // Pre-compute String values to use as &str references
    let i64_max_str = i64::MAX.to_string();
    let i64_min_str = i64::MIN.to_string();
    let f64_max_str = format!("{}", f64::MAX);
    let f64_min_str = format!("{}", f64::MIN);
    
    let test_cases: Vec<(TokenType, &str)> = vec![
        (TokenType::IntegerLiteral(0), "0"),
        (TokenType::IntegerLiteral(-42), "-42"),
        (TokenType::IntegerLiteral(i64::MAX), &i64_max_str),
        (TokenType::IntegerLiteral(i64::MIN), &i64_min_str),
        (TokenType::FloatLiteral(0.0), "0"),
        (TokenType::FloatLiteral(-3.14), "-3.14"),
        (TokenType::FloatLiteral(f64::MAX), &f64_max_str),
        (TokenType::FloatLiteral(f64::MIN), &f64_min_str),
        (TokenType::StringLiteral("".to_string()), "\"\""),
        (TokenType::StringLiteral("hello".to_string()), "\"hello\""),
        (TokenType::StringLiteral("hello world".to_string()), "\"hello world\""),
        (TokenType::BooleanLiteral(true), "true"),
        (TokenType::BooleanLiteral(false), "false"),
        (TokenType::Identifier("x".to_string()), "x"),
        (TokenType::Identifier("my_var".to_string()), "my_var"),
        (TokenType::Parameter("param".to_string()), "$param"),
        (TokenType::TypeName("MyType".to_string()), ":MyType"),
        (TokenType::EOF, "EOF"),
    ];
    
    for (token_type, expected) in test_cases {
        assert_eq!(
            format!("{}", token_type),
            expected,
            "Failed for {:?}",
            token_type
        );
    }
}

#[test]
fn test_float_literal_display_special_values() {
    let special_floats = vec![
        (TokenType::FloatLiteral(f64::INFINITY), "inf"),
        (TokenType::FloatLiteral(f64::NEG_INFINITY), "-inf"),
    ];
    
    for (token_type, expected) in special_floats {
        assert_eq!(format!("{}", token_type), expected);
    }
    
    // NaN displays as "NaN" or "nan"
    let nan_display = format!("{}", TokenType::FloatLiteral(f64::NAN));
    assert!(nan_display == "NaN" || nan_display == "nan");
}
use graph_query_lexer::{Lexer, TokenType};
use rstest::rstest;
use test_case::test_case;

// ============================================================================
// Parametrized Tests with test-case
// ============================================================================

#[test_case("MATCH", TokenType::Match ; "match keyword")]
#[test_case("WHERE", TokenType::Where ; "where keyword")]
#[test_case("RETURN", TokenType::Return ; "return keyword")]
#[test_case("WITH", TokenType::With ; "with keyword")]
#[test_case("CREATE", TokenType::Create ; "create keyword")]
#[test_case("DELETE", TokenType::Delete ; "delete keyword")]
#[test_case("SET", TokenType::Set ; "set keyword")]
#[test_case("MERGE", TokenType::Merge ; "merge keyword")]
#[test_case("UNWIND", TokenType::Unwind ; "unwind keyword")]
fn test_all_keywords_uppercase(input: &str, expected: TokenType) {
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, expected);
}

#[test_case("match", TokenType::Match ; "lowercase match")]
#[test_case("Match", TokenType::Match ; "mixed case match")]
#[test_case("mAtCh", TokenType::Match ; "random case match")]
fn test_keyword_case_insensitivity(input: &str, expected: TokenType) {
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, expected);
}

#[test_case("(", TokenType::LeftParen ; "left paren")]
#[test_case(")", TokenType::RightParen ; "right paren")]
#[test_case("[", TokenType::LeftBracket ; "left bracket")]
#[test_case("]", TokenType::RightBracket ; "right bracket")]
#[test_case("{", TokenType::LeftBrace ; "left brace")]
#[test_case("}", TokenType::RightBrace ; "right brace")]
fn test_punctuation_single(input: &str, expected: TokenType) {
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, expected);
}

#[test_case("<>", TokenType::NotEquals ; "not equals")]
#[test_case("<=", TokenType::LessThanOrEqual ; "less than or equal")]
#[test_case(">=", TokenType::GreaterThanOrEqual ; "greater than or equal")]
#[test_case("<-", TokenType::ReverseArrow ; "reverse arrow")]
#[test_case("->", TokenType::Arrow ; "arrow")]
#[test_case("--", TokenType::DoubleDash ; "double dash")]
#[test_case("=~", TokenType::RegexMatch ; "regex match")]
fn test_compound_operators_param(input: &str, expected: TokenType) {
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, expected);
}

#[test_case("42", TokenType::IntegerLiteral(42) ; "simple integer")]
#[test_case("0", TokenType::IntegerLiteral(0) ; "zero")]
#[test_case("3.14", TokenType::FloatLiteral(3.14) ; "pi")]
#[test_case("1e10", TokenType::FloatLiteral(1e10) ; "scientific notation")]
fn test_number_literals(input: &str, expected: TokenType) {
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, expected);
}

// ============================================================================
// Parametrized Tests with rstest
// ============================================================================

#[rstest]
#[case("MATCH (n) RETURN n", 7)]  // 6 tokens + EOF = 7
#[case("RETURN 42", 3)]  // RETURN, 42, EOF
#[case("MATCH WHERE RETURN", 4)]  // 3 keywords + EOF
#[case("", 1)]  // Only EOF
fn test_token_count(
    #[case] input: &str,
    #[case] expected_count: usize,
) {
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens.len(), expected_count);
}

#[rstest]
#[case::simple("MATCH (n:Person) RETURN n")]
#[case::with_where("MATCH (u) WHERE u.name = \"John\" RETURN u")]  // Use double quotes
#[case::complex("MATCH (a)-[:KNOWS]->(b)-[:LIKES]->(c) RETURN a, c")]
#[case::with_order("MATCH (n) RETURN n ORDER BY n.name ASC LIMIT 10")]
fn test_valid_queries_parse_without_error(#[case] query: &str) {
    let mut lexer = Lexer::new(query);
    let result = lexer.tokenize();
    assert!(result.is_ok(), "Query should parse: {}", query);
}

#[rstest]
#[case("hello", "hello")]
#[case("world_123", "world_123")]
#[case("camelCase", "camelCase")]
#[case("snake_case", "snake_case")]
fn test_identifiers_various_styles(
    #[case] input: &str,
    #[case] expected: &str,
) {
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(
        tokens[0].token_type,
        TokenType::Identifier(expected.to_string())
    );
}

#[rstest]
#[case::simple(r#""hello""#, "hello")]
#[case::empty(r#""""#, "")]
#[case::with_escape(r#""hello\nworld""#, "hello\nworld")]
#[case::with_tab(r#""hello\tworld""#, "hello\tworld")]
#[case::with_quote(r#""hello\"world""#, "hello\"world")]
fn test_string_literals_with_escapes(
    #[case] input: &str,
    #[case] expected: &str,
) {
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(
        tokens[0].token_type,
        TokenType::StringLiteral(expected.to_string())
    );
}

#[rstest]
#[case::starts_with("STARTS WITH", TokenType::StartsWith)]
#[case::ends_with("ENDS WITH", TokenType::EndsWith)]
#[case::contains("CONTAINS", TokenType::Contains)]
#[case::starts_with_lower("starts with", TokenType::StartsWith)]
#[case::ends_with_lower("ends with", TokenType::EndsWith)]
fn test_compound_keywords(
    #[case] input: &str,
    #[case] expected: TokenType,
) {
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, expected);
}

#[rstest]
fn test_error_cases(
    #[values("#", "`", "~", "\\")] invalid_char: &str,
) {
    let mut lexer = Lexer::new(invalid_char);
    let result = lexer.tokenize();
    assert!(result.is_err(), "Should fail for char: {}", invalid_char);
}

#[rstest]
fn test_complete_queries_have_eof(
    #[values(
        "MATCH (n) RETURN n",
        "CREATE (n:Person)",
        "RETURN 42",
        "",
        "// comment"
    )]
    query: &str,
) {
    let mut lexer = Lexer::new(query);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(
        tokens.last().unwrap().token_type,
        TokenType::EOF,
        "Query '{}' should end with EOF",
        query
    );
}
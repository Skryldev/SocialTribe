use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use graph_query_lexer::{Lexer, lex};

// ============================================================================
// Benchmark Functions
// ============================================================================

fn benchmark_simple_query(c: &mut Criterion) {
    let mut group = c.benchmark_group("simple_queries");
    
    let queries = vec![
        ("match_return", "MATCH (n) RETURN n"),
        ("literal", "42"),
        ("pattern", "(n:Person)-[e:KNOWS]->(m:Person)"),
    ];
    
    for (name, query) in queries {
        group.bench_with_input(
            BenchmarkId::new("tokenize", name),
            &query,
            |b, &query| {
                b.iter(|| {
                    let mut lexer = Lexer::new(black_box(query));
                    lexer.tokenize().unwrap()
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_complex_queries(c: &mut Criterion) {
    let mut group = c.benchmark_group("complex_queries");
    
    let queries = vec![
        ("graph_query", r#"
            MATCH (u:socialUser)-[e:weightedEdge]->(v:socialUser)
            WHERE e.Weight > 5 AND u.role = "bridge"
            RETURN u.name, v.name, e.Weight
            ORDER BY e.Weight DESC
            LIMIT 10
        "#),
        ("case_expression", "CASE WHEN n.age > 18 THEN 'adult' WHEN n.age > 13 THEN 'teen' ELSE 'child' END"),
    ];
    
    for (name, query) in queries {
        group.bench_with_input(
            BenchmarkId::new("tokenize", name),
            &query,
            |b, &query| {
                b.iter(|| {
                    let mut lexer = Lexer::new(black_box(query));
                    lexer.tokenize().unwrap()
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_scaling(c: &mut Criterion) {
    let mut group = c.benchmark_group("scaling");
    
    let sizes = vec![10, 100, 1000, 10000];
    
    for size in sizes {
        let query = "MATCH (n) ".repeat(size) + "RETURN n";
        
        group.bench_with_input(
            BenchmarkId::new("pattern_repetition", size),
            &query,
            |b, query| {
                b.iter(|| {
                    let mut lexer = Lexer::new(black_box(query));
                    lexer.tokenize().unwrap()
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_lex_function(c: &mut Criterion) {
    let mut group = c.benchmark_group("lex_function");
    
    let query = "MATCH (n:Person) WHERE n.age > 18 RETURN n.name, n.email ORDER BY n.name LIMIT 10";
    
    group.bench_function("lex_wrapper", |b| {
        b.iter(|| {
            lex(black_box(query)).unwrap()
        });
    });
    
    group.bench_function("lexer_direct", |b| {
        b.iter(|| {
            let mut lexer = Lexer::new(black_box(query));
            lexer.tokenize().unwrap()
        });
    });
    
    group.finish();
}

fn benchmark_comments(c: &mut Criterion) {
    let mut group = c.benchmark_group("comments");
    
    let queries = vec![
        ("line_comments", "MATCH (n)\n// This is a comment\nRETURN n\n// Another comment\n"),
        ("block_comments", "MATCH /* this is a block comment */ (n) RETURN n"),
        ("mixed_comments", "MATCH // line\n/* block */ RETURN /* block */ n // line"),
    ];
    
    for (name, query) in queries {
        group.bench_with_input(
            BenchmarkId::new("tokenize", name),
            &query,
            |b, &query| {
                b.iter(|| {
                    let mut lexer = Lexer::new(black_box(query));
                    lexer.tokenize().unwrap()
                });
            },
        );
    }
    
    group.finish();
}

criterion_group!(
    benches,
    benchmark_simple_query,
    benchmark_complex_queries,
    benchmark_scaling,
    benchmark_lex_function,
    benchmark_comments
);
criterion_main!(benches);
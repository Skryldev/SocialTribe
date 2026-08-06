use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use parser::parse;
use lexer::lex;

fn benchmark_simple_parse(c: &mut Criterion) {
    let mut group = c.benchmark_group("simple_parse");
    
    let queries = vec![
        ("match_return", "MATCH (n) RETURN n"),
        ("literal", "RETURN 42"),
        ("pattern", "MATCH (n:Person)-[e:KNOWS]->(m:Person) RETURN n, m"),
    ];
    
    for (name, query) in queries {
        group.bench_with_input(
            BenchmarkId::new("parse", name),
            &query,
            |b, &query| {
                b.iter(|| {
                    let tokens = lex(black_box(query)).unwrap();
                    parse(tokens).unwrap()
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_complex_parse(c: &mut Criterion) {
    let mut group = c.benchmark_group("complex_parse");
    
    let query = r#"
        MATCH (u:socialUser)-[e:weightedEdge]->(v:socialUser)
        WHERE e.Weight > 5 AND u.role = "bridge"
        RETURN u.name, v.name, e.Weight
        ORDER BY e.Weight DESC
        LIMIT 10
    "#;
    
    group.bench_function("full_query", |b| {
        b.iter(|| {
            let tokens = lex(black_box(query)).unwrap();
            parse(tokens).unwrap()
        });
    });
    
    group.finish();
}

criterion_group!(benches, benchmark_simple_parse, benchmark_complex_parse);
criterion_main!(benches);

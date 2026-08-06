use criterion::{black_box, criterion_group, criterion_main, Criterion};
use planner::QueryPlanner;
use parser::parse_query;

fn benchmark_plan_simple(c: &mut Criterion) {
    let planner = QueryPlanner::new(1000, 5000);
    let query = parse_query("MATCH (n) RETURN n").unwrap();
    
    c.bench_function("plan_simple", |b| {
        b.iter(|| {
            planner.plan(black_box(&query))
        });
    });
}

fn benchmark_plan_complex(c: &mut Criterion) {
    let planner = QueryPlanner::new(1000, 5000);
    let query = parse_query(
        "MATCH (u:socialUser)-[e:weightedEdge]->(v:socialUser) WHERE e.Weight > 5 RETURN u.name, v.name LIMIT 10"
    ).unwrap();
    
    c.bench_function("plan_complex", |b| {
        b.iter(|| {
            planner.plan(black_box(&query))
        });
    });
}

criterion_group!(benches, benchmark_plan_simple, benchmark_plan_complex);
criterion_main!(benches);

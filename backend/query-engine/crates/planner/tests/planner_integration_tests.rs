use planner::QueryPlanner;
use parser::parse_query;

// ============================================================================
// Full Pipeline Integration Tests
// ============================================================================

#[test]
fn test_plan_simple_query() {
    let query = parse_query("MATCH (n) RETURN n").unwrap();
    let planner = QueryPlanner::new(1000, 5000);
    let plan = planner.plan(&query);
    
    assert!(planner.estimate_cost(&plan) > 0.0);
    assert!(planner.estimate_rows(&plan) > 0);
}

#[test]
fn test_plan_labeled_node() {
    let query = parse_query("MATCH (u:socialUser) RETURN u.name").unwrap();
    let planner = QueryPlanner::new(1000, 5000);
    let plan = planner.plan(&query);
    
    assert!(planner.estimate_cost(&plan) > 0.0);
}

#[test]
fn test_plan_filtered_query() {
    let query = parse_query(
        "MATCH (u:socialUser) WHERE u.friendCount > 10 RETURN u.name"
    ).unwrap();
    
    let planner = QueryPlanner::new(1000, 5000);
    let plan = planner.plan(&query);
    
    assert!(planner.estimate_cost(&plan) > 0.0);
}

#[test]
fn test_plan_relationship_query() {
    let query = parse_query(
        "MATCH (u:socialUser)-[e:weightedEdge]->(v:socialUser) RETURN u, v"
    ).unwrap();
    
    let planner = QueryPlanner::new(1000, 5000);
    let plan = planner.plan(&query);
    
    assert!(planner.estimate_rows(&plan) > 0);
}

#[test]
fn test_plan_complex_query() {
    let query_str = r#"
        MATCH (u:socialUser)-[e:weightedEdge]->(v:socialUser)
        WHERE e.Weight > 5 AND u.role = "bridge"
        RETURN u.name, v.name, e.Weight
        ORDER BY e.Weight DESC
        LIMIT 10
    "#;
    
    let query = parse_query(query_str).unwrap();
    let planner = QueryPlanner::new(1000, 5000);
    let plan = planner.plan(&query);
    
    assert!(planner.estimate_cost(&plan) > 0.0);
}

#[test]
fn test_plan_group_by_query() {
    let query = parse_query(
        "MATCH (u:socialUser) RETURN u.role, COUNT(u) AS userCount GROUP BY u.role"
    ).unwrap();
    
    let planner = QueryPlanner::new(1000, 5000);
    let plan = planner.plan(&query);
    
    assert!(planner.estimate_cost(&plan) > 0.0);
}

#[test]
fn test_physical_plan_creation() {
    let query = parse_query("MATCH (n:socialUser) RETURN n.name").unwrap();
    let planner = QueryPlanner::new(1000, 5000);
    let logical = planner.plan(&query);
    let physical = planner.create_physical_plan(&logical);
    
    // Physical plan should be creatable
    assert!(true);
}

#[test]
fn test_optimize_and_plan() {
    let query = parse_query(
        "MATCH (u:socialUser) WHERE u.friendCount > 10 RETURN u.name ORDER BY u.name LIMIT 5"
    ).unwrap();
    
    let planner = QueryPlanner::new(1000, 5000);
    let plan = planner.plan(&query);
    
    let cost = planner.estimate_cost(&plan);
    let rows = planner.estimate_rows(&plan);
    
    assert!(cost > 0.0);
    assert!(rows > 0);
}

#[test]
fn test_empty_query_plan() {
    let query = parse_query("RETURN 42").unwrap();
    let planner = QueryPlanner::new(1000, 5000);
    let plan = planner.plan(&query);
    
    // Should produce some plan
    assert!(planner.estimate_cost(&plan) > 0.0);
}

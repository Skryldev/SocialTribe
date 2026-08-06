# 🕸️ Graph Query Engine

> A **production-ready, zero-copy graph query engine** written in Rust — parse, validate, plan, and optimize
> Cypher-inspired graph queries natively or via WebAssembly.

[![Rust](https://img.shields.io/badge/rust-%3E%3D1.70-orange)](https://rustup.rs)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![wasm-pack](https://img.shields.io/badge/wasm--pack-ready-green)](https://rustwasm.github.io/wasm-pack/)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Query Language Guide](#-query-language-guide)
- [Error Handling](#-error-handling)
- [AST Exploration](#-ast-exploration)
- [Planner & Optimizer](#-planner--optimizer)
- [WebAssembly Integration](#-webassembly-integration)
- [Advanced Usage](#-advanced-usage)
- [Performance](#-performance)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [API Reference](#-api-reference)

---

## 🎯 Overview

The graph query engine provides a **complete, modular pipeline** for processing graph queries:

```
Query String → Lexer → Parser → Semantic Analysis → Logical Plan → Optimizer → Physical Plan
```

Built on a **recursive descent parser**, it delivers:

- **Full Cypher-inspired syntax** — nodes, relationships, variable-length paths, and all major clauses
- **8-rule optimizer** — filter pushdown, constant folding, join reordering, and more
- **Zero-copy lexing** — minimal allocations, O(n) throughput
- **First-class WASM target** — run the entire pipeline in-browser or in Node.js
- **Detailed, located errors** — every `ParserError` carries a `SourceLocation` with line, column, and byte offset

---

## ✨ Features

1. **Recursive descent parser** — predictable performance, easy to extend, no external parser generators
2. **Full clause coverage** — `MATCH`, `OPTIONAL MATCH`, `WHERE`, `RETURN`, `WITH`, `ORDER BY`, `GROUP BY`,
   `HAVING`, `LIMIT`, `SKIP`, `CREATE`, `DELETE`, `SET`, `MERGE`, `UNWIND`, `CALL`
3. **Expressive path patterns** — directed, undirected, chained, and variable-length (`*1..5`) paths
4. **Rich expression support** — literals, variables, binary/unary ops, property access (`n.prop`),
   function calls (`COUNT`, `AVG`, `size`, etc.), list/map literals, `CASE` expressions
5. **Semantic validation** — type checking, undefined variable detection, and structured diagnostics
6. **8 optimization rules** — filter pushdown, projection pushdown, constant folding, predicate
   simplification, dead code elimination, join reordering, index selection, query caching
7. **Cost-based planning** — logical → optimized → physical plan with cardinality estimation
8. **WebAssembly bindings** — full pipeline exposed as `compile_query`, `explain_query`, `analyze_query`
   with JSON I/O and no-panic guarantees
9. **Full `serde` support** — AST and plan types serialize to/from JSON out of the box
10. **Located error messages** — `UnexpectedToken`, `UnexpectedEOF`, and `InvalidQuery` variants all
    include `{ line, column, offset }` for editor integration

---

## 🏗️ Architecture

### Crate Layout

| Crate | Responsibility |
|-------|----------------|
| `lexer` | Tokenizes input; emits `Token`s with `SourceLocation` |
| `parser` | Recursive descent; builds `Query` AST from `crate::ast::*` |
| `semantic` | Type checking, schema validation, diagnostic emission |
| `planner` | Logical planning, 8-rule optimization, physical plan generation |
| `wasm` | `#[wasm_bindgen]` exports; JSON bridge for JS/TS consumers |

### Data Flow

```
┌─────────────┐
│  Raw Query  │
└──────┬──────┘
       ▼
┌─────────────┐
│    Lexer    │  → Vec<Token> with SourceLocation
└──────┬──────┘
       ▼
┌─────────────┐
│   Parser    │  → Query (Vec<Clause>)
└──────┬──────┘
       ▼
┌─────────────┐
│  Semantic   │  → Diagnostics (errors / warnings)
└──────┬──────┘
       ▼
┌─────────────┐
│   Planner   │  → LogicalPlan
└──────┬──────┘
       ▼
┌─────────────┐
│  Optimizer  │  → Optimized LogicalPlan (8 rules)
└──────┬──────┘
       ▼
┌─────────────┐
│  Physical   │  → PhysicalPlan + cost / row estimates
└──────┬──────┘
       ▼
┌─────────────┐
│    WASM     │  → JSON response for JS/TS
└─────────────┘
```

---

## 🚀 Getting Started

### 📦 Prerequisites

- Rust **≥ 1.70** — install via [rustup](https://rustup.rs)
- `wasm-pack` *(only for WASM builds)*:
  ```bash
  curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
  ```

### ⚙️ Installation

**As a path dependency (monorepo / workspace):**
```toml
[dependencies]
graph-query-engine = { path = "../graph-query-engine" }
```

**Published crate (when available):**
```bash
cargo add graph-query-engine
```

### 🔧 Minimal Working Example

```rust
use graph_query_engine::{parse_query, validate_query, plan_query};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let query = "MATCH (u:User) WHERE u.age > 18 RETURN u.name ORDER BY u.name ASC LIMIT 10";

    let ast = parse_query(query)?;

    let diagnostics = validate_query(&ast);
    if diagnostics.has_errors() {
        eprintln!("Semantic errors: {:#?}", diagnostics);
        return Ok(());
    }

    let plan = plan_query(&ast, 10_000, 50_000);
    println!("{:#?}", plan);
    Ok(())
}
```

> **⚠️ Important:** Never call `.unwrap()` on `parse_query` in production. Propagate errors with `?`
> or match the `ParserError` variants explicitly — see [Error Handling](#-error-handling).

---

## 📖 Query Language Guide

Keywords are **case-insensitive**; identifiers and property names are **case-preserving**.

### Quick Syntax Reference

| Clause | Example | What it does |
|--------|---------|--------------|
| `MATCH` | `MATCH (n:User)-[r:KNOWS]->(m)` | Pattern match in the graph |
| `OPTIONAL MATCH` | `OPTIONAL MATCH (n)-[r]->(m)` | Left-outer match; nulls if no match |
| `WHERE` | `WHERE n.age > 18 AND n.active = true` | Filter rows |
| `RETURN` | `RETURN n.name, COUNT(*) AS total` | Project output columns |
| `WITH` | `WITH n, COUNT(r) AS degree WHERE degree > 5` | Pipeline / re-scope variables |
| `ORDER BY` | `ORDER BY n.centrality DESC` | Sort results |
| `GROUP BY` | `GROUP BY n.role` | Aggregate grouping key |
| `HAVING` | `HAVING COUNT(n) > 10` | Post-aggregation filter |
| `LIMIT` | `LIMIT 25` | Cap result rows |
| `SKIP` | `SKIP 50 LIMIT 25` | Pagination offset |
| `CREATE` | `CREATE (u:User {name: "Ali"})` | Insert node or relationship |
| `DELETE` | `DELETE r` | Remove node or relationship |
| `SET` | `SET n.active = true` | Update properties |
| `MERGE` | `MERGE (u:User {name: "Ali"})` | Upsert |
| `UNWIND` | `UNWIND [1, 2, 3] AS x` | Expand list into rows |
| `CALL` | `CALL pageRank()` | Invoke a procedure |

---

### Level 1 — Node Matching

```cypher
-- All nodes
MATCH (n) RETURN n

-- By label
MATCH (n:User) RETURN n

-- Multiple labels
MATCH (n:User:Admin) RETURN n

-- Inline property filter
MATCH (n:User {role: "admin", active: true}) RETURN n

-- Variable binding + property access
MATCH (user:User) RETURN user.name, user.age
```

---

### Level 2 — Filtering

```cypher
-- Comparison operators
MATCH (n:User) WHERE n.age > 18 RETURN n.name
MATCH (n:User) WHERE n.age >= 18 AND n.city = "Berlin" RETURN n.name
MATCH (n:User) WHERE n.age < 18 OR n.age > 65 RETURN n.name

-- String predicates
MATCH (n:User) WHERE n.name STARTS WITH "Ali" RETURN n.name
MATCH (n:User) WHERE n.email ENDS WITH ".com" RETURN n.name
MATCH (n:User) WHERE n.bio CONTAINS "engineer" RETURN n.name

-- Regex
MATCH (n:User) WHERE n.name =~ ".*Ali.*" RETURN n.name

-- IN operator
MATCH (n:User) WHERE n.role IN ["admin", "moderator"] RETURN n.name

-- NULL checks
MATCH (n:User) WHERE n.deletedAt IS NULL RETURN n.name
MATCH (n:User) WHERE n.verifiedAt IS NOT NULL RETURN n.name
```

---

### Level 3 — Relationship Patterns

```cypher
-- Directed
MATCH (n:User)-[e:KNOWS]->(m:User) RETURN n.name, m.name

-- Undirected
MATCH (n:User)-[r:KNOWS]-(m:User) RETURN n.name, m.name

-- Reverse direction
MATCH (n:User)<-[:FOLLOWS]-(m:User) RETURN n.name, m.name

-- Anonymous relationship type
MATCH (n)-[r]->(m) RETURN n, r, m

-- Omit relationship variable
MATCH (n:User)-[:KNOWS]->(m:User) RETURN n.name, m.name

-- Filter on relationship property
MATCH (s:User)-[e:weightedEdge]->(t:User)
WHERE e.Weight > 5
RETURN s.name, t.name, e.Weight
```

---

### Level 4 — Path Patterns

```cypher
-- Chained (2 hops)
MATCH (a)-[r1]->(b)-[r2]->(c) RETURN a.name, b.name, c.name

-- Variable-length: 1 to 3 hops
MATCH (s:User)-[:KNOWS*1..3]->(t:User) RETURN s, t

-- Exact 2 hops
MATCH (a)-[:KNOWS*2]->(b) RETURN a, b

-- At least 2 hops
MATCH (a)-[:KNOWS*2..]->(b) RETURN a, b

-- At most 5 hops
MATCH (a)-[:KNOWS*..5]->(b) RETURN a, b

-- Unbounded (use with care)
MATCH (a)-[:KNOWS*]->(b) RETURN a, b
```

> **⚠️ Important:** Unbounded paths (`*`) can cause exponential scan on dense graphs. Always apply a
> `WHERE` filter or `LIMIT` clause when using them in production.

---

### Level 5 — Aggregation & Grouping

```cypher
-- COUNT
MATCH (n:User)-[r]->() RETURN n.name, COUNT(r) AS degree

-- Multiple aggregations
MATCH (n:User)
RETURN n.role,
       COUNT(n)        AS userCount,
       AVG(n.friendCount) AS avgFriends,
       SUM(n.friendCount) AS totalFriends,
       MIN(n.centrality)  AS minCentrality,
       MAX(n.centrality)  AS maxCentrality
GROUP BY n.role

-- HAVING
MATCH (n:User)
RETURN n.city, COUNT(n) AS residents
GROUP BY n.city
HAVING residents > 5

-- DISTINCT
MATCH (n:User) RETURN DISTINCT n.role
```

---

### Level 6 — Sorting & Pagination

```cypher
-- Single key, descending
MATCH (n:User) RETURN n.name, n.centrality ORDER BY n.centrality DESC

-- Multi-key
MATCH (n:User) RETURN n.name, n.role, n.friendCount
ORDER BY n.role ASC, n.friendCount DESC

-- Expression sort key
MATCH (n:User) RETURN n.name, n.friendCount * n.centrality AS score
ORDER BY score DESC

-- Pagination
MATCH (n:User) RETURN n.name ORDER BY n.name ASC SKIP 20 LIMIT 10
```

---

### Level 7 — WITH (Pipeline)

```cypher
-- Post-aggregation filter
MATCH (n:User)-[r]->(m:User)
WITH n, COUNT(r) AS degree
WHERE degree > 5
RETURN n.name, degree

-- Multi-stage pipeline
MATCH (s:User)-[e:weightedEdge]->(t:User)
WITH s, t, e.Weight AS w
WHERE w > 5
WITH s, t, w
ORDER BY w DESC
RETURN s.name, t.name, w
LIMIT 10
```

---

### Level 8 — CASE Expressions

```cypher
-- Searched CASE in RETURN
MATCH (n:User)
RETURN n.name,
       CASE
           WHEN n.friendCount > 100 THEN "Highly Connected"
           WHEN n.friendCount > 50  THEN "Active"
           ELSE "Normal"
       END AS connectivity

-- Simple CASE (value matching)
MATCH (n:User)
RETURN n.name,
       CASE n.role
           WHEN "admin"     THEN "Administrator"
           WHEN "moderator" THEN "Moderator"
           ELSE "Member"
       END AS roleTitle

-- CASE in WHERE
MATCH (n:User)
WHERE CASE
    WHEN n.role = "admin"     THEN n.centrality > 0.8
    WHEN n.role = "moderator" THEN n.friendCount > 50
    ELSE TRUE
END
RETURN n.name, n.role
```

---

### Level 9 — Lists, Maps & UNWIND

```cypher
-- List literal
RETURN [1, 2, 3, 4, 5] AS numbers

-- Map literal in RETURN
MATCH (n:User)
RETURN {name: n.name, age: n.age, role: n.role} AS userMap

-- UNWIND: expand list into rows
UNWIND ["Alice", "Bob", "Charlie"] AS name
CREATE (u:User {name: name})
RETURN u

-- UNWIND with MATCH
MATCH (u:User)
WITH u, ["admin", "moderator", "editor"] AS privileged
UNWIND privileged AS role
WHERE u.role = role
RETURN u.name, u.role
```

---

### Level 10 — Data Manipulation (CREATE / DELETE / SET / MERGE)

```cypher
-- CREATE node
CREATE (u:User {name: "New User", age: 25, role: "member"})
RETURN u

-- CREATE relationship
MATCH (u1:User {name: "Alice"}), (u2:User {name: "Bob"})
CREATE (u1)-[e:KNOWS {since: 2024}]->(u2)
RETURN e

-- DELETE relationship
MATCH (u1:User)-[e:KNOWS]->(u2:User)
WHERE u1.name = "Alice" AND u2.name = "Bob"
DELETE e

-- SET properties
MATCH (u:User {name: "Alice"})
SET u.role = "admin",
    u.active = true,
    u.updatedAt = datetime()
RETURN u

-- MERGE (upsert)
MERGE (u:User {name: "Alice"})
ON CREATE SET u.role = "member",  u.createdAt = datetime()
ON MATCH  SET u.updatedAt = datetime()
RETURN u
```

---

### Level 11 — Advanced Graph Analytics

```cypher
-- Top influential users by centrality
MATCH (u:socialUser)
WHERE u.centrality > 0.7
RETURN u.name, u.centrality, u.friendCount
ORDER BY u.centrality DESC
LIMIT 10

-- Community analysis by role
MATCH (u:socialUser)
RETURN u.role,
       COUNT(u)            AS userCount,
       AVG(u.centrality)   AS avgCentrality,
       AVG(u.friendCount)  AS avgFriends
GROUP BY u.role
ORDER BY avgCentrality DESC

-- 2-hop ego-network extraction
MATCH (center:socialUser {name: "User 2"})-[e:weightedEdge]->(neighbor:socialUser)
WITH center, neighbor, e.Weight AS weight
OPTIONAL MATCH (neighbor)-[e2:weightedEdge]->(n2:socialUser)
WHERE e2.Weight > 3
RETURN center.name, neighbor.name, n2.name, weight, e2.Weight

-- Strong connections (bridge + high weight)
MATCH (s:socialUser)-[e:weightedEdge]->(t:socialUser)
WHERE s.role = "bridge" AND e.Weight > 5
RETURN s.name, t.name, e.Weight
ORDER BY e.Weight DESC
```

---

## 🧪 Error Handling

All parse errors implement `std::error::Error` via [`thiserror`](https://github.com/dtolnay/thiserror)
and carry a `SourceLocation { line, column, offset }`.

### Rust

```rust
use graph_query_engine::{parse_query, ParserError};

fn safe_parse(query: &str) -> Result<(), ParserError> {
    match parse_query(query) {
        Ok(ast) => {
            println!("AST: {:#?}", ast);
            Ok(())
        }
        Err(ParserError::UnexpectedToken { found, expected, location }) => {
            eprintln!(
                "Unexpected '{}' at {}:{} — expected {}",
                found, location.line, location.column, expected
            );
            Err(ParserError::UnexpectedToken { found, expected, location })
        }
        Err(ParserError::UnexpectedEOF { location }) => {
            eprintln!("Query ended unexpectedly at line {}", location.line);
            Err(ParserError::UnexpectedEOF { location })
        }
        Err(e) => {
            eprintln!("Parse error: {}", e);
            Err(e)
        }
    }
}
```

### Common Error Variants

| Variant | When it fires | Typical cause |
|---------|---------------|---------------|
| `UnexpectedToken { found, expected, location }` | Parser sees a token it didn't expect | Typo, missing keyword, wrong symbol |
| `UnexpectedEOF { location }` | Input ends mid-clause | Incomplete query |
| `InvalidQuery { message, location }` | Structural violation | Missing `RETURN`, unclosed pattern |

### WASM (JavaScript)

All WASM functions are no-panic. Errors surface as `{ success: false, errors: [...] }`:

```json
{
  "success": false,
  "errors": ["Parser error: Unexpected token '[' at line 1, column 16 — expected clause"]
}
```

Always check `parsed.success` before accessing `parsed.physical_plan` or `parsed.ast`:

```javascript
const result = JSON.parse(compile_query(query, 1000, 5000));
if (!result.success) {
  console.error("Query failed:", result.errors);
  return;
}
console.log("Physical plan:", result.physical_plan);
```

---

## 🔬 AST Exploration

The `Query` type is a `Vec<Clause>`. Traverse it to build custom backends, formatters, or analyzers:

```rust
use graph_query_engine::{parse_query, ast::{Clause, Expression, Pattern}};

fn walk(query_str: &str) -> Result<(), Box<dyn std::error::Error>> {
    let query = parse_query(query_str)?;

    for clause in &query.clauses {
        match clause {
            Clause::Match { patterns, optional } => {
                println!("MATCH (optional={optional}): {} patterns", patterns.len());
                for p in patterns {
                    inspect_pattern(p);
                }
            }
            Clause::Return { items, distinct } => {
                println!("RETURN (distinct={distinct}): {} projections", items.len());
            }
            Clause::Where { condition } => {
                println!("WHERE: {:#?}", condition);
            }
            // handle remaining variants ...
            _ => {}
        }
    }
    Ok(())
}

fn inspect_pattern(pattern: &Pattern) {
    match pattern {
        Pattern::Node { variable, labels, properties } => {
            println!("  Node variable={variable:?} labels={labels:?}");
        }
        Pattern::Relationship { variable, rel_type, range, .. } => {
            println!("  Rel type={rel_type:?} range={range:?}");
        }
        Pattern::Path { elements } => {
            println!("  Path with {} elements", elements.len());
        }
    }
}
```

The entire AST tree derives `serde::Serialize / Deserialize`, so you can also round-trip to JSON:

```rust
let json = serde_json::to_string_pretty(&query)?;
println!("{json}");
```

---

## 📐 Planner & Optimizer

```rust
use graph_query_engine::{parse_query, QueryPlanner, Optimizer};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let ast = parse_query(
        "MATCH (u:User) WHERE u.friendCount > 10 RETURN u.name"
    )?;

    // Supply cardinality hints for cost-based decisions
    let planner   = QueryPlanner::new(10_000, 50_000); // (node_count, edge_count)
    let logical   = planner.plan(&ast);
    let optimized = Optimizer::new().optimize(logical);
    let physical  = planner.create_physical_plan(&optimized);

    println!("Cost:  {}", planner.estimate_cost(&optimized));
    println!("Rows:  {}", planner.estimate_rows(&optimized));
    println!("Plan:  {:#?}", physical);
    Ok(())
}
```

### Optimization Rules

| # | Rule | Effect |
|---|------|--------|
| 1 | Filter Pushdown | Moves `WHERE` predicates closer to the scan |
| 2 | Projection Pushdown | Drops unused columns early |
| 3 | Constant Folding | Evaluates compile-time expressions |
| 4 | Predicate Simplification | Rewrites `AND TRUE` → identity, etc. |
| 5 | Dead Code Elimination | Removes unreachable plan nodes |
| 6 | Join Reordering | Orders joins by estimated selectivity |
| 7 | Index Selection | Picks optimal indexes for filter predicates |
| 8 | Query Caching | Caches results for repeated identical (sub-)queries |

---

## 🌐 WebAssembly Integration

### Build

```bash
cd crates/wasm
wasm-pack build --target web        # ES module for browsers
wasm-pack build --target nodejs     # CommonJS for Node.js
```

### Exported Functions

| Function | Parameters | Returns |
|----------|------------|---------|
| `compile_query(query, node_count, rel_count)` | Full pipeline | JSON with `physical_plan`, `estimated_cost` |
| `parse_query(query)` | Lex + parse only | JSON with `ast` |
| `lex_query(query)` | Lex only | JSON with `tokens` |
| `validate_query(query)` | Semantic check only | JSON with `diagnostics` |
| `plan_query(query, node_count, rel_count)` | Parse + plan | JSON with logical & physical plans |
| `explain_query(query, node_count, rel_count)` | All stages | JSON with full explain output |
| `analyze_query(query)` | Static analysis | JSON with optimization suggestions |
| `get_version()` | — | Engine version string |
| `init_panic_hook()` | — | Wires `console_error_panic_hook` |

### JavaScript / TypeScript

```javascript
import init, { compile_query, explain_query, get_version } from "./pkg/wasm.js";

await init();
console.log("Engine:", get_version());

const query = `
  MATCH (s:User)-[:KNOWS*1..3]->(t:User)
  WHERE s.name = "Alice"
  RETURN s.name, t.name, t.centrality
  ORDER BY t.centrality DESC
  LIMIT 10
`;

const result = JSON.parse(compile_query(query, 10_000, 50_000));
if (result.success) {
  console.log("Physical plan:", result.physical_plan);
  console.log("Estimated cost:", result.estimated_cost);
} else {
  console.error("Errors:", result.errors);
}
```

### React Integration

```jsx
import { useState, useEffect } from "react";
import init, { compile_query, get_version } from "./pkg/wasm.js";

export function QueryRunner() {
  const [ready, setReady]   = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState(null);

  useEffect(() => {
    init().then(() => setReady(true));
  }, []);

  const runQuery = (queryStr) => {
    const parsed = JSON.parse(compile_query(queryStr, 10_000, 50_000));
    if (parsed.success) {
      setResult(parsed);
      setError(null);
    } else {
      setError(parsed.errors.join("\n"));
      setResult(null);
    }
  };

  if (!ready) return <p>Loading engine ({get_version?.() ?? "..."})…</p>;

  return (
    <div>
      <button onClick={() => runQuery("MATCH (n:User) RETURN n.name LIMIT 5")}>
        Run Example
      </button>
      {error  && <pre style={{ color: "red" }}>{error}</pre>}
      {result && <pre>{JSON.stringify(result.physical_plan, null, 2)}</pre>}
    </div>
  );
}
```

---

## 🏎️ Advanced Usage

### Chained Pattern Composition

```cypher
-- Two independent paths in one MATCH
MATCH (a:User)-[r1:KNOWS]->(b:User)-[r2:FOLLOWS]->(c:User)
WHERE r1.since > 2022 AND r2.strength > 0.5
RETURN a.name, b.name, c.name

-- OPTIONAL MATCH for left-outer behavior
MATCH (u:User)
OPTIONAL MATCH (u)-[e:KNOWS]->(friend:User)
RETURN u.name, friend.name
```

### Sub-pipeline with WITH

```cypher
MATCH (n:User)-[r]->()
WITH n, COUNT(r) AS degree
WHERE degree > 10
WITH n, degree
ORDER BY degree DESC
LIMIT 5
RETURN n.name, degree
```

### Functions

```cypher
-- Built-in aggregates
RETURN COUNT(*), COUNT(DISTINCT n.role), SUM(n.age), AVG(n.centrality), MIN(n.age), MAX(n.age)

-- Scalar functions
RETURN size([1, 2, 3]) AS listSize
RETURN toString(42) AS str
RETURN toFloat("3.14") AS num
RETURN datetime() AS now

-- Graph functions
MATCH (n:User) WHERE degree(n) = 0 RETURN n.name   -- isolated nodes
```

### Full Query Capability Matrix

| Feature | Support | Example |
|---------|:-------:|---------|
| Node matching | ✅ | `MATCH (n:User)` |
| Relationship patterns | ✅ | `(n)-[r:KNOWS]->(m)` |
| Variable-length paths | ✅ | `(a)-[:KNOWS*1..5]->(b)` |
| WHERE / AND / OR / NOT | ✅ | `WHERE n.age > 18 AND NOT n.deleted` |
| String predicates | ✅ | `STARTS WITH`, `ENDS WITH`, `CONTAINS`, `=~` |
| IN / IS NULL | ✅ | `n.role IN ["admin"]` |
| Aggregation | ✅ | `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` |
| GROUP BY / HAVING | ✅ | `GROUP BY n.role HAVING COUNT(n) > 5` |
| ORDER BY / LIMIT / SKIP | ✅ | `ORDER BY n.age DESC LIMIT 10 SKIP 20` |
| DISTINCT | ✅ | `RETURN DISTINCT n.role` |
| CASE expressions | ✅ | `CASE WHEN … THEN … END` |
| Lists & Maps | ✅ | `[1,2,3]`, `{key: val}` |
| UNWIND | ✅ | `UNWIND list AS x` |
| CREATE / DELETE | ✅ | `CREATE (u:User {name: "Ali"})` |
| SET / MERGE | ✅ | `MERGE … ON CREATE SET … ON MATCH SET …` |
| WITH (pipeline) | ✅ | `WITH n, COUNT(r) AS degree WHERE degree > 5` |
| OPTIONAL MATCH | ✅ | Left-outer graph match |
| CALL | ✅ | `CALL pageRank()` |
| Regex | ✅ | `WHERE n.name =~ ".*Ali.*"` |

---

## ⚡ Performance

### Algorithmic Complexity

| Stage | Complexity | Notes |
|-------|-----------|-------|
| Lexing | O(n) | Single-pass, zero-copy |
| Parsing | O(n) | Recursive descent, no backtracking |
| Optimization | O(n log n) | Fixed 8-rule pass; bounded iterations |
| WASM overhead | ~2× native | Typical wasm-pack/JS boundary cost |

### Throughput (indicative)

- **Lexing**: ~100,000 tokens/sec
- **Parsing**: ~50,000 AST nodes/sec
- **Optimization**: ~10,000 plans/sec

---

## 🧪 Testing

```bash
# Run all tests
cargo test

# Run only parser tests
cargo test --lib parser::tests

# Run WASM tests (headless Firefox)
wasm-pack test --headless --firefox
```

### Writing Tests

```rust
#[cfg(test)]
mod tests {
    use graph_query_engine::parse_query;

    macro_rules! assert_parses {
        ($q:expr) => {
            assert!(parse_query($q).is_ok(), "Failed to parse: {}", $q);
        };
    }

    #[test]
    fn test_node_patterns() {
        assert_parses!("MATCH (n) RETURN n");
        assert_parses!("MATCH (n:User) RETURN n.name");
        assert_parses!("MATCH (n:User {active: true}) RETURN n");
    }

    #[test]
    fn test_variable_length_paths() {
        assert_parses!("MATCH (a)-[:KNOWS*1..3]->(b) RETURN a, b");
        assert_parses!("MATCH (a)-[:KNOWS*2]->(b) RETURN a, b");
        assert_parses!("MATCH (a)-[:KNOWS*..5]->(b) RETURN a, b");
    }

    #[test]
    fn test_aggregation() {
        assert_parses!(
            "MATCH (n:User) RETURN n.role, COUNT(n) AS c GROUP BY n.role HAVING c > 5"
        );
    }

    #[test]
    fn test_error_on_invalid_query() {
        assert!(parse_query("MATCH (n) WHERE").is_err());
        assert!(parse_query("RETURN").is_err());
    }
}
```

---

## 🤝 Contributing

### Recursive Descent Architecture

Each grammar rule maps 1-to-1 to a `parse_*` method on the `Parser` struct:

```
parse_query()
  └── parse_clause()          ← dispatches on the current token
        ├── parse_match()
        ├── parse_where()
        ├── parse_return()
        ├── parse_with()
        ├── parse_order_by()
        └── ...
```

Expressions follow the same pattern with precedence climbing inside `parse_expression()`.

### Adding a New Clause

1. **Lexer** — add a new keyword variant in `lexer/src/token.rs` and handle it in the tokenizer.
2. **AST** — add a variant to the `Clause` enum in `parser/src/ast.rs` (derive `Debug`, `Serialize`,
   `Deserialize`).
3. **Parser** — implement `parse_your_clause(&mut self) -> Result<Clause, ParserError>` and wire it
   into the `match` arm inside `parse_clause()`.
4. **Semantic** — extend the `SemanticAnalyzer` visitor if the clause introduces new scoping rules.
5. **Tests** — add at minimum one positive and one negative test case.

### Code Style

```bash
cargo fmt --all          # formatting
cargo clippy --all       # lints (fix all warnings before submitting)
cargo test --all         # full test suite must pass
```

---

## 📚 API Reference

Generate full docs locally:

```bash
cargo doc --open
```

Or publish to [docs.rs](https://docs.rs) by pushing a tagged release — docs.rs builds automatically.

### Core Types at a Glance

| Type | Description |
|------|-------------|
| `Query` | Top-level AST — wraps `Vec<Clause>` |
| `Clause` | Enum covering all 16 supported clauses |
| `Pattern` | `Node`, `Relationship`, or `Path` variant |
| `Expression` | Full expression tree (literals, ops, calls, CASE, …) |
| `SourceLocation` | `{ line: u32, column: u32, offset: usize }` |
| `ParserError` | `thiserror`-derived; always carries a `SourceLocation` |
| `LogicalPlan` | Tree of relational operators before optimization |
| `PhysicalPlan` | Execution-ready operator tree with access methods |
| `Diagnostics` | Collection of semantic errors and warnings |

---

## 📄 License

MIT — see [LICENSE](LICENSE).
# 📖 Social Network Graph Query Language

## Supported Clauses

| Clause | Example |
|--------|---------|
| MATCH | `MATCH (u:socialUser)` |
| MATCH + Relationship | `MATCH (u)-[e:weightedEdge]->(v)` |
| WHERE | `WHERE u.friendCount > 10` |
| WHERE + AND/OR | `WHERE u.role = "bridge" AND e.Weight > 5` |
| RETURN | `RETURN u.name, u.role, e.Weight` |
| ORDER BY | `ORDER BY u.centrality DESC` |
| LIMIT | `LIMIT 10` |
| GROUP BY | `GROUP BY u.role` |
| AS (alias) | `COUNT(u) AS userCount` |

## Supported Functions

| Function | Example |
|----------|---------|
| COUNT | `COUNT(u)` |
| SUM | `SUM(u.friendCount)` |
| AVG | `AVG(u.centrality)` |
| MIN | `MIN(u.avgDistance)` |
| MAX | `MAX(u.centrality)` |

## Supported Operators

| Operator | Example |
|----------|---------|
| = | `u.role = "bridge"` |
| > | `e.Weight > 5` |
| < | `u.friendCount < 10` |
| >= | `u.centrality >= 0.5` |
| <= | `u.avgDistance <= 3.0` |
| AND | `s.role = "bridge" AND e.Weight > 5` |
| OR | `u.role = "bridge" OR u.role = "influencer"` |

## Examples

### Node Analysis
MATCH (u:socialUser)
WHERE u.centrality > 0.5
RETURN u.name, u.centrality, u.friendCount
ORDER BY u.centrality DESC
LIMIT 10

### Relationship Analysis
MATCH (s:socialUser)-[e:weightedEdge]->(t:socialUser)
WHERE e.Weight > 5
RETURN s.name, t.name, e.Weight
ORDER BY e.Weight DESC

### Role-based Aggregation
MATCH (u:socialUser)
RETURN u.role,
       COUNT(u) AS userCount,
       AVG(u.centrality) AS avgCentrality
GROUP BY u.role
ORDER BY avgCentrality DESC

### Bridge Analysis
MATCH (s:socialUser)-[e:weightedEdge]->(t:socialUser)
WHERE s.role = "bridge" AND e.Weight > 5
RETURN s.name, t.name, e.Weight
ORDER BY e.Weight DESC

### Ego Network (1-hop)
MATCH (center:socialUser {name: "User 2"})-[e:weightedEdge]->(neighbor:socialUser)
RETURN neighbor.name, e.Weight
ORDER BY e.Weight DESC
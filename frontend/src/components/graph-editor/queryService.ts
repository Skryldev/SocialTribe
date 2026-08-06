interface Node {
  id: string;
  name: string;
  type: string;
  age: number;
  active: boolean;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface Database {
  nodes: Node[];
  edges: Edge[];
}

const mockDatabase: Database = {
  nodes: [
    { id: 'node-1', name: 'Alice', type: 'User', age: 25, active: true },
    { id: 'node-2', name: 'Bob', type: 'User', age: 30, active: true },
    { id: 'node-3', name: 'Charlie', type: 'User', age: 22, active: false },
    { id: 'node-4', name: 'Diana', type: 'User', age: 35, active: true },
    { id: 'node-5', name: 'Eve', type: 'User', age: 28, active: true },
    { id: 'node-6', name: 'Frank', type: 'User', age: 19, active: true },
    { id: 'node-7', name: 'Grace', type: 'User', age: 42, active: false },
    { id: 'node-8', name: 'Henry', type: 'User', age: 31, active: true },
    { id: 'node-9', name: 'Ivy', type: 'User', age: 26, active: true },
    { id: 'node-10', name: 'Jack', type: 'User', age: 29, active: true },
  ],
  edges: [
    { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'KNOWS' },
    { id: 'edge-2', source: 'node-2', target: 'node-3', type: 'KNOWS' },
    { id: 'edge-3', source: 'node-3', target: 'node-4', type: 'KNOWS' },
    { id: 'edge-4', source: 'node-4', target: 'node-5', type: 'KNOWS' },
    { id: 'edge-5', source: 'node-5', target: 'node-6', type: 'KNOWS' },
    { id: 'edge-6', source: 'node-6', target: 'node-7', type: 'KNOWS' },
    { id: 'edge-7', source: 'node-7', target: 'node-8', type: 'KNOWS' },
    { id: 'edge-8', source: 'node-8', target: 'node-9', type: 'KNOWS' },
    { id: 'edge-9', source: 'node-9', target: 'node-10', type: 'KNOWS' },
    { id: 'edge-10', source: 'node-10', target: 'node-1', type: 'KNOWS' },
  ],
};

interface ParsedPattern {
  nodes: { alias: string; label: string }[];
  edges: { alias: string; type: string }[];
}

interface ParsedWhere {
  alias: string;
  property: string;
  operator: string;
  value: any;
}

interface ParsedQuery {
  type: string;
  pattern: ParsedPattern | null;
  where: ParsedWhere | null;
  return: string[];
}

interface QueryResult {
  columns: string[];
  rows: any[];
}

interface FormattedResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
  timestamp: string;
}

class QueryEngine {
  db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  execute(query: string): FormattedResult {
    try {
      const normalized = this.normalizeQuery(query);
      const parsed = this.parse(normalized);
      this.validate(parsed);
      const result = this.executeQuery(parsed);
      return this.formatResult(result);
    } catch (error: any) {
      console.error('❌ Query execution failed:', error);
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  normalizeQuery(query: string): string {
    return query
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  parse(query: string): ParsedQuery {
    const result: ParsedQuery = {
      type: 'MATCH',
      pattern: null,
      where: null,
      return: [],
    };

    const matchRegex = /MATCH\s+(.+?)(?=\s+WHERE\s+|\s+RETURN\s+|$)/i;
    const matchMatch = query.match(matchRegex);
    if (matchMatch) {
      result.pattern = this.parsePattern(matchMatch[1].trim());
    }

    const whereRegex = /WHERE\s+(.+?)(?=\s+RETURN\s+|$)/i;
    const whereMatch = query.match(whereRegex);
    if (whereMatch) {
      result.where = this.parseWhere(whereMatch[1].trim());
    }

    const returnRegex = /RETURN\s+(.+)$/i;
    const returnMatch = query.match(returnRegex);
    if (returnMatch) {
      result.return = returnMatch[1].split(',').map((r: string) => r.trim());
    }

    return result;
  }

  parsePattern(pattern: string): ParsedPattern {
    const nodes: { alias: string; label: string }[] = [];
    const edges: { alias: string; type: string }[] = [];

    const nodeRegex = /\((\w+):(\w+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = nodeRegex.exec(pattern)) !== null) {
      nodes.push({
        alias: match[1],
        label: match[2],
      });
    }

    const edgeRegex = /-\[(\w+):(\w+)\]->/g;
    while ((match = edgeRegex.exec(pattern)) !== null) {
      edges.push({
        alias: match[1],
        type: match[2],
      });
    }

    return { nodes, edges };
  }

  parseWhere(condition: string): ParsedWhere | null {
    const regex = /(\w+)\.(\w+)\s*([><=!]+)\s*([\w.'"]+)/;
    const match = condition.match(regex);
    
    if (match) {
      const value = isNaN(Number(match[4])) ? match[4].replace(/['"]/g, '') : Number(match[4]);
      return {
        alias: match[1],
        property: match[2],
        operator: match[3],
        value: value,
      };
    }
    
    return null;
  }

  validate(parsed: ParsedQuery): void {
    if (!parsed.type) {
      throw new Error('Query type not specified');
    }
    if (!parsed.return || parsed.return.length === 0) {
      throw new Error('RETURN clause is required');
    }
  }

  executeQuery(parsed: ParsedQuery): QueryResult {
    let results = [...this.db.nodes];

    if (parsed.pattern && parsed.pattern.nodes.length > 0) {
      const labels = parsed.pattern.nodes.map((n: { alias: string; label: string }) => n.label);
      results = results.filter((node: Node) => labels.includes(node.type));
    }

    if (parsed.where) {
      results = this.applyWhere(results, parsed.where);
    }

    const columns = parsed.return;
    const rows = results.map((node: Node) => {
      const row: any = {};
      columns.forEach((col: string) => {
        if (col.includes('.')) {
          const [alias, prop] = col.split('.');
          if (alias === 'n') {
            row[col] = (node as any)[prop] !== undefined ? (node as any)[prop] : null;
          } else if (alias === 'm') {
            const edge = this.db.edges.find((e: Edge) => e.source === node.id);
            if (edge) {
              const targetNode = this.db.nodes.find((n: Node) => n.id === edge.target);
              row[col] = targetNode ? (targetNode as any)[prop] : null;
            } else {
              row[col] = null;
            }
          } else {
            row[col] = null;
          }
        } else {
          row[col] = (node as any)[col] !== undefined ? (node as any)[col] : null;
        }
      });
      return row;
    });

    return {
      columns: columns,
      rows: rows,
    };
  }

  applyWhere(nodes: Node[], condition: ParsedWhere): Node[] {
    return nodes.filter((node: Node) => {
      const value = (node as any)[condition.property];
      if (value === undefined) return false;

      switch (condition.operator) {
        case '>': return value > condition.value;
        case '<': return value < condition.value;
        case '>=': return value >= condition.value;
        case '<=': return value <= condition.value;
        case '=': return value === condition.value;
        case '!=': return value !== condition.value;
        default: return true;
      }
    });
  }

  formatResult(result: QueryResult): FormattedResult {
    return {
      columns: result.columns || [],
      rows: result.rows || [],
      rowCount: result.rows?.length || 0,
      executionTime: 0.15,
      timestamp: new Date().toISOString(),
    };
  }
}

const engine = new QueryEngine(mockDatabase);

export const executeQuery = async (query: string): Promise<FormattedResult> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return engine.execute(query);
};

export const getQueryHistory = async (): Promise<any[]> => {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return [];
};

interface QueryPlanResult {
  totalCost: number;
  planNodes: any[];
}

export const getQueryPlan = async (_query: string): Promise<QueryPlanResult> => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  
  return {
    totalCost: 125.5,
    planNodes: [
      {
        id: 'scan1',
        operation: 'NodeByLabelScan',
        label: 'User',
        estimatedCost: 50,
        estimatedRows: 1000,
        actualRows: 245,
        time: 0.05,
      },
      {
        id: 'project1',
        operation: 'Projection',
        columns: ['n.name', 'm.name'],
        estimatedCost: 125.5,
        estimatedRows: 89,
        actualRows: 89,
        time: 0.15,
      },
    ],
  };
};
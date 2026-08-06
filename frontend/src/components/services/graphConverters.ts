const cleanNodeForExport = (node: any, includeFullMetadata: boolean): any => {
  if (includeFullMetadata) return { ...node };
  return {
    id: node.id,
    type: node.type || 'socialUser',
    position: node.position || { x: 0, y: 0 },
    data: { ...node.data },
  };
};

const cleanEdgeForExport = (edge: any, includeFullMetadata: boolean): any => {
  if (includeFullMetadata) return { ...edge };
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type || 'weightedEdge',
    data: { ...edge.data },
  };
};

const escapeXml = (str: any): string => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const toJSONPretty = (nodes: any[], edges: any[], includeFullMetadata: boolean): string => {
  const processedNodes = nodes.map((n: any) => cleanNodeForExport(n, includeFullMetadata));
  const processedEdges = edges.map((e: any) => cleanEdgeForExport(e, includeFullMetadata));

  const payload: any = { nodes: processedNodes, edges: processedEdges };

  if (includeFullMetadata) {
    Object.assign(payload, {
      exportedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      version: '1.0.0',
    });
  }

  return JSON.stringify(payload, null, 2);
};

const toJSONMinified = (nodes: any[], edges: any[], includeFullMetadata: boolean): string => {
  const processedNodes = nodes.map((n: any) => cleanNodeForExport(n, includeFullMetadata));
  const processedEdges = edges.map((e: any) => cleanEdgeForExport(e, includeFullMetadata));

  const payload: any = { nodes: processedNodes, edges: processedEdges };

  if (includeFullMetadata) {
    Object.assign(payload, {
      exportedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      version: '1.0.0',
    });
  }

  return JSON.stringify(payload);
};

const toJSONLD = (nodes: any[], edges: any[], includeFullMetadata: boolean): string => {
  const processedNodes = nodes.map((n: any) => cleanNodeForExport(n, includeFullMetadata));
  const processedEdges = edges.map((e: any) => cleanEdgeForExport(e, includeFullMetadata));

  const graphData: any = {
    '@context': {
      schema: 'https://schema.org/',
      nodes: 'schema:ItemList',
      edges: 'schema:ItemList',
      id: '@id',
      name: 'schema:name',
      nodeType: 'schema:additionalType',
      position: 'schema:geo',
      type: '@type',
    },
    '@graph': [
      ...processedNodes.map((n: any) => ({
        '@id': n.id,
        '@type': n.type || 'Node',
        name: n.data?.name || n.id,
        nodeType: n.data?.nodeType || 'unknown',
        position: n.position,
        data: n.data,
      })),
      ...processedEdges.map((e: any) => ({
        '@id': e.id,
        '@type': e.type || 'Edge',
        source: e.source,
        target: e.target,
        data: e.data,
      })),
    ],
  };

  if (includeFullMetadata) {
    Object.assign(graphData, {
      exportedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });
  }

  return JSON.stringify(graphData, null, 2);
};

const toGraphML = (nodes: any[], edges: any[], includeFullMetadata: boolean): string => {
  const processedNodes = nodes.map((n: any) => cleanNodeForExport(n, includeFullMetadata));
  const processedEdges = edges.map((e: any) => cleanEdgeForExport(e, includeFullMetadata));

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';

  const nodeKeys = ['id', 'name', 'nodeType', 'role', 'friendCount', 'avgDistance', 'centrality'];
  nodeKeys.forEach((key: string) => {
    xml += `  <key id="${key}" for="node" attr.name="${key}" attr.type="string"/>\n`;
  });

  const edgeKeys = ['id', 'source', 'target', 'Weight', 'createdAt', 'targetId'];
  edgeKeys.forEach((key: string) => {
    xml += `  <key id="${key}" for="edge" attr.name="${key}" attr.type="string"/>\n`;
  });

  xml += '  <graph id="G" edgedefault="undirected">\n';

  processedNodes.forEach((n: any) => {
    xml += `    <node id="${escapeXml(n.id)}">\n`;
    xml += `      <data key="name">${escapeXml(n.data?.name || n.id)}</data>\n`;
    if (n.data?.nodeType) {
      xml += `      <data key="nodeType">${escapeXml(n.data.nodeType)}</data>\n`;
    }
    if (n.data?.role) {
      xml += `      <data key="role">${escapeXml(n.data.role)}</data>\n`;
    }
    if (n.data?.friendCount != null) {
      xml += `      <data key="friendCount">${n.data.friendCount}</data>\n`;
    }
    if (n.data?.avgDistance != null) {
      xml += `      <data key="avgDistance">${n.data.avgDistance}</data>\n`;
    }
    if (n.data?.centrality != null) {
      xml += `      <data key="centrality">${n.data.centrality}</data>\n`;
    }
    xml += '    </node>\n';
  });

  processedEdges.forEach((e: any) => {
    xml += `    <edge id="${escapeXml(e.id)}" source="${escapeXml(e.source)}" target="${escapeXml(e.target)}">\n`;
    if (e.data?.Weight != null) {
      xml += `      <data key="Weight">${e.data.Weight}</data>\n`;
    }
    if (e.data?.createdAt) {
      xml += `      <data key="createdAt">${escapeXml(e.data.createdAt)}</data>\n`;
    }
    if (e.data?.targetId) {
      xml += `      <data key="targetId">${escapeXml(e.data.targetId)}</data>\n`;
    }
    xml += '    </edge>\n';
  });

  xml += '  </graph>\n</graphml>';
  return xml;
};

const toGEXF = (nodes: any[], edges: any[], includeFullMetadata: boolean): string => {
  const processedNodes = nodes.map((n: any) => cleanNodeForExport(n, includeFullMetadata));
  const processedEdges = edges.map((e: any) => cleanEdgeForExport(e, includeFullMetadata));

  let gexf = '<?xml version="1.0" encoding="UTF-8"?>\n';
  gexf += '<gexf xmlns="http://www.gexf.net/1.3" version="1.3">\n';
  gexf += '  <graph mode="static" defaultedgetype="undirected">\n';

  gexf += '    <attributes class="node">\n';
  gexf += '      <attribute id="nodeType" title="Node Type" type="string"/>\n';
  gexf += '      <attribute id="role" title="Role" type="string"/>\n';
  gexf += '      <attribute id="friendCount" title="Friend Count" type="integer"/>\n';
  gexf += '      <attribute id="avgDistance" title="Avg Distance" type="double"/>\n';
  gexf += '      <attribute id="centrality" title="Centrality" type="double"/>\n';
  gexf += '    </attributes>\n';

  gexf += '    <attributes class="edge">\n';
  gexf += '      <attribute id="Weight" title="Weight" type="double"/>\n';
  gexf += '    </attributes>\n';

  gexf += '    <nodes>\n';
  processedNodes.forEach((n: any) => {
    gexf += `      <node id="${escapeXml(n.id)}" label="${escapeXml(n.data?.name || n.id)}">\n`;
    gexf += '        <attvalues>\n';
    if (n.data?.nodeType) {
      gexf += `          <attvalue for="nodeType" value="${escapeXml(n.data.nodeType)}"/>\n`;
    }
    if (n.data?.role) {
      gexf += `          <attvalue for="role" value="${escapeXml(n.data.role)}"/>\n`;
    }
    if (n.data?.friendCount != null) {
      gexf += `          <attvalue for="friendCount" value="${n.data.friendCount}"/>\n`;
    }
    if (n.data?.avgDistance != null) {
      gexf += `          <attvalue for="avgDistance" value="${n.data.avgDistance}"/>\n`;
    }
    if (n.data?.centrality != null) {
      gexf += `          <attvalue for="centrality" value="${n.data.centrality}"/>\n`;
    }
    gexf += '        </attvalues>\n';
    gexf += '      </node>\n';
  });
  gexf += '    </nodes>\n';

  gexf += '    <edges>\n';
  processedEdges.forEach((e: any) => {
    gexf += `      <edge id="${escapeXml(e.id)}" source="${escapeXml(e.source)}" target="${escapeXml(e.target)}">\n`;
    if (e.data?.Weight != null) {
      gexf += '        <attvalues>\n';
      gexf += `          <attvalue for="Weight" value="${e.data.Weight}"/>\n`;
      gexf += '        </attvalues>\n';
    }
    gexf += '      </edge>\n';
  });
  gexf += '    </edges>\n';

  gexf += '  </graph>\n</gexf>';
  return gexf;
};

const toCSVNodes = (nodes: any[], includeFullMetadata: boolean): string => {
  const processedNodes = nodes.map((n: any) => cleanNodeForExport(n, includeFullMetadata));

  const headers = ['id', 'type', 'position_x', 'position_y', 'name', 'nodeType'];
  const rows = processedNodes.map((n: any) => {
    const pos = n.position || { x: 0, y: 0 };
    return [
      n.id,
      n.type || 'socialUser',
      pos.x ?? 0,
      pos.y ?? 0,
      n.data?.name || '',
      n.data?.nodeType || '',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

const toCSVEdges = (edges: any[], includeFullMetadata: boolean): string => {
  const processedEdges = edges.map((e: any) => cleanEdgeForExport(e, includeFullMetadata));

  const headers = ['id', 'source', 'target', 'type', 'Weight'];
  const rows = processedEdges.map((e: any) => [
    e.id,
    e.source,
    e.target,
    e.type || 'weightedEdge',
    e.data?.Weight ?? 0,
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
};

const toCSVFull = (nodes: any[], edges: any[], includeFullMetadata: boolean): string => {
  const nodesCSV = toCSVNodes(nodes, includeFullMetadata);
  const edgesCSV = toCSVEdges(edges, includeFullMetadata);
  return `# NODES\n${nodesCSV}\n\n# EDGES\n${edgesCSV}`;
};

export const convertToFormat = (nodes: any[], edges: any[], format: string, includeFullMetadata: boolean = true): string => {
  const converters: any = {
    'json-pretty': toJSONPretty,
    'json-min': toJSONMinified,
    'json-ld': toJSONLD,
    'graphml': toGraphML,
    'gexf': toGEXF,
    'csv-nodes': (n: any[], _e: any[], m: boolean) => toCSVNodes(n, m),
    'csv-edges': (_n: any[], e: any[], m: boolean) => toCSVEdges(e, m),
    'csv-full': toCSVFull,
  };

  const converter = converters[format];
  if (!converter) {
    console.warn(`Unknown format: ${format}, falling back to JSON pretty`);
    return toJSONPretty(nodes, edges, includeFullMetadata);
  }

  return converter(nodes, edges, includeFullMetadata);
};

export const FORMAT_META: any = {
  'json-pretty': {
    ext: 'json',
    label: 'JSON (Pretty)',
    icon: 'FileJson',
    mime: 'application/json',
    category: 'json',
  },
  'json-min': {
    ext: 'json',
    label: 'JSON (Minified)',
    icon: 'FileJson',
    mime: 'application/json',
    category: 'json',
  },
  'json-ld': {
    ext: 'jsonld',
    label: 'JSON-LD',
    icon: 'Share2',
    mime: 'application/ld+json',
    category: 'json',
  },
  'graphml': {
    ext: 'graphml',
    label: 'GraphML',
    icon: 'Globe',
    mime: 'application/xml',
    category: 'xml',
  },
  'gexf': {
    ext: 'gexf',
    label: 'GEXF (Gephi)',
    icon: 'Globe',
    mime: 'application/xml',
    category: 'xml',
  },
  'csv-nodes': {
    ext: 'csv',
    label: 'CSV (Nodes)',
    icon: 'FileSpreadsheet',
    mime: 'text/csv',
    category: 'csv',
  },
  'csv-edges': {
    ext: 'csv',
    label: 'CSV (Edges)',
    icon: 'FileSpreadsheet',
    mime: 'text/csv',
    category: 'csv',
  },
  'csv-full': {
    ext: 'csv',
    label: 'CSV (Full)',
    icon: 'FileSpreadsheet',
    mime: 'text/csv',
    category: 'csv',
  },
};
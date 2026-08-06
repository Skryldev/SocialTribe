import {
  createNode,
  updateNode,
  deleteNode as sdkDeleteNode,
  createEdge,
  deleteEdge as sdkDeleteEdge,
} from '../../generated/sdk.gen';

// Helper
const extractData = <T>(response: { data?: T; error?: unknown }): T => {
  if (response.error) throw response.error;
  if (!response.data) throw new Error('No data returned');
  return response.data;
};

// ✅ همون signature های قبلی - کامپوننت‌ها بدون تغییر کار می‌کنن
export async function patchNode(nodeId: string, updates: any): Promise<any> {
  const response = await updateNode({ path: { node_id: nodeId }, body: updates });
  return extractData(response);
}

export async function postNode(node: any): Promise<any> {
  const response = await createNode({ body: node });
  return extractData(response);
}

export async function deleteNode(nodeId: string): Promise<any> {
  const response = await sdkDeleteNode({ path: { node_id: nodeId } });
  return extractData(response);
}

export async function postEdge(edge: any): Promise<any> {
  const response = await createEdge({ body: edge });
  return extractData(response);
}

export async function deleteEdge(edgeId: string): Promise<any> {
  const response = await sdkDeleteEdge({ path: { edge_id: edgeId } });
  return extractData(response);
}
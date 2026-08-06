import { SocialUserNode } from "../components/ui/CustomUserNode";
import { CustomWeightedEdge } from '../components/ui/CustomWeightedEdge';

export const nodeTypes: any = {
  socialUser: SocialUserNode,
};

export const edgeTypes: any = {
  weightedEdge: CustomWeightedEdge,
};

export const initialNodes: any[] = [
  // {
  //   id: 'u1',
  //   type: 'socialUser',
  //   position: { x: 0, y: 0 },
  //   data: {
  //     label: "Server A",
  //     type: "server",
  //     id: 'u1',
  //     name: 'Alice',
  //     friendCount: 42,
  //     avgDistance: 2.34,
  //     centrality: 0.82,
  //     onUserUpdate: (id, updates) => console.log('Update', id, updates),
  //     onFriendSuggest: (id) => console.log('Suggest for', id),
  //     onShortestPath: (srcId) => console.log('Shortest path from', srcId),
  //     onDelete: (id) => console.log('Delete', id),
  //   },
  // },
  // {
  //   id: 'u2',
  //   type: 'socialUser',
  //   position: { x: 100, y: 100 },
  //   data: {
  //     id: 'u2',
  //     name: 'Bob',
  //     friendCount: 17,
  //     centrality: 0.41,
  //     avgDistance: 2.34
  //   },
  // },
];

export const initialEdges: any[] = [
  // { id: 'e1-2', source: 'u1', target: 'u2', animated: true }
];
import {
  getViewport,
} from '../../generated/sdk.gen';

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

interface RFViewport {
  x: number;
  y: number;
  zoom: number;
}

interface Direction {
  dx: number;
  dy: number;
}

// ============================================================
// Helper
// ============================================================
const extractData = <T>(response: { data?: T; error?: unknown }): T => {
  if (response.error) throw response.error;
  if (!response.data) throw new Error('No data returned');
  return response.data;
};

// ============================================================
// Core API Functions (همان signature های قبلی)
// ============================================================
export async function fetchViewportGraph(
  viewport: Viewport,
  signal?: AbortSignal
): Promise<any> {
  try {
    const response = await getViewport({
      body: {
        x: viewport.x,
        y: viewport.y,
        width: viewport.width,
        height: viewport.height,
        zoom: viewport.zoom,
      },
      signal,
    });
    return extractData(response);
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.includes('cancel')) {
      throw new Error('Request cancelled');
    }
    console.error('[ViewportAPI] ❌ Viewport fetch failed:', error.message);
    throw error;
  }
}

// ============================================================
// Utility Functions (بدون تغییر)
// ============================================================
export function buildViewportQuery(
  rfViewport: RFViewport,
  containerWidth: number,
  containerHeight: number,
  overscan: number = 0.5
): Viewport {
  const { x, y, zoom } = rfViewport;

  const graphWidth = containerWidth / zoom;
  const graphHeight = containerHeight / zoom;
  const graphX = -x / zoom;
  const graphY = -y / zoom;

  const padX = graphWidth * overscan;
  const padY = graphHeight * overscan;

  const query = {
    x: graphX - padX,
    y: graphY - padY,
    width: graphWidth + padX * 2,
    height: graphHeight + padY * 2,
    zoom,
  };

  return query;
}

export function buildPrefetchQueries(
  _baseQuery: Viewport,
  _direction: Direction
): Viewport[] {
  return [];
}
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

import App from './App.jsx';
import DashboardPage from './components/dashboard/DashboardPage.js';
import NotFound from './components/pages/NotFound.js';
import CommunityDetection from './components/community/CommunityDetection';
import Benchmark from "./components/benchmark/Benchmark";
// import FrontendTerminal from './components/features/FrontendTerminal';

import { NetworkProvider } from './components/dashboard/NetworkContext.js';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './components/ui/queryConfig.js';
import FloatingSidebar from './components/ui/FloatingSidebar.js';
import GraphStudio from './components/graph-editor/GraphStudio.js';

import { Titlebar } from './components/Titlebar.jsx';
import { Toaster } from 'sonner';

interface SidebarItem {
  id: string;
  label: string;
  desc: string;
  path: string;
  component: React.ComponentType<any>;
  badge: any;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", desc: "Network stats at a glance", path: "/dashboard", component: DashboardPage, badge: null },
  { id: "graph-editor", label: "Graph Editor", desc: "Add nodes, edges & friends", path: "/graph-editor", component: App, badge: null },
  { id: "communities", label: "User Groups", desc: "Components & reach distances", path: "/communities", component: CommunityDetection, badge: null },
  // { id: "terminal", label: "Terminal", desc: "Centrality & bridge nodes", path: "/terminal", component: FrontendTerminal, badge: null },
  { id: "documentation", label: "Documentation", desc: "Optimal viral spread seeds", path: "/documentation", component: Benchmark, badge: null },
  { id: "graph-studio", label: "Graph Studio", desc: "Storage Managerment", path: "/graph-studio", component: GraphStudio, badge: null },
];

function MainLayout(): React.ReactElement {
  const navigate = useNavigate();
  
  const handleNavigate = (itemId: string): void => {
    const item = SIDEBAR_ITEMS.find(i => i.id === itemId);
    if (item) {
      navigate(item.path);
    } else {
      navigate('/graph-editor');
    }
  };
  
  const isTauriApp: boolean = false;
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      overflow: 'hidden',
      position: 'relative' 
    }}>
      <Toaster position="top-right" richColors closeButton />
      
      {isTauriApp && <Titlebar appName="Social Tribe" />}
      
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        position: 'relative',
        overflow: 'hidden'
      }}>
        <FloatingSidebar 
          sidebarItems={SIDEBAR_ITEMS} 
          onNavigate={handleNavigate}
        />
        <div style={{ 
          flex: 1, 
          marginLeft: 0,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Routes>
            {SIDEBAR_ITEMS.map((item) => (
              <Route key={item.id} path={item.path} element={<item.component />} />
            ))}
            <Route path="/" element={<App />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>
        <NetworkProvider>
          <MainLayout />
        </NetworkProvider>
      </ReactFlowProvider>
    </QueryClientProvider>
  </BrowserRouter>
);
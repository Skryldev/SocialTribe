import React, { useCallback, useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Button,
  Tooltip,
  Typography,
  LinearProgress,
  Menu,
  MenuItem,
  Divider,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add,
  Close,
  MoreVert,
  History,
  Terminal,
  Edit,
  FileCopy,
  DeleteOutlined,
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import { toast } from 'sonner';
import { useQueryStore } from './queryStore';
import QueryToolbar from './QueryToolbar';
import RenameTabDialog from './RenameTabDialog';

interface TabData {
  id: string;
  title: string;
  query: string;
  isDirty: boolean;
  createdAt: number;
}

interface TabLabelProps {
  tab: TabData;
  isActive: boolean;
  onMenuClick: (e: React.MouseEvent, tabId: string | undefined) => void;
  onClose: (tabId: string) => void;
  isLastTab: boolean;
}

const TabLabel = ({ tab, isActive, onMenuClick, onClose, isLastTab }: TabLabelProps): React.ReactElement => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, height: '100%' }}>
    <Typography
      variant="caption"
      sx={{
        fontSize: 12,
        fontWeight: isActive ? 600 : 400,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 100,
        userSelect: 'none',
      }}
    >
      {tab.title}
    </Typography>
    
    {tab.isDirty && (
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0 }} />
    )}
    
    <Box
      component="span"
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMenuClick(e, tab.id); }}
      sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: '50%', cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' }, flexShrink: 0,
      }}
    >
      <MoreVert sx={{ fontSize: 14, color: 'text.secondary' }} />
    </Box>
    
    <Box
      component="span"
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); if (!isLastTab) onClose(tab.id); }}
      sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: '50%',
        cursor: isLastTab ? 'not-allowed' : 'pointer',
        opacity: isLastTab ? 0.3 : 0.5,
        '&:hover': {
          bgcolor: isLastTab ? 'transparent' : 'action.hover',
          opacity: isLastTab ? 0.3 : 1,
        },
        flexShrink: 0,
      }}
    >
      <Close sx={{ fontSize: 14, color: isLastTab ? 'text.disabled' : 'text.secondary' }} />
    </Box>
  </Box>
);

interface QueryEditorProps {
  queryTabs: TabData[];
  activeTabId: string | null;
  activeTab: TabData | null;
  isExecuting: boolean;
  wasmReady: boolean;
  wasmVersion: string;
  queryCount: number;
  queryHistory: any[];
  onTabChange: (tabId: string) => void;
  onTabAdd: () => void;
  onTabClose: (tabId: string) => void;
  onContentChange: (tabId: string, content: string) => void;
  onEditorMount: (editor: any, monaco: any) => void;
  onExecute: () => void;
  onExplain: () => void;
  onFormat: () => void;
  onHistoryOpen: (event: React.MouseEvent<HTMLElement>) => void;
  isExecuteDisabled: boolean;
}

const QueryEditor = ({
  queryTabs,
  activeTabId,
  activeTab,
  isExecuting,
  wasmReady,
  wasmVersion,
  queryCount,
  queryHistory,
  onTabChange,
  onTabAdd,
  onTabClose,
  onContentChange,
  onEditorMount,
  onExecute,
  onExplain,
  onFormat,
  onHistoryOpen,
  isExecuteDisabled,
}: QueryEditorProps): React.ReactElement => {
  const theme = useTheme();
  const [tabMenuAnchor, setTabMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedTabForMenu, setSelectedTabForMenu] = useState<string | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [tabToRename, setTabToRename] = useState<{ id: string; title: string } | null>(null);

  const handleTabMenuOpen = useCallback((event: React.MouseEvent, tabId: string | undefined) => {
    if (!tabId) return;
    setTabMenuAnchor(event.currentTarget as HTMLElement);
    setSelectedTabForMenu(tabId);
  }, []);
  
  const handleTabMenuClose = useCallback(() => {
    setTabMenuAnchor(null);
    setSelectedTabForMenu(null);
  }, []);
  
  const handleDuplicateTab = useCallback(() => {
    if (!activeTab) return;
    const newId = `tab-${Date.now()}`;
    useQueryStore.setState({
      queryTabs: [...queryTabs, { ...activeTab, id: newId, title: `${activeTab.title} (copy)`, createdAt: Date.now() }],
      activeTabId: newId,
    });
    toast.success('Tab duplicated', { duration: 1500, icon: '📋' });
    handleTabMenuClose();
  }, [activeTab, queryTabs, handleTabMenuClose]);
  
  const handleRenameTabClick = useCallback(() => {
    if (!activeTab) return;
    setTabToRename({ id: activeTab.id, title: activeTab.title });
    setIsRenameDialogOpen(true);
    handleTabMenuClose();
  }, [activeTab, handleTabMenuClose]);

  const handleRenameSubmit = useCallback((newTitle: string) => {
    if (!tabToRename || !newTitle.trim()) return;
    
    useQueryStore.setState({
      queryTabs: queryTabs.map((tab: TabData) =>
        tab.id === tabToRename.id ? { ...tab, title: newTitle } : tab
      ),
    });
    
    toast.success('Tab renamed successfully', { 
      duration: 2000, 
      icon: '✏️' 
    });
    
    setTabToRename(null);
  }, [tabToRename, queryTabs]);
  
  const handleRenameDialogClose = useCallback(() => {
    setIsRenameDialogOpen(false);
    setTabToRename(null);
  }, []);
  
  const handleCloseTab = useCallback((tabId: string) => {
    if (queryTabs.length <= 1) {
      toast.warning('Cannot close the last tab');
      return;
    }
    onTabClose(tabId);
    toast.info('Tab closed', { duration: 1500, icon: '🗑️' });
  }, [queryTabs.length, onTabClose]);
  
  const handleAddTab = useCallback(() => {
    onTabAdd();
    toast.success('New query tab created', { duration: 2000, icon: '📄' });
  }, [onTabAdd]);
  
  const renderTabBar = () => (
    <Box sx={{
      display: 'flex', alignItems: 'center', borderBottom: 1,
      borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0, minHeight: 40,
    }}>
      <Tabs
        value={activeTabId || false}
        onChange={(_: React.SyntheticEvent, newValue: string) => onTabChange(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40, flex: 1,
          '& .MuiTab-root': { minHeight: 40, py: 0, px: 1, textTransform: 'none', minWidth: 'auto' },
          '& .Mui-selected': { fontWeight: 600, color: theme.palette.warning.main },
        }}
      >
        {queryTabs.map((tab: TabData) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={
              <TabLabel
                tab={tab}
                isActive={activeTabId === tab.id}
                onMenuClick={handleTabMenuOpen}
                onClose={handleCloseTab}
                isLastTab={queryTabs.length <= 1}
              />
            }
          />
        ))}
      </Tabs>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1 }}>
        <Tooltip title="New Query Tab (Ctrl+T)">
          <IconButton size="small" onClick={handleAddTab} sx={{ p: 0.5, color: 'text.secondary' }}>
            <Add fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Query History">
          <IconButton size="small" onClick={onHistoryOpen} sx={{ p: 0.5, color: 'text.secondary' }}>
            <Badge
              badgeContent={queryHistory?.length || 0}
              color="warning"
              max={99}
              sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16, bgcolor: theme.palette.warning.main } }}
            >
              <History fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
  
  const renderEditor = () => (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
      {activeTab ? (
        <Editor
          height="100%"
          language="graphquery"
          value={activeTab.query}
          onChange={(value: string | undefined) => onContentChange(activeTab.id, value || '')}
          theme="vs-dark"
          onMount={onEditorMount}
          options={{
            fontSize: 14,
            fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
            minimap: { enabled: false },
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            bracketPairColorization: { enabled: true },
            matchBrackets: 'always',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderWhitespace: 'selection',
            fontLigatures: true,
          }}
          loading={
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
              <LinearProgress sx={{ width: 200 }} />
              <Typography variant="caption" color="text.secondary">Loading editor...</Typography>
            </Box>
          }
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
          <Terminal sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary">No query tabs open</Typography>
          <Button
            variant="outlined" size="small"
            startIcon={<Add />}
            onClick={handleAddTab}
            sx={{
              borderColor: alpha(theme.palette.warning.main, 0.3),
              color: theme.palette.warning.main,
              '&:hover': { borderColor: theme.palette.warning.main, bgcolor: alpha(theme.palette.warning.main, 0.05) },
            }}
          >
            Create new query
          </Button>
        </Box>
      )}
    </Box>
  );
  
  const renderTabMenu = () => (
    <Menu
      anchorEl={tabMenuAnchor}
      open={Boolean(tabMenuAnchor)}
      onClose={handleTabMenuClose}
      slotProps={{
        paper: {
          sx: {
            minWidth: 200, py: 0.5, bgcolor: 'background.paper',
            border: '1px solid', borderColor: 'divider', borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          },
        },
      }}
    >
      <MenuItem onClick={handleRenameTabClick} dense sx={{ '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.08) } }}>
        <Edit sx={{ fontSize: 16, mr: 1.5, color: 'text.secondary' }} />
        Rename
      </MenuItem>
      <MenuItem onClick={handleDuplicateTab} dense sx={{ '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.08) } }}>
        <FileCopy sx={{ fontSize: 16, mr: 1.5, color: 'text.secondary' }} />
        Duplicate
      </MenuItem>
      <Divider sx={{ borderColor: 'divider' }} />
      <MenuItem
        onClick={() => {
          if (selectedTabForMenu) handleCloseTab(selectedTabForMenu);
          handleTabMenuClose();
        }}
        dense
        disabled={queryTabs.length <= 1}
        sx={{ color: 'error.main', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) } }}
      >
        <DeleteOutlined sx={{ fontSize: 16, mr: 1.5 }} />
        Close Tab
      </MenuItem>
    </Menu>
  );
  
  return (
    <>
      {renderTabBar()}
      <QueryToolbar
        isExecuting={isExecuting}
        wasmReady={wasmReady}
        wasmVersion={wasmVersion}
        queryCount={queryCount}
        isExecuteDisabled={isExecuteDisabled}
        hasActiveQuery={!!activeTab?.query?.trim()}
        onExecute={onExecute}
        onExplain={onExplain}
        onFormat={onFormat}
        onTabMenuOpen={handleTabMenuOpen}
        activeTabId={activeTab?.id}
      />
      {renderEditor()}
      {renderTabMenu()}
      <RenameTabDialog
        isOpen={isRenameDialogOpen}
        onClose={handleRenameDialogClose}
        currentTitle={tabToRename?.title || ''}
        onRename={handleRenameSubmit}
      />
    </>
  );
};

export default QueryEditor;
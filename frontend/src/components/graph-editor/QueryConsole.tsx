import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { Box, Paper, LinearProgress, alpha, useTheme } from '@mui/material';
import { toast } from 'sonner';
import { useQueryStore } from './queryStore.js';
import { useConsoleStore } from './consoleStore';
import init, { get_version } from '../../pkg/wasm.js';
import QueryEditor from './QueryEditor';
import { HistoryPanel } from './HistoryPanel';
import { useQueryEngine } from './useQueryEngine.js';

import { loader } from '@monaco-editor/react';

loader.init().then((monaco: any) => {
  monaco.languages.register({ id: 'graphquery' });
  monaco.languages.setMonarchTokensProvider('graphquery', {
    keywords: [
      'MATCH', 'WHERE', 'RETURN', 'FIND', 'NODE', 'EDGE', 'DEGREE',
      'CREATE', 'DELETE', 'SET', 'MERGE', 'WITH', 'AS', 'ORDER', 'BY',
      'ASC', 'DESC', 'LIMIT', 'SKIP', 'AND', 'OR', 'NOT', 'IN',
      'CONTAINS', 'STARTS', 'ENDS', 'IS', 'NULL', 'TRUE', 'FALSE',
      'INDEX', 'ON', 'DETACH', 'REMOVE', 'OPTIONAL',
    ],
    operators: ['=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=', '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%'],
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    tokenizer: {
      root: [
        [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
        [/'/, { token: 'string.quote', bracket: '@open', next: '@stringSingle' }],
      ],
      string: [[/[^\\"]+/, 'string'], [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]],
      stringSingle: [[/[^\\']+/, 'string'], [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }]],
    },
  });
});

const QueryConsole = (): React.ReactElement => {
  const theme = useTheme();
  
  const {
    queryTabs,
    activeTabId,
    isExecuting,
    setActiveTab,
    addQueryTab,
    closeQueryTab,
    updateQueryContent,
    queryHistory,
  } = useQueryStore() as any;
  
  const { addLog } = useConsoleStore() as any;
  
  const [wasmReady, setWasmReady] = useState<boolean>(false);
  const [wasmVersion, setWasmVersion] = useState<string>('');
  const [historyAnchorEl, setHistoryAnchorEl] = useState<HTMLElement | null>(null);
  const editorRef = useRef<any>(null);
  
  useEffect(() => {
    (async () => {
      try {
        await init();
        const version = get_version();
        setWasmReady(true);
        setWasmVersion(version);
        console.log('✅ WASM loaded successfully. Version:', version);
        addLog('INFO', `WASM engine loaded (v${version})`, 'system');
        toast.success('Query engine (Wasm) loaded', { duration: 1000});
      } catch (error: any) {
        console.error('❌ Failed to initialize WASM:', error);
        addLog('ERROR', `Failed to load WASM engine: ${error.message}`, 'system');
        toast.error('Failed to load query engine');
      }
    })();
  }, [addLog]);
  
  const activeTab = useMemo(() => {
    if (!queryTabs.length) {
      addQueryTab();
      return queryTabs[0];
    }
    return queryTabs.find((t: any) => t.id === activeTabId) || queryTabs[0];
  }, [queryTabs, activeTabId, addQueryTab]);
  
  const queryCount = queryTabs.length;
  
  const {
    handleExecute,
    handleExplain,
    handleFormat,
    isExecuteDisabled,
  } = useQueryEngine({
    activeTab,
    isExecuting,
    wasmReady,
    addLog,
    editorRef,
  });
  
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    
    editor.addAction({
      id: 'execute-query',
      label: 'Execute Query',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: handleExecute,
    });
    
    editor.addAction({
      id: 'format-query',
      label: 'Format Query',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: handleFormat,
    });
  }, [handleExecute, handleFormat]);
  
  const handleHistoryOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setHistoryAnchorEl(event.currentTarget);
  }, []);
  
  const handleHistoryClose = useCallback(() => {
    setHistoryAnchorEl(null);
  }, []);
  
  const handleHistoryItemClick = useCallback((query: string) => {
    if (activeTab) {
      updateQueryContent(activeTab.id, query);
      toast.info('Query loaded from history', { duration: 1500, icon: '📜' });
    }
    handleHistoryClose();
  }, [activeTab, updateQueryContent, handleHistoryClose]);
  
  return (
    <Paper sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      bgcolor: 'background.default',
      position: 'relative',
    }}>
      <QueryEditor
        queryTabs={queryTabs}
        activeTabId={activeTabId}
        activeTab={activeTab}
        isExecuting={isExecuting}
        wasmReady={wasmReady}
        wasmVersion={wasmVersion}
        queryCount={queryCount}
        queryHistory={queryHistory}
        onTabChange={setActiveTab}
        onTabAdd={addQueryTab}
        onTabClose={closeQueryTab}
        onContentChange={updateQueryContent}
        onEditorMount={handleEditorMount}
        onExecute={handleExecute}
        onExplain={handleExplain}
        onFormat={handleFormat}
        onHistoryOpen={handleHistoryOpen}
        isExecuteDisabled={isExecuteDisabled}
      />
      
      {isExecuting && (
        <LinearProgress sx={{
          height: 2,
          flexShrink: 0,
          bgcolor: alpha(theme.palette.warning.main, 0.1),
          '& .MuiLinearProgress-bar': {
            bgcolor: theme.palette.warning.main,
            transition: 'transform 0.3s ease',
          },
        }} />
      )}
      
      <HistoryPanel
        open={Boolean(historyAnchorEl)}
        anchorEl={historyAnchorEl}
        onClose={handleHistoryClose}
        history={queryHistory}
        onItemClick={handleHistoryItemClick}
      />
      
      <Box component="style" dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      ` }} />
    </Paper>
  );
};

export default QueryConsole;
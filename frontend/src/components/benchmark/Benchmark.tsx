import React, { useState, useCallback, useMemo } from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import { algorithmData } from './algorithmData';
import { benchmarkData } from './benchmarkData';
import './index.css';

const Benchmark = (): React.ReactElement => {
  const [selectedAlgorithmKey, setSelectedAlgorithmKey] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareAlgorithmKey, setCompareAlgorithmKey] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['graph']);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

const handleAlgorithmSelect = useCallback((algorithmKey: string | null) => {
  if (!algorithmKey) return; // null رو مدیریت کن
  
  if (compareMode) {
    if (algorithmKey === selectedAlgorithmKey) return;
    setCompareAlgorithmKey(algorithmKey);
  } else {
    setSelectedAlgorithmKey(algorithmKey);
  }
}, [compareMode, selectedAlgorithmKey]);

  const toggleCompareMode = useCallback(() => {
    if (compareMode) {
      setCompareMode(false);
      setCompareAlgorithmKey(null);
    } else {
      setCompareMode(true);
      setCompareAlgorithmKey(null);
    }
  }, [compareMode]);

  const currentAlgorithm = useMemo(() => 
    selectedAlgorithmKey ? algorithmData[selectedAlgorithmKey] : null,
    [selectedAlgorithmKey]
  );

  const compareAlgorithm = useMemo(() => 
    compareAlgorithmKey ? algorithmData[compareAlgorithmKey] : null,
    [compareAlgorithmKey]
  );

  const currentBenchmark = useMemo(() => 
    selectedAlgorithmKey ? benchmarkData[selectedAlgorithmKey as keyof typeof benchmarkData] : null,
    [selectedAlgorithmKey]
  );
  
  const compareBenchmark = useMemo(() => 
    compareAlgorithmKey ? benchmarkData[compareAlgorithmKey as keyof typeof benchmarkData] : null,
    [compareAlgorithmKey]
  );

  return (
    <div className="app">
      <Sidebar
        algorithmData={algorithmData}
        selectedAlgorithm={selectedAlgorithmKey}
        compareAlgorithm={compareAlgorithmKey}
        onSelect={handleAlgorithmSelect}
        compareMode={compareMode}
        expandedCategories={expandedCategories}
        setExpandedCategories={setExpandedCategories}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev: boolean) => !prev)}
      />
      <MainContent
        algorithm={currentAlgorithm}
        compareAlgorithm={compareAlgorithm}
        benchmark={currentBenchmark}
        compareBenchmark={compareBenchmark}
        compareMode={compareMode}
        onToggleCompare={toggleCompareMode}
        sidebarOpen={sidebarOpen}
      />
    </div>
  );
};

export default Benchmark;
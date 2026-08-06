import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const categories = [
  { id: 'graph_search', name: 'Graph Search', icon: '◈' },
  { id: 'shortest_path', name: 'Shortest Path', icon: '◈' },
  { id: 'centrality', name: 'Centrality', icon: '◈' },
  { id: 'community', name: 'Community Detection', icon: '◈' },
  { id: 'similarity', name: 'Similarity', icon: '◈' },
  { id: 'sorting', name: 'Sorting', icon: '◉' },
  { id: 'tree', name: 'Tree Structures', icon: '◎' },
  { id: 'range_query', name: 'Range Query', icon: '◎' },
  { id: 'disjoint_set', name: 'Disjoint Set', icon: '◈' },
];

interface SidebarProps {
  algorithmData: any;
  selectedAlgorithm: string | null;
  compareAlgorithm: string | null;
  onSelect: (key: string | null) => void;
  compareMode: boolean;
  expandedCategories: string[];
  setExpandedCategories: React.Dispatch<React.SetStateAction<string[]>>;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ 
  algorithmData, 
  selectedAlgorithm, 
  compareAlgorithm,
  onSelect, 
  compareMode,
  expandedCategories, 
  setExpandedCategories,
  isOpen,
  onToggle
}: SidebarProps): React.ReactElement => {
  const toggleCategory = (categoryId: string): void => {
    setExpandedCategories((prev: string[]) =>
      prev.includes(categoryId)
        ? prev.filter((id: string) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getAlgorithmsByCategory = (categoryId: string): [string, any][] => {
    return Object.entries(algorithmData).filter(
      ([_, algo]: [string, any]) => algo.category === categoryId
    );
  };

  return (
    <motion.aside 
      className={`sidebar ${isOpen ? 'open' : 'closed'}`}
      animate={{ width: isOpen ? 280 : 56 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <button 
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? '◁' : '▷'}
      </button>

      <div className="sidebar-header">
        <div className="sidebar-logo">◆</div>
        {isOpen && <div className="sidebar-title">Tribe Docs</div>}
      </div>

      <div className="sidebar-nav">
        {categories.map((category: any) => {
          const algorithms = getAlgorithmsByCategory(category.id);
          const isExpanded = expandedCategories.includes(category.id) && isOpen;

          return (
            <div key={category.id} className="category">
              <motion.div
                className="category-header"
                onClick={() => isOpen && toggleCategory(category.id)}
                whileHover={isOpen ? { backgroundColor: 'var(--bg-tertiary)' } : {}}
                title={!isOpen ? category.name : undefined}
              >
                <span className="category-icon">{category.icon}</span>
                {isOpen && (
                  <>
                    <span className="category-name">{category.name}</span>
                    <span className="category-count">{algorithms.length}</span>
                    <motion.span
                      className={`category-chevron ${isExpanded ? 'expanded' : ''}`}
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      ›
                    </motion.span>
                  </>
                )}
              </motion.div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="algorithm-list"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {algorithms.map(([key, algo]: [string, any]) => (
                      <motion.div
                        key={key}
                        className={`algorithm-item ${
                          selectedAlgorithm === key ? 'active' : ''
                        } ${compareAlgorithm === key ? 'comparing' : ''}`}
                        onClick={() => onSelect(key)}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {algo.name}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {isOpen && (
        <div className="sidebar-footer">
          <motion.button
            className={`compare-toggle ${compareMode ? 'active' : ''}`}
            onClick={() => {
              if (compareMode) {
                onSelect(null);
              }
              window.dispatchEvent(new CustomEvent('toggle-compare'));
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {compareMode ? '✕ Exit Compare Mode' : '⇄ Compare Algorithms'}
          </motion.button>
        </div>
      )}
    </motion.aside>
  );
};

export default Sidebar;
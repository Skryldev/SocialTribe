import React from "react";
import { motion } from "framer-motion";
import { Upload, Database, X, FileJson, RefreshCw, Cloud, HardDrive, Zap } from "lucide-react";

interface LoadOptionsPanelProps {
  onClose: () => void;
  onLoadJson: (file: File) => void;
  onReloadApi: () => void;
  dataSource: string;
}

const LoadOptionsPanel = ({ onClose, onLoadJson, onReloadApi, dataSource }: LoadOptionsPanelProps): React.ReactElement => {
  const panelVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const}
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.98,
      transition: { duration: 0.15 } as const
    }
  };

  return (
    <motion.div
      className="load-options-panel-premium"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="load-panel-header">
        <div className="load-panel-title">
          <div className="load-panel-icon">
            <Database size={16} />
          </div>
          <div>
            <h3>Load Network Data</h3>
            <p>Import from file or API</p>
          </div>
        </div>
        <button className="load-panel-close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="load-panel-content">
        <div className="load-option-card">
          <div className="option-icon">
            <FileJson size={22} />
          </div>
          <div className="option-info">
            <div className="option-title">Upload JSON File</div>
            <div className="option-desc">Load network from local JSON file</div>
          </div>
          <label className="option-btn primary">
            <Upload size={14} />
            <span>Browse</span>
            <input
              type="file"
              accept=".json"
              hidden
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.files?.[0]) onLoadJson(e.target.files[0]);
                onClose();
              }}
            />
          </label>
        </div>

        <div className="load-option-card">
          <div className="option-icon">
            <Cloud size={22} />
          </div>
          <div className="option-info">
            <div className="option-title">API Server</div>
            <div className="option-desc">Reload from backend API endpoint</div>
          </div>
          <button
            className="option-btn secondary"
            onClick={() => {
              onReloadApi();
              onClose();
            }}
          >
            <RefreshCw size={14} />
            <span>Reload</span>
          </button>
        </div>

        <div className="load-panel-footer">
          <div className="data-source-info">
            <HardDrive size={12} />
            <span>Current data source:</span>
            <strong>{dataSource === "api" ? "API Server" : "Local File"}</strong>
          </div>
          <div className="data-source-hint">
            <Zap size={10} />
            <span>Supported formats: JSON with nodes & edges structure</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LoadOptionsPanel;
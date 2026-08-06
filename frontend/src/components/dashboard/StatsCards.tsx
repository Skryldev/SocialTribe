import React from "react";
import { motion } from "framer-motion";
import { useNetwork } from "./NetworkContext";
import { 
  Users, 
  Heart, 
  TrendingUp, 
  Network, 
  Ruler,
  Sparkles,
} from "lucide-react";
import "./StatsCards.css";

const ICON_MAP: any = {
  totalUsers: Users,
  totalEdges: Heart,
  avgDegree: TrendingUp,
  density: Network,
  diameter: Ruler,
};

const formatValue = (key: string, value: any): string => {
  if (value === undefined || value === null) return "—";
  
  switch (key) {
    case "totalUsers":
    case "totalEdges":
      return Number(value).toLocaleString();
    case "avgDegree":
      return typeof value === 'number' ? value.toFixed(2) : value;
    case "density":
      return typeof value === 'number' ? value.toFixed(4) : value;
    case "diameter":
      return value === Infinity ? "∞" : String(value);
    default:
      return String(value);
  }
};

const getCardColors = (key: string): any => {
  const colors: any = {
    totalUsers: { icon: "#3b82f6", glow: "rgba(59, 130, 246, 0.2)", border: "rgba(59, 130, 246, 0.3)" },
    totalEdges: { icon: "#ec4899", glow: "rgba(236, 72, 153, 0.2)", border: "rgba(236, 72, 153, 0.3)" },
    avgDegree: { icon: "#f59e0b", glow: "rgba(245, 158, 11, 0.2)", border: "rgba(245, 158, 11, 0.3)" },
    density: { icon: "#10b981", glow: "rgba(16, 185, 129, 0.2)", border: "rgba(16, 185, 129, 0.3)" },
    diameter: { icon: "#8b5cf6", glow: "rgba(139, 92, 246, 0.2)", border: "rgba(139, 92, 246, 0.3)" },
  };
  return colors[key] || { icon: "#94a3b8", glow: "rgba(148, 163, 184, 0.1)", border: "rgba(148, 163, 184, 0.2)" };
};

interface StatCardProps {
  card: { key: string; label: string };
  value: any;
  index: number;
}

const StatCard = ({ card, value, index }: StatCardProps): React.ReactElement => {
  const Icon = ICON_MAP[card.key];
  const formattedValue = formatValue(card.key, value);
  const colors = getCardColors(card.key);

  return (
    <motion.div
      className="stat-card-premium"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      style={{
        borderColor: colors.border,
        boxShadow: `0 0 0 1px ${colors.border}`
      }}
    >
      <div 
        className="stat-card-gradient" 
        style={{ background: `radial-gradient(circle at 30% 0%, ${colors.glow}, transparent 70%)` }}
      />

      <motion.div 
        className="stat-card-icon"
        style={{ color: colors.icon }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <Icon size={20} strokeWidth={1.5} />
        <motion.div 
          className="stat-card-icon-pulse"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3
          }}
          style={{ background: colors.glow }}
        />
      </motion.div>

      <div className="stat-card-content">
        <motion.div 
          className="stat-card-value"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.08 + 0.1, duration: 0.3, type: "spring", stiffness: 400 }}
        >
          {formattedValue}
        </motion.div>
        <div className="stat-card-label">
          {card.label}
        </div>
      </div>

      <div 
        className="stat-card-corner"
        style={{ background: `linear-gradient(135deg, ${colors.icon}20, transparent)` }}
      />
    </motion.div>
  );
};

export default function StatsCards(): React.ReactElement {
  const { stats } = useNetwork();

  const CARDS = [
    { key: "totalUsers", label: "Total Users" },
    { key: "totalEdges", label: "Total Edges" },
    { key: "avgDegree",  label: "Avg Degree" },
    { key: "density",    label: "Density" },
    { key: "diameter",   label: "Diameter" },
  ];

  return (
    <div className="stats-cards-container">
      <div className="stats-top-bar" />
      
      <div className="stats-cards-header">
        <div className="stats-header-left">
          <motion.div
            className="stats-header-icon"
            animate={{ 
              rotate: [0, 10, -10, 5, -5, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              repeatDelay: 5
            }}
          >
            <Sparkles size={14} />
          </motion.div>
          <div>
            <motion.h3 
              className="stats-header-title"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              Network Statistics
            </motion.h3>
            <motion.p 
              className="stats-header-desc"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              Key metrics and network properties
            </motion.p>
          </div>
        </div>
      </div>
      
      <div className="stats-cards-grid">
        {CARDS.map((card: { key: string; label: string }, idx: number) => (
          <StatCard 
            key={card.key}  
            card={card} 
            value={stats[card.key]} 
            index={idx}
          />
        ))}
      </div>

      <motion.div 
        className="stats-footer-line"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
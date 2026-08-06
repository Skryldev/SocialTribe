import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  GitBranch,
  ArrowRightLeft,
  Network,
  ChevronDown,
  ChevronRight,
  Hash,
  UserCheck,
  LucideIcon,
} from 'lucide-react';
import './CommunityDetailsTable.css';

const DENSITY_THRESHOLDS = {
  high: 0.7,
  medium: 0.35,
};

const getDensityLevel = (density: number): { label: string; key: string } => {
  if (density >= DENSITY_THRESHOLDS.high) return { label: 'Dense', key: 'high' };
  if (density >= DENSITY_THRESHOLDS.medium) return { label: 'Moderate', key: 'medium' };
  return { label: 'Sparse', key: 'low' };
};

interface CommunityMetrics {
  id: number;
  size: number;
  internalEdges: number;
  internalDensity: number;
  densityLevel: { label: string; key: string };
  externalConnections: number;
  connectedCommunities: number;
  conductance: number;
  memberList: string[];
  memberIds: string[];
}

const computeCommunityMetrics = (community: any, index: number, adjacencyList: any, users: any[]): CommunityMetrics => {
  const { members } = community;
  const size = members.length;
  const memberSet = new Set(members);

  let internalEdges = 0;
  members.forEach((memberId: string) => {
    const neighbors = adjacencyList[memberId] || [];
    neighbors.forEach((neighbor: string) => {
      if (memberSet.has(neighbor)) internalEdges++;
    });
  });
  internalEdges /= 2;

  const maxPossibleEdges = (size * (size - 1)) / 2;
  const internalDensity = maxPossibleEdges > 0 ? internalEdges / maxPossibleEdges : size === 1 ? 1 : 0;

  let externalConnections = 0;
  const externalNodeSet = new Set<string>();
  members.forEach((memberId: string) => {
    const neighbors = adjacencyList[memberId] || [];
    neighbors.forEach((neighbor: string) => {
      if (!memberSet.has(neighbor)) {
        externalConnections++;
        externalNodeSet.add(neighbor);
      }
    });
  });

  const memberNames = members.map((id: string) => {
    const user = users?.find((u: any) => u.id === id);
    return user ? user.name || user.id : id;
  });

  const densityLevel = getDensityLevel(internalDensity);
  const conductance =
    size + externalConnections > 0
      ? externalConnections / (2 * internalEdges + externalConnections)
      : 0;

  return {
    id: index + 1,
    size,
    internalEdges,
    internalDensity,
    densityLevel,
    externalConnections,
    connectedCommunities: externalNodeSet.size,
    conductance: Math.round(conductance * 1000) / 1000,
    memberList: memberNames,
    memberIds: members,
  };
};

interface Column {
  key: string;
  label: string;
  align: string;
  icon: LucideIcon;
}

const COLUMNS: Column[] = [
  { key: 'id', label: 'Community', align: 'left', icon: Hash },
  { key: 'size', label: 'Size', align: 'center', icon: Users },
  { key: 'internalDensity', label: 'Internal Density', align: 'left', icon: UserCheck },
  { key: 'externalConnections', label: 'External Links', align: 'center', icon: ArrowRightLeft },
  { key: 'connectedCommunities', label: 'Adjacent Communities', align: 'center', icon: Network },
  { key: 'actions', label: 'Members', align: 'center', icon: GitBranch },
];

const rowVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const},
  }),
};

const expandVariants = {
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  expanded: { height: 'auto', opacity: 1, overflow: 'hidden' },
};

interface DensityIndicatorProps {
  density: number;
  level: { label: string; key: string };
}

const DensityIndicator = ({ density, level }: DensityIndicatorProps) => (
  <div className="cdt-density">
    <div className="cdt-density-track">
      <motion.div
        className={`cdt-density-fill cdt-density-fill--${level.key}`}
        initial={{ width: 0 }}
        animate={{ width: `${density * 100}%` }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
    <span className={`cdt-density-value cdt-density-value--${level.key}`}>
      {(density * 100).toFixed(1)}%
    </span>
  </div>
);

interface MemberChipListProps {
  memberList: string[];
  memberIds: string[];
  isExpanded: boolean;
}

const MemberChipList = ({ memberList, memberIds, isExpanded }: MemberChipListProps) => {
  const visibleMembers = isExpanded ? memberList : memberList.slice(0, 3);
  const overflowCount = memberList.length - visibleMembers.length;

  return (
    <div className="cdt-member-chips">
      {visibleMembers.map((name: string, idx: number) => (
        <span
          key={memberIds[idx] || idx}
          className="cdt-member-chip"
          title={memberIds[idx]}
        >
          {name}
        </span>
      ))}
      {overflowCount > 0 && !isExpanded && (
        <span className="cdt-member-chip cdt-member-chip--overflow">
          +{overflowCount} more
        </span>
      )}
    </div>
  );
};

interface CommunityDetailsTableProps {
  communities: any[];
  adjacencyList: any;
  users: any[];
}

const CommunityDetailsTable = ({ communities, adjacencyList, users }: CommunityDetailsTableProps): React.ReactElement => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const communityDetails = useMemo(() => {
    if (!communities?.length) return [];
    return communities.map((community: any, index: number) =>
      computeCommunityMetrics(community, index, adjacencyList, users)
    );
  }, [communities, adjacencyList, users]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedId((prev: number | null) => (prev === id ? null : id));
  }, []);

  const renderCell = (community: CommunityMetrics, column: Column) => {
    switch (column.key) {
      case 'id':
        return (
          <div className="cdt-community-identity">
            <span
              className="cdt-community-color-dot"
              style={{ backgroundColor: `var(--cdt-color-${((community.id - 1) % 10) + 1})` }}
            />
            <span className="cdt-community-name">Community {community.id}</span>
          </div>
        );

      case 'size':
        return (
          <span className="cdt-size-badge">
            {community.size}
          </span>
        );

      case 'internalDensity':
        return (
          <DensityIndicator
            density={community.internalDensity}
            level={community.densityLevel}
          />
        );

      case 'externalConnections':
        return (
          <span className="cdt-metric-number">
            {community.externalConnections.toLocaleString()}
          </span>
        );

      case 'connectedCommunities':
        return (
          <span className="cdt-metric-number">
            {community.connectedCommunities}
          </span>
        );

      case 'actions':
        return (
          <button
            type="button"
            className="cdt-expand-trigger"
            onClick={() => toggleExpand(community.id)}
            aria-expanded={expandedId === community.id}
            aria-label={
              expandedId === community.id
                ? 'Collapse member list'
                : 'Expand member list'
            }
          >
            <span className="cdt-expand-trigger-label">
              {expandedId === community.id ? 'Collapse' : 'Expand'}
            </span>
            <motion.span
              className="cdt-expand-icon"
              animate={{ rotate: expandedId === community.id ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronDown size={15} />
            </motion.span>
          </button>
        );

      default:
        return null;
    }
  };

  if (!communityDetails.length) {
    return (
      <div className="cdt-empty">
        <GitBranch size={28} className="cdt-empty-icon" />
        <p className="cdt-empty-text">No communities detected</p>
        <p className="cdt-empty-hint">Run the analysis to discover community structures.</p>
      </div>
    );
  }

  return (
    <div className="cdt-root">
      <div className="cdt-table-wrapper">
        <table className="cdt-table">
          <thead>
            <tr className="cdt-head-row">
              {COLUMNS.map((col: Column) => {
                const Icon = col.icon;
                return (
                  <th
                    key={col.key}
                    className={`cdt-th cdt-th--${col.align}`}
                    scope="col"
                  >
                    <span className="cdt-th-content">
                      <Icon size={13} className="cdt-th-icon" />
                      {col.label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {communityDetails.map((community: CommunityMetrics, idx: number) => {
              const isExpanded = expandedId === community.id;
              return (
                <React.Fragment key={community.id}>
                  <motion.tr
                    className={`cdt-row ${isExpanded ? 'cdt-row--expanded' : ''}`}
                    variants={rowVariants}
                    custom={idx}
                    initial="hidden"
                    animate="visible"
                    layout
                  >
                    {COLUMNS.map((col: Column) => (
                      <td
                        key={col.key}
                        className={`cdt-td cdt-td--${col.align}`}
                      >
                        {renderCell(community, col)}
                      </td>
                    ))}
                  </motion.tr>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.tr
                        className="cdt-expanded-row"
                        key={`expanded-${community.id}`}
                        variants={expandVariants}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <td colSpan={COLUMNS.length} className="cdt-expanded-cell">
                          <div className="cdt-expanded-content">
                            <div className="cdt-expanded-header">
                              <UserCheck size={14} className="cdt-expanded-header-icon" />
                              <span>Members ({community.size})</span>
                            </div>
                            <MemberChipList
                              memberList={community.memberList}
                              memberIds={community.memberIds}
                              isExpanded={isExpanded}
                            />
                            {community.memberList.length > 3 && (
                              <button
                                type="button"
                                className="cdt-show-all-btn"
                                onClick={() => toggleExpand(community.id)}
                              >
                                <ChevronRight size={13} />
                                Collapse member list
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="cdt-footer">
        <span className="cdt-footer-text">
          {communityDetails.length} communit{communityDetails.length === 1 ? 'y' : 'ies'} detected
        </span>
      </div>
    </div>
  );
};

export default CommunityDetailsTable;
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#D946EF', '#0EA5E9', '#64748B', '#DC2626'
];

interface Community {
  members?: string[];
}

interface CommunityOverviewProps {
  communities: Community[];
  users: any[];
}

const CommunityOverview = ({ communities, users }: CommunityOverviewProps): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const chartData = useMemo(() => {
    if (!communities || !Array.isArray(communities)) return [];
    
    return communities.map((community: Community, index: number) => {
      const members = community.members || [];
      const memberNames = members.map((memberId: string) => {
        const user = users ? users.find((u: any) => u.id === memberId) : null;
        return user ? (user.name || user.id) : memberId;
      });

      return {
        name: `Community ${index + 1}`,
        value: members.length,
        color: COLORS[index % COLORS.length],
        members: memberNames.slice(0, 5),
        totalMembers: members.length
      };
    });
  }, [communities, users]);

  const renderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ 
          background: 'white', 
          padding: '12px', 
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          maxWidth: '250px'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#111827' }}>
            {data.name}
          </p>
          <p style={{ margin: '5px 0 0 0', color: '#374151' }}>
            Size: {data.value} members
          </p>
          {data.members.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280' }}>
                Members:
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
                {data.members.join(', ')}
                {data.totalMembers > 5 && ` ... and ${data.totalMembers - 5} more`}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul style={{ 
        listStyle: 'none', 
        padding: 0, 
        margin: 0,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        justifyContent: 'center'
      }}>
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} style={{ 
            display: 'flex', 
            alignItems: 'center',
            fontSize: '12px',
            color: '#374151'
          }}>
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              backgroundColor: entry.color,
              borderRadius: '2px',
              marginRight: '6px'
            }}></span>
            {entry.value}
          </li>
        ))}
      </ul>
    );
  };

  if (!chartData.length) {
    return <p className="empty-message">No communities detected</p>;
  }

  if (dimensions.width === 0 || dimensions.height === 0) {
    return (
      <div 
        ref={containerRef} 
        style={{ width: '100%', height: '400px', minHeight: '400px' }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          color: '#9ca3af'
        }}>
          Loading chart...
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '400px', minHeight: '400px' }}
    >
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={150}
            paddingAngle={2}
            dataKey="value"
            isAnimationActive={true}
          >
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={renderTooltip} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CommunityOverview;
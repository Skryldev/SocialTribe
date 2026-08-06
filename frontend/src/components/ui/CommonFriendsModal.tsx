import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Users, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ModalShell,
  ModalHeader,
  LoadingState,
  EmptyState,
  ErrorState,
} from './NodeContextMenuModals';
import { fetchCommonNeighbors } from './contextMenuApi';
import './CommonFriendsModal.css';

const AVATAR_COLORS = [
  'cf-avatar--amber',
  'cf-avatar--blue',
  'cf-avatar--emerald',
  'cf-avatar--violet',
  'cf-avatar--rose',
  'cf-avatar--cyan',
];

const getAvatarColor = (index: number): string => AVATAR_COLORS[index % AVATAR_COLORS.length];

const getInitial = (label: any): string => {
  if (!label) return '?';
  return String(label).charAt(0).toUpperCase();
};

const safeLabel = (label: any): string => String(label ?? 'Unknown');

const listItemVariants = {
  hidden: { opacity: 0, x: -12, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      delay: 0.04 * i,
      type: 'spring' as const,
      stiffness: 350,
      damping: 26,
    },
  }),
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.8, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: 0.08, type: 'spring' as const, stiffness: 400, damping: 25 },
  },
};

interface MutualUser {
  id: string;
  label: string;
}

interface MutualsData {
  items: MutualUser[];
  count: number;
  hasCommonFriend: boolean;
}

interface CommonFriendsModalProps {
  open: boolean;
  onClose: () => void;
  userA: any;
  userB: any;
  nodes: any[];
  getLabel: (node: any) => string;
}

export function CommonFriendsModal({
  open,
  onClose,
  userA,
  userB,
  nodes,
  getLabel,
}: CommonFriendsModalProps): React.ReactElement {
  const [mutuals, setMutuals] = useState<MutualsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const labelA = useMemo(
    () => (userA ? safeLabel(getLabel(userA) || userA?.id) : 'User A'),
    [userA, getLabel]
  );
  const labelB = useMemo(
    () => (userB ? safeLabel(getLabel(userB) || userB?.id) : 'User B'),
    [userB, getLabel]
  );

  const fetchMutuals = useCallback(async () => {
    if (!userA?.id || !userB?.id) return;

    setLoading(true);
    setError(null);
    setMutuals(null);

    try {
      const data = await fetchCommonNeighbors(userA.id, userB.id);

      const neighborIds = data?.common_neighbors ?? [];
      const count = data?.count ?? neighborIds.length;

      const enriched = neighborIds.map((id: string) => {
        const node = nodes.find((n: any) => n.id === id);
        return {
          id,
          label: node ? getLabel(node) : safeLabel(id),
        };
      });

      setMutuals({
        items: enriched,
        count,
        hasCommonFriend: data?.has_common_friend ?? count > 0,
      });
    } catch (err) {
      console.error('[CommonFriendsModal] Fetch failed:', err);
      setError('Failed to load common friends. Please try again.');
      setMutuals({ items: [], count: 0, hasCommonFriend: false });
    } finally {
      setLoading(false);
    }
  }, [userA, userB, nodes, getLabel]);

  useEffect(() => {
    if (open && userA?.id && userB?.id) {
      fetchMutuals();
    }
  }, [open, userA?.id, userB?.id, fetchMutuals]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setMutuals(null);
        setError(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const renderContent = (): React.ReactElement | null => {
    if (loading) {
      return <LoadingState message="Finding common friends…" />;
    }

    if (error) {
      return <ErrorState message={error} />;
    }

    if (!mutuals) {
      return null;
    }

    if (!mutuals.hasCommonFriend || mutuals.items.length === 0) {
      return (
        <EmptyState
          icon={Users}
          message={`${labelA} and ${labelB} have no mutual friends`}
        />
      );
    }

    return (
      <motion.div
        className="cf-results"
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="cf-count-badge"
          variants={badgeVariants}
        >
          <Users size={12} strokeWidth={1.8} />
          <span>
            {mutuals.count} mutual friend{mutuals.count !== 1 ? 's' : ''}
          </span>
        </motion.div>

        <div className="cf-list">
          <AnimatePresence mode="popLayout">
            {mutuals.items.map((user: MutualUser, index: number) => (
              <motion.div
                key={user.id ?? index}
                className="cf-item"
                variants={listItemVariants}
                custom={index}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <div className={`cf-avatar ${getAvatarColor(index)}`}>
                  {getInitial(user.label)}
                </div>

                <div className="cf-info">
                  <span className="cf-name" title={safeLabel(user.label)}>
                    {safeLabel(user.label)}
                  </span>
                  <span className="cf-id" title={user.id}>
                    {user.id}
                  </span>
                </div>

                <div className="cf-hint">
                  <Zap size={11} strokeWidth={1.8} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="cf-modal-title"
      size="sm"
    >
      <ModalHeader
        icon={Users}
        accent="success"
        title="Common Friends"
        subtitle={
          <span className="cf-subtitle">
            <strong>{labelA}</strong>
            <span className="cf-subtitle-sep">&amp;</span>
            <strong>{labelB}</strong>
          </span>
        }
        titleId="cf-modal-title"
      />

      <div className="cf-body">
        {renderContent()}
      </div>
    </ModalShell>
  );
}
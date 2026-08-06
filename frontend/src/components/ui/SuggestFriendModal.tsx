import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ModalShell,
  ModalHeader,
  LoadingState,
  EmptyState,
  ErrorState,
} from './NodeContextMenuModals';
import { useGraphMutations } from './useGraphMutations';
import './SuggestFriendModal.css';

// ============================================================
// Constants
// ============================================================
const AVATAR_COLORS = [
  'sg-avatar--amber',
  'sg-avatar--violet',
  'sg-avatar--blue',
  'sg-avatar--emerald',
  'sg-avatar--rose',
  'sg-avatar--cyan',
];

const getAvatarColor = (index: number): string => AVATAR_COLORS[index % AVATAR_COLORS.length];

const getInitial = (label: unknown): string => {
  if (!label) return '?';
  return String(label).charAt(0).toUpperCase();
};

const safeLabel = (label: unknown): string => String(label ?? 'Unknown');

// ============================================================
// Animations
// ============================================================
const listItemVariants = {
  hidden: { opacity: 0, x: -16, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      delay: 0.05 * i,
      type: 'spring' as const,
      stiffness: 350,
      damping: 26,
    },
  }),
};

// ============================================================
// Types (بر اساس API Docs)
// ============================================================
interface RecommendationItem {
  user_id: string;
  raw_score: number;
  normalized_score: number;
  common_friends_count: number;
  is_connected: boolean;
  rank: number;
}

interface RecommendationResponse {
  user_id: string;
  total_candidates: number;
  recommendations: RecommendationItem[];
}

interface Suggestion {
  id: string;
  label: string;
  score: number;
  commonFriends: number;
  isConnected: boolean;
  rank: number;
}

interface SuggestFriendModalProps {
  open: boolean;
  onClose: () => void;
  user: any;
  nodes: any[];
  getLabel: (node: any) => string;
}

// ============================================================
// Main Component
// ============================================================
export function SuggestFriendModal({
  open,
  onClose,
  user,
  nodes,
  getLabel,
}: SuggestFriendModalProps): React.ReactElement {
  // ✅ استفاده از getRecommendationDetails به جای getRecommendations
  const { getRecommendationDetails, suggestDetailsLoading } = useGraphMutations();

  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalCandidates, setTotalCandidates] = useState<number>(0);

  const userName = useMemo(
    () => (user ? safeLabel(getLabel(user) || user?.id) : 'User'),
    [user, getLabel]
  );

  // ============================================================
  // Fetch Suggestions
  // ============================================================
  const fetchSuggestions = useCallback(async () => {
    if (!user?.id) return;

    setError(null);
    setSuggestions(null);
    setTotalCandidates(0);

    try {
      // ✅ استفاده از getRecommendationDetails (API با جزئیات کامل)
      const raw = await getRecommendationDetails(user.id, 10);
      
      console.log('[SuggestFriendModal] Raw response:', raw);

      // ✅ پردازش پاسخ
      let responseData: RecommendationResponse | null = null;

      // اگر داده string است، parse کن
      if (typeof raw === 'string') {
        try {
          responseData = JSON.parse(raw) as RecommendationResponse;
          console.log('[SuggestFriendModal] Parsed JSON:', responseData);
        } catch {
          console.warn('[SuggestFriendModal] Failed to parse JSON string');
        }
      } 
      // اگر object است، مستقیماً استفاده کن
      else if (typeof raw === 'object' && raw !== null) {
        responseData = raw as RecommendationResponse;
      }

      // ✅ بررسی ساختار صحیح
      if (!responseData || !responseData.recommendations) {
        console.warn('[SuggestFriendModal] Invalid response structure:', responseData);
        setSuggestions([]);
        return;
      }

      // ✅ استخراج اطلاعات
      setTotalCandidates(responseData.total_candidates || 0);

      // ✅ تبدیل به فرمت استاندارد برای نمایش
      const enriched: Suggestion[] = responseData.recommendations.map((item: RecommendationItem) => {
        // پیدا کردن node مربوطه
        const node = nodes.find((n: any) => n.id === item.user_id);
        
        return {
          id: item.user_id,
          label: node ? getLabel(node) : safeLabel(item.user_id),
          score: item.normalized_score || item.raw_score || 0,
          commonFriends: item.common_friends_count || 0,
          isConnected: item.is_connected || false,
          rank: item.rank || 0,
        };
      });

      // ✅ مرتب‌سازی بر اساس rank
      enriched.sort((a, b) => (a.rank || 0) - (b.rank || 0));

      console.log('[SuggestFriendModal] Enriched suggestions:', enriched);
      setSuggestions(enriched);
      
    } catch (err) {
      console.error('[SuggestFriendModal] Fetch failed:', err);
      setError('Failed to load suggestions. Please try again.');
      setSuggestions([]);
    }
  }, [user, getRecommendationDetails, nodes, getLabel]);

  // ============================================================
  // Effects
  // ============================================================
  useEffect(() => {
    if (open && user?.id) {
      fetchSuggestions();
    }
  }, [open, user?.id, fetchSuggestions]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setSuggestions(null);
        setError(null);
        setTotalCandidates(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ============================================================
  // Render Helpers
  // ============================================================
  const renderContent = (): React.ReactElement | null => {
    // ✅ استفاده از suggestDetailsLoading
    if (suggestDetailsLoading || suggestions === null) {
      return <LoadingState message="Finding the best suggestions…" />;
    }

    if (error) {
      return <ErrorState message={error} />;
    }

    if (suggestions.length === 0) {
      return (
        <EmptyState
          icon={Sparkles}
          message={`No friend suggestions for ${userName}`}
        />
      );
    }

    return (
      <motion.div
        className="sg-results"
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="sg-count"
          initial={{ opacity: 0, y: -6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.06, type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Sparkles size={12} strokeWidth={1.8} />
          <span>
            {suggestions.length} suggestion
            {suggestions.length !== 1 ? 's' : ''}
            {totalCandidates > 0 && ` (from ${totalCandidates} candidates)`}
          </span>
        </motion.div>

        <div className="sg-list">
          <AnimatePresence mode="popLayout">
            {suggestions.map((suggestion: Suggestion, index: number) => (
              <motion.div
                key={suggestion.id}
                className="sg-item"
                variants={listItemVariants}
                custom={index}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: -24, transition: { duration: 0.15 } }}
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                layout
              >
                <div className={`sg-avatar ${getAvatarColor(index)}`}>
                  {getInitial(suggestion.label)}
                </div>

                <div className="sg-info">
                  <span className="sg-name" title={safeLabel(suggestion.label)}>
                    {safeLabel(suggestion.label)}
                  </span>
                  <span className="sg-meta">
                    {suggestion.commonFriends > 0 ? (
                      <>
                        <Zap size={10} className="sg-meta-icon" />
                        {suggestion.commonFriends} mutual friend
                        {suggestion.commonFriends !== 1 ? 's' : ''}
                      </>
                    ) : suggestion.score > 0 ? (
                      <>Score: {(suggestion.score * 100).toFixed(0)}%</>
                    ) : (
                      'Suggested'
                    )}
                    {suggestion.isConnected && (
                      <span className="sg-meta-badge">Connected</span>
                    )}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="sg-modal-title"
      size="sm"
    >
      <ModalHeader
        icon={Sparkles}
        accent="amber"
        title="Suggested Friends"
        subtitle={
          <span className="sg-subtitle">
            for <strong>{userName}</strong>
          </span>
        }
        titleId="sg-modal-title"
      />

      <div className="sg-body">
        {renderContent()}
      </div>
    </ModalShell>
  );
}
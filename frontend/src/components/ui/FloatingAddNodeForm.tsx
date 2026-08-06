import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X, Sparkles, Hash, AtSign, Zap, Loader2 } from 'lucide-react';
import './FloatingAddNodeForm.css';

const clamp = (value: number, lo: number, hi: number): number => Math.min(Math.max(value, lo), hi);

const FORM_WIDTH = 320;
const FORM_HEIGHT = 360;
const VIEWPORT_MARGIN = 16;

function generateId(name: string = ''): string {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  return base ? `${base}_${Date.now().toString(36)}` : `node_${Date.now().toString(36)}`;
}

const AnimatedPattern = () => (
  <motion.svg
    className="fanf-pattern"
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.035 }}
    transition={{ duration: 0.5 }}
    aria-hidden="true"
  >
    <defs>
      <pattern id="fanfGrid" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.6" style={{ fill: 'var(--anb-accent)' }} />
        <circle cx="10" cy="10" r="0.4" style={{ fill: 'var(--anb-teal)' }} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#fanfGrid)" />
  </motion.svg>
);

interface FloatingAddNodeFormProps {
  screenPos: { x: number; y: number };
  flowPos: any;
  onAdd: (node: { id: string; name: string; position: any }) => void;
  onClose: () => void;
}

function FloatingAddNodeForm({ screenPos, flowPos, onAdd, onClose }: FloatingAddNodeFormProps): React.ReactElement {
  const [name, setName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userIdManual, setUserIdManual] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const safeX = clamp(screenPos.x + 20, VIEWPORT_MARGIN, window.innerWidth - FORM_WIDTH - VIEWPORT_MARGIN);
  const safeY = clamp(screenPos.y + 10, VIEWPORT_MARGIN, window.innerHeight - FORM_HEIGHT - VIEWPORT_MARGIN);

  useEffect(() => {
    if (!userIdManual) setUserId(name ? generateId(name) : '');
  }, [name, userIdManual]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const isNameValid = name.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const finalId = userId.trim() || generateId(trimmed);

    await new Promise((resolve) => setTimeout(resolve, 300));

    onAdd({ id: finalId, name: trimmed, position: flowPos });
    setIsSubmitting(false);
    onClose();
  }, [name, userId, flowPos, onAdd, onClose]);

  const handleCopyId = useCallback(() => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [userId]);

  const handleNameKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 8 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 400, damping: 30 },
    },
    exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.2 } },
  };

  const fieldVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  };

  const idHintVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: { opacity: 1, height: 'auto', marginTop: -4, transition: { duration: 0.2 } },
    exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.15 } },
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className={`fanf-modal${isHovered ? ' fanf-modal-hovered' : ''}`}
        style={{ left: safeX, top: safeY, width: FORM_WIDTH }}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="dialog"
        aria-modal="true"
        aria-label="Add new node"
      >
        <AnimatedPattern />

        <motion.div
          className="fanf-header"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
        >
          <div className="fanf-header-left">
            <motion.div
              className="fanf-header-icon"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <UserPlus size={16} />
            </motion.div>
            <div>
              <h3 className="fanf-title">Add Node</h3>
              <p className="fanf-subtitle">Create a new user in the network</p>
            </div>
          </div>
          <motion.button
            type="button"
            className="fanf-close-btn"
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Close"
          >
            <X size={14} />
          </motion.button>
        </motion.div>

        <div className="fanf-body">
          <motion.div
            className="fanf-field"
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
          >
            <label className="fanf-field-label" htmlFor="fanf-name">
              <Hash size={10} />
              <span>Display Name</span>
              <span className="fanf-required">*</span>
            </label>
            <motion.input
              id="fanf-name"
              ref={inputRef}
              className={`fanf-input${!isNameValid && name.length > 0 ? ' fanf-input-error' : ''}`}
              type="text"
              placeholder="e.g., Sarah Johnson"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              maxLength={50}
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.1 }}
              aria-invalid={!isNameValid && name.length > 0}
            />
            <AnimatePresence>
              {name.length > 0 && (
                <motion.div
                  className={`fanf-counter${name.length > 45 ? ' fanf-counter-warning' : ''}`}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                >
                  {name.length}/50
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            className="fanf-field"
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
          >
            <label className="fanf-field-label" htmlFor="fanf-id">
              <AtSign size={10} />
              <span>User ID</span>
              <span className="fanf-optional">optional</span>
            </label>
            <motion.input
              id="fanf-id"
              className="fanf-input fanf-input-mono"
              type="text"
              placeholder="Auto-generated"
              value={userId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setUserId(e.target.value);
                setUserIdManual(true);
              }}
              onKeyDown={handleNameKeyDown}
              onFocus={() => setFocusedField('id')}
              onBlur={() => setFocusedField(null)}
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.1 }}
            />
          </motion.div>

          <AnimatePresence>
            {!userIdManual && userId && (
              <motion.div className="fanf-id-hint" variants={idHintVariants} initial="hidden" animate="visible" exit="exit">
                <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5, delay: 0.2 }}>
                  <Sparkles size={10} />
                </motion.span>
                <span>{userId}</span>
                <motion.button
                  type="button"
                  onClick={handleCopyId}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title="Copy ID"
                  aria-label="Copy generated ID"
                >
                  {isCopied ? <Check size={10} /> : <Zap size={10} />}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          className="fanf-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.2 }}
        >
          <motion.button
            type="button"
            className="fanf-btn-cancel"
            onClick={onClose}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <motion.button
            type="button"
            className={`fanf-btn-submit${!isNameValid || isSubmitting ? ' disabled' : ''}`}
            onClick={handleSubmit}
            disabled={!isNameValid || isSubmitting}
            whileHover={!isNameValid || isSubmitting ? undefined : { scale: 1.01, y: -1 }}
            whileTap={!isNameValid || isSubmitting ? undefined : { scale: 0.98 }}
          >
            {isSubmitting ? (
              <>
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Loader2 size={14} />
                </motion.span>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <UserPlus size={14} />
                <span>Create</span>
              </>
            )}
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {focusedField && (
            <motion.div
              className="fanf-focus-line"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

export default memo(FloatingAddNodeForm);
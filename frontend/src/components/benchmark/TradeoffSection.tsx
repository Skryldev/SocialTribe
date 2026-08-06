import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Scale,
  ThumbsUp,
  ThumbsDown,
  CheckCheck,
  XCircle,
  Minus,
  Layers,
  LucideIcon,
} from 'lucide-react';
import './TradeoffSection.css';

const PRO_CARD_VARIANTS = {
  hidden:  { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.36, delay: 0.12 + i * 0.09, ease: 'easeOut' as const},
  }),
};

const CON_CARD_VARIANTS = {
  hidden:  { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.36, delay: 0.12 + i * 0.09, ease: 'easeOut' as const},
  }),
};

const CHIP_VARIANTS = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.28, delay: 0.5 + i * 0.06, type: 'spring' as const, stiffness: 240 },
  }),
};

interface SummaryBarProps {
  prosCount: number;
  consCount: number;
}

const SummaryBar = memo(({ prosCount, consCount }: SummaryBarProps) => {
  const total = prosCount + consCount;
  const prosPct = total ? Math.round((prosCount / total) * 100) : 50;

  return (
    <motion.div
      className="ts-summary"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      aria-label="Tradeoff summary"
    >
      <div className="ts-summary__stats">
        <div className="ts-summary__pill ts-summary__pill--pro" aria-label={`${prosCount} advantages`}>
          <ThumbsUp size={13} strokeWidth={2} aria-hidden="true" />
          <span className="ts-summary__pill-count">{prosCount}</span>
          <span className="ts-summary__pill-label">Advantage{prosCount !== 1 ? 's' : ''}</span>
        </div>

        <div className="ts-summary__pill ts-summary__pill--con" aria-label={`${consCount} limitations`}>
          <ThumbsDown size={13} strokeWidth={2} aria-hidden="true" />
          <span className="ts-summary__pill-count">{consCount}</span>
          <span className="ts-summary__pill-label">Limitation{consCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {total > 0 && (
        <div
          className="ts-summary__ratio-track"
          role="meter"
          aria-label={`${prosPct}% advantages`}
          aria-valuenow={prosPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="ts-summary__ratio-fill"
            initial={{ width: 0 }}
            animate={{ width: `${prosPct}%` }}
            transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
          />
        </div>
      )}
    </motion.div>
  );
});
SummaryBar.displayName = 'SummaryBar';

interface TradeoffCardProps {
  text: string;
  index: number;
  variant: 'pro' | 'con';
}

const TradeoffCard = memo(({ text, index, variant }: TradeoffCardProps) => {
  const isPro = variant === 'pro';
  const Icon  = isPro ? CheckCheck : XCircle;
  const variants = isPro ? PRO_CARD_VARIANTS : CON_CARD_VARIANTS;

  return (
    <motion.article
      className={`ts-card ts-card--${variant}`}
      custom={index}
      variants={variants}
      initial="hidden"
      animate="visible"
      whileHover={{ x: isPro ? 4 : -4, transition: { duration: 0.15 } }}
      aria-label={`${isPro ? 'Advantage' : 'Limitation'} ${index + 1}: ${text}`}
    >
      <span className="ts-card__icon" aria-hidden="true">
        <Icon size={14} strokeWidth={2} />
      </span>
      <p className="ts-card__text">{text}</p>
      <span className="ts-card__index" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
    </motion.article>
  );
});
TradeoffCard.displayName = 'TradeoffCard';

interface ColumnEmptyProps {
  variant: 'pro' | 'con';
}

const ColumnEmpty = memo(({ variant }: ColumnEmptyProps) => (
  <div className={`ts-col-empty ts-col-empty--${variant}`} role="status">
    <Minus size={18} strokeWidth={1.5} aria-hidden="true" />
    <p>None listed</p>
  </div>
));
ColumnEmpty.displayName = 'ColumnEmpty';

interface TradeoffColumnProps {
  items: string[];
  variant: 'pro' | 'con';
  label: string;
  Icon: LucideIcon;
}

const TradeoffColumn = memo(({ items, variant, label, Icon }: TradeoffColumnProps) => (
  <div className={`ts-column ts-column--${variant}`}>
    <header className="ts-column__header">
      <span className="ts-column__icon" aria-hidden="true">
        <Icon size={14} strokeWidth={2} />
      </span>
      <h3 className="ts-column__title">{label}</h3>
      <span className="ts-column__count" aria-label={`${items.length} items`}>
        {items.length}
      </span>
    </header>

    <div
      className="ts-column__list"
      role="list"
      aria-label={`${label} list`}
    >
      {items.length > 0 ? (
        items.map((text: string, i: number) => (
          <div key={`${variant}-${i}`} role="listitem">
            <TradeoffCard text={text} index={i} variant={variant} />
          </div>
        ))
      ) : (
        <ColumnEmpty variant={variant} />
      )}
    </div>
  </div>
));
TradeoffColumn.displayName = 'TradeoffColumn';

interface UseCaseStripProps {
  useCases?: string[];
}

const UseCaseStrip = memo(({ useCases }: UseCaseStripProps) => {
  if (!useCases?.length) return null;

  return (
    <motion.div
      className="ts-usecases"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.45 }}
    >
      <div className="ts-usecases__header">
        <Layers size={13} strokeWidth={2} aria-hidden="true" />
        <span>Practical Use Cases</span>
      </div>
      <div className="ts-usecases__chips" role="list" aria-label="Use cases">
        {useCases.map((uc: string, i: number) => (
          <motion.span
            key={`uc-${i}`}
            className="ts-usecases__chip"
            custom={i}
            variants={CHIP_VARIANTS}
            initial="hidden"
            animate="visible"
            role="listitem"
          >
            {uc}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
});
UseCaseStrip.displayName = 'UseCaseStrip';

interface Algorithm {
  name: string;
  tradeoffs?: {
    pros?: string[];
    cons?: string[];
  };
  useCases?: string[];
}

interface TradeoffSectionProps {
  algorithm?: Algorithm | null;
}

const TradeoffSection = ({ algorithm = null }: TradeoffSectionProps): React.ReactElement | null => {
  if (!algorithm) return null;

  const pros = useMemo(() => algorithm.tradeoffs?.pros ?? [], [algorithm.tradeoffs]);
  const cons = useMemo(() => algorithm.tradeoffs?.cons ?? [], [algorithm.tradeoffs]);

  const hasAnyData = pros.length > 0 || cons.length > 0;

  return (
    <motion.section
      className="ts-root section"
      aria-labelledby="ts-heading"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <header className="section-header">
        <div className="section-icon" aria-hidden="true">
          <Scale size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="section-title" id="ts-heading">
            Trade-offs &amp; Use Cases
          </h2>
          <p className="section-description">
            When to reach for <strong>{algorithm.name}</strong> — and when not to
          </p>
        </div>
      </header>

      {hasAnyData ? (
        <>
          <SummaryBar prosCount={pros.length} consCount={cons.length} />

          <div className="ts-columns" role="region" aria-label="Tradeoff comparison">
            <TradeoffColumn
              items={pros}
              variant="pro"
              label="Advantages"
              Icon={ThumbsUp}
            />
            <TradeoffColumn
              items={cons}
              variant="con"
              label="Limitations"
              Icon={ThumbsDown}
            />
          </div>

          <UseCaseStrip useCases={algorithm.useCases} />
        </>
      ) : (
        <div className="ts-empty" role="status">
          <Scale size={24} strokeWidth={1.25} aria-hidden="true" />
          <p>No trade-off data available for this algorithm.</p>
        </div>
      )}
    </motion.section>
  );
};

TradeoffSection.displayName = 'TradeoffSection';

export default memo(TradeoffSection);
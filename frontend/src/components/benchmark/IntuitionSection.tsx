import React, { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb,
  ListOrdered,
  Tag,
  Gauge,
  ChevronDown,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import './IntuitionSection.css';

const DIFFICULTY_META: any = {
  easy:   { label: 'Easy',   className: 'is-badge--easy'   },
  medium: { label: 'Medium', className: 'is-badge--medium' },
  hard:   { label: 'Hard',   className: 'is-badge--hard'   },
};

const CARD_VARIANTS = {
  hidden:  { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.38, delay: 0.1 + i * 0.1, ease: 'easeOut' as const},
  }),
};

const CONNECTOR_VARIANTS = {
  hidden:  { scaleY: 0 },
  visible: (i: number) => ({
    scaleY: 1,
    transition: { duration: 0.35, delay: 0.28 + i * 0.1, ease: 'easeOut' as const},
  }),
};

interface MetaBadgesProps {
  difficulty?: string;
  category?: string;
}

const MetaBadges = memo(({ difficulty, category }: MetaBadgesProps) => {
  const diff = difficulty ? DIFFICULTY_META[difficulty.toLowerCase()] : null;

  return (
    <div className="is-meta" aria-label="Algorithm metadata">
      {category && (
        <span className="is-badge is-badge--category">
          <Tag size={10} strokeWidth={2.5} aria-hidden="true" />
          {category}
        </span>
      )}
      {diff && (
        <span className={`is-badge ${diff.className}`} aria-label={`Difficulty: ${diff.label}`}>
          <Gauge size={10} strokeWidth={2.5} aria-hidden="true" />
          {diff.label}
        </span>
      )}
    </div>
  );
});
MetaBadges.displayName = 'MetaBadges';

const PROSE_COLLAPSE_THRESHOLD = 280;

interface IntuitionSummaryProps {
  intuition: string;
  difficulty?: string;
  category?: string;
}

const IntuitionSummary = memo(({ intuition, difficulty, category }: IntuitionSummaryProps) => {
  const isLong = intuition && intuition.length > PROSE_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState<boolean>(!isLong);

  const preview = useMemo(
    () => (isLong ? intuition.slice(0, PROSE_COLLAPSE_THRESHOLD).trimEnd() + '…' : intuition),
    [intuition, isLong],
  );

  if (!intuition || intuition === 'No intuition available') return null;

  return (
    <motion.div
      className="is-summary"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <div className="is-summary__icon-col" aria-hidden="true">
        <Lightbulb size={16} strokeWidth={1.75} />
      </div>

      <div className="is-summary__body">
        <MetaBadges difficulty={difficulty} category={category} />

        <p className="is-summary__prose">
          {expanded ? intuition : preview}
        </p>

        {isLong && (
          <button
            className="is-summary__toggle"
            onClick={() => setExpanded((v: boolean) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? 'Show less' : 'Read more'}
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
            >
              <ChevronDown size={13} strokeWidth={2.5} />
            </motion.span>
          </button>
        )}
      </div>
    </motion.div>
  );
});
IntuitionSummary.displayName = 'IntuitionSummary';

interface Step {
  title: string;
  description: string;
  hint?: string;
}

interface StepCardProps {
  step: Step;
  index: number;
  total: number;
}

const StepCard = memo(({ step, index, total }: StepCardProps) => {
  const isLast = index === total - 1;

  return (
    <div className="is-step" role="listitem">
      <div className="is-step__spine" aria-hidden="true">
        <motion.div
          className="is-step__node"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.28, delay: 0.15 + index * 0.1, type: 'spring', stiffness: 260 }}
        >
          {isLast
            ? <CheckCircle2 size={16} strokeWidth={2} className="is-step__node-icon is-step__node-icon--done" />
            : <Circle       size={16} strokeWidth={2} className="is-step__node-icon" />
          }
          <span className="is-step__number">{index + 1}</span>
        </motion.div>

        {!isLast && (
          <div className="is-step__connector-track">
            <motion.div
              className="is-step__connector-fill"
              custom={index}
              variants={CONNECTOR_VARIANTS}
              initial="hidden"
              animate="visible"
              style={{ originY: 0 }}
            />
          </div>
        )}
      </div>

      <motion.article
        className="is-step__card"
        custom={index}
        variants={CARD_VARIANTS}
        initial="hidden"
        animate="visible"
        whileHover={{ x: 4, transition: { duration: 0.15 } }}
        aria-label={`Step ${index + 1}: ${step.title}`}
      >
        <header className="is-step__card-header">
          <span className="is-step__eyebrow">Step {index + 1}</span>
          <h3 className="is-step__title">{step.title}</h3>
        </header>

        <p className="is-step__description">{step.description}</p>

        {step.hint && (
          <div className="is-step__hint">
            <Lightbulb size={11} strokeWidth={2} aria-hidden="true" />
            <span>{step.hint}</span>
          </div>
        )}
      </motion.article>
    </div>
  );
});
StepCard.displayName = 'StepCard';

interface StepTimelineProps {
  steps?: Step[];
}

const StepTimeline = memo(({ steps }: StepTimelineProps) => {
  if (!steps?.length) {
    return (
      <div className="is-empty" role="status">
        <ListOrdered size={22} strokeWidth={1.5} aria-hidden="true" />
        <p>No steps defined for this algorithm yet.</p>
      </div>
    );
  }

  return (
    <div
      className="is-timeline"
      role="list"
      aria-label={`${steps.length} algorithm steps`}
    >
      {steps.map((step: Step, i: number) => (
        <StepCard
          key={`${step.title}-${i}`}
          step={step}
          index={i}
          total={steps.length}
        />
      ))}
    </div>
  );
});
StepTimeline.displayName = 'StepTimeline';

interface Algorithm {
  name: string;
  intuition?: string;
  difficulty?: string;
  category?: string;
  steps?: Step[];
}

interface IntuitionSectionProps {
  algorithm?: Algorithm | null;
}

const IntuitionSection = ({ algorithm = null }: IntuitionSectionProps): React.ReactElement | null => {
  if (!algorithm) return null;

  return (
    <motion.section
      className="is-root section"
      aria-labelledby="is-heading"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <header className="section-header">
        <div className="section-icon" aria-hidden="true">
          <ListOrdered size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="section-title" id="is-heading">
            How It Works
          </h2>
          <p className="section-description">
            Step-by-step execution model for{' '}
            <strong>{algorithm.name}</strong>
          </p>
        </div>
      </header>

      <IntuitionSummary
        intuition={algorithm.intuition || ''}
        difficulty={algorithm.difficulty}
        category={algorithm.category}
      />

      <StepTimeline steps={algorithm.steps} />
    </motion.section>
  );
};

IntuitionSection.displayName = 'IntuitionSection';

export default memo(IntuitionSection);
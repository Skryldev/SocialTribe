import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, HardDrive, TrendingUp, TrendingDown, BarChart2, Sigma, LucideIcon } from 'lucide-react';
import katex from 'katex';
import './ComplexitySection.css';

const COMPLEXITY_CONFIG = [
  {
    key: 'timeComplexity',
    label: 'Time Complexity',
    Icon: Clock,
    ariaLabel: 'Time complexity',
    description: 'How execution time scales with input size',
  },
  {
    key: 'spaceComplexity',
    label: 'Space Complexity',
    Icon: HardDrive,
    ariaLabel: 'Space complexity',
    description: 'How memory usage scales with input size',
  },
  {
    key: 'bestCase',
    label: 'Best Case',
    Icon: TrendingDown,
    ariaLabel: 'Best case complexity',
    description: 'Optimal-input lower bound',
  },
  {
    key: 'worstCase',
    label: 'Worst Case',
    Icon: TrendingUp,
    ariaLabel: 'Worst case complexity',
    description: 'Pessimal-input upper bound',
  },
  {
    key: 'averageCase',
    label: 'Average Case',
    Icon: BarChart2,
    ariaLabel: 'Average case complexity',
    description: 'Expected performance over all inputs',
  },
];

const CARD_ANIMATION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  whileHover: { y: -3, transition: { duration: 0.15 } },
};

const renderLatex = (latex: string): string => {
  if (!latex) return '';
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: 'html',
    });
  } catch (err) {
    console.warn('[ComplexitySection] KaTeX render error:', err);
    return latex;
  }
};

interface ComplexityCardProps {
  Icon: LucideIcon;
  label: string;
  ariaLabel: string;
  value: string;
  index: number;
}

const ComplexityCard = memo(({ Icon, label, ariaLabel, value, index }: ComplexityCardProps) => {
  const html = useMemo(() => renderLatex(value), [value]);

  return (
    <motion.article
      className="cs-card"
      variants={CARD_ANIMATION}
      initial="initial"
      animate="animate"
      whileHover="whileHover"
      transition={{ delay: 0.35 + index * 0.07, duration: 0.3 }}
      aria-label={`${ariaLabel}: ${value}`}
    >
      <header className="cs-card__header">
        <span className="cs-card__icon" aria-hidden="true">
          <Icon size={14} strokeWidth={2} />
        </span>
        <span className="cs-card__label">{label}</span>
      </header>

      <div
        className="cs-card__value"
        dangerouslySetInnerHTML={{ __html: html }}
        title={value}
      />
    </motion.article>
  );
});

ComplexityCard.displayName = 'ComplexityCard';

interface ExplanationPanelProps {
  algorithmName: string;
  timeComplexity: string;
}

const ExplanationPanel = memo(({ algorithmName, timeComplexity }: ExplanationPanelProps) => {
  const html = useMemo(() => renderLatex(timeComplexity), [timeComplexity]);

  return (
    <motion.aside
      className="cs-explanation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
      aria-label="Complexity explanation"
    >
      <div className="cs-explanation__eyebrow">Understanding the Bounds</div>
      <p className="cs-explanation__body">
        <strong>Time Complexity</strong> measures how execution time grows with input size. For{' '}
        <strong>{algorithmName}</strong>, it is{' '}
        <span
          className="cs-explanation__highlight"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        . As the input (V&nbsp;vertices, E&nbsp;edges) grows, performance scales according to this
        bound.
      </p>
    </motion.aside>
  );
});

ExplanationPanel.displayName = 'ExplanationPanel';

interface ComplexitySectionProps {
  algorithm?: any;
}

const ComplexitySection = ({ algorithm = null }: ComplexitySectionProps): React.ReactElement | null => {
  if (!algorithm) return null;

  const activeComplexities = useMemo(
    () => COMPLEXITY_CONFIG.filter(({ key }) => Boolean(algorithm[key])),
    [algorithm],
  );

  if (activeComplexities.length === 0) return null;

  return (
    <motion.section
      className="cs-root"
      aria-labelledby="cs-heading"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <header className="cs-header">
        <span className="cs-header__icon" aria-hidden="true">
          <Sigma size={20} strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="cs-header__title" id="cs-heading">
            Complexity Analysis
          </h2>
          <p className="cs-header__subtitle">
            Theoretical computational complexity bounds for{' '}
            <strong>{algorithm.name}</strong>
          </p>
        </div>
      </header>

      <div
        className="cs-grid"
        role="list"
        aria-label="Complexity metrics"
        style={{ '--card-count': activeComplexities.length } as React.CSSProperties}
      >
        {activeComplexities.map(({ key, label, Icon, ariaLabel }, index) => (
          <div key={key} role="listitem">
            <ComplexityCard
              Icon={Icon}
              label={label}
              ariaLabel={ariaLabel}
              value={algorithm[key]}
              index={index}
            />
          </div>
        ))}
      </div>

      {algorithm.timeComplexity && (
        <ExplanationPanel
          algorithmName={algorithm.name}
          timeComplexity={algorithm.timeComplexity}
        />
      )}
    </motion.section>
  );
};

ComplexitySection.displayName = 'ComplexitySection';

export default memo(ComplexitySection);
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BenchmarkTool from './BenchmarkTool';

interface HeroSectionProps {
  algorithm: {
    id?: string;
    name: string;
    category?: string;
    intuition?: string;
    theory?: string;
  };
}

const HeroSection = ({ algorithm }: HeroSectionProps): React.ReactElement => {
  const [displayText, setDisplayText] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showBenchmark, setShowBenchmark] = useState<boolean>(false);
  const [intuition, setIntuition] = useState<string>('');

  const extractIntuitionFromMarkdown = (markdown: string): string => {
    if (!markdown || typeof markdown !== 'string') {
      return `Explore ${algorithm?.name || 'this algorithm'} in depth.`;
    }

    const lines = markdown.split('\n');
    let foundTheory = false;
    const intuitionText: string[] = [];

    for (const line of lines) {
      if (/^#+\s*Theory/i.test(line)) {
        foundTheory = true;
        continue;
      }

      if (foundTheory) {
        if (/^#+\s/.test(line)) break;

        if (intuitionText.length === 0 && line.trim() === '') {
          continue;
        }

        if (line.trim()) {
          intuitionText.push(line.trim());
        } else if (intuitionText.length > 0) {
          intuitionText.push(' ');
        }
      }
    }

    if (intuitionText.length === 0) {
      for (const line of lines) {
        if (line.trim() && !/^#+\s/.test(line)) {
          intuitionText.push(line.trim());
          break;
        }
      }
    }

    return intuitionText.join(' ') || `Explore ${algorithm?.name || 'this algorithm'} in depth.`;
  };

  useEffect(() => {
    if (!algorithm) return;

    if (algorithm.intuition) {
      setIntuition(algorithm.intuition);
      return;
    }

    if (algorithm.theory) {
      setIntuition(extractIntuitionFromMarkdown(algorithm.theory));
      return;
    }

    setIntuition(
      `Learn about ${algorithm.name || 'this algorithm'} through interactive exploration.`
    );
  }, [algorithm]);

  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [intuition]);

  useEffect(() => {
    if (!intuition) return;

    if (currentIndex < intuition.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev: string) => prev + intuition[currentIndex]);
        setCurrentIndex((prev: number) => prev + 1);
      }, 30);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, intuition]);

  const name = algorithm?.name || 'Algorithm';
  const category = algorithm?.category || '';

  if (!algorithm || !algorithm.name) {
    return (
      <div
        className="hero-section"
        style={{ padding: '40px', textAlign: 'center' }}
      >
        <p>Select an algorithm to begin</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="hero-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ flex: 1 }}>
            <motion.div
              className="algorithm-badge"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {category === 'graph' ? '◈' : '◆'}{' '}
              {category?.toUpperCase() || 'ALGORITHM'}
            </motion.div>

            <motion.h1
              className="algorithm-title"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {name}
            </motion.h1>

            <motion.div
              className="typewriter-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="typewriter-text">{displayText}</span>

              <motion.span
                className="typewriter-cursor"
                animate={{ opacity: [1, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              >
                |
              </motion.span>
            </motion.div>
          </div>

          <motion.button
            onClick={() => setShowBenchmark(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{
              scale: 1.05,
              boxShadow: '0 0 30px rgba(79,110,247,0.3)',
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '16px 24px',
              background:
                'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '20px',
              flexShrink: 0,
            }}
          >
            ⚡ Benchmark
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showBenchmark && (
          <BenchmarkTool
            algorithm={algorithm}
            onClose={() => setShowBenchmark(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default HeroSection;
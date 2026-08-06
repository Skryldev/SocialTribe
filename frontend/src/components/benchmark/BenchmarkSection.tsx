import React from 'react';
import { motion } from 'framer-motion';

interface BenchmarkData {
  small: { time: number; n: number; memory: number; throughput: number };
  medium: { time: number; n: number; memory: number; throughput: number };
  large: { time: number; n: number; memory: number; throughput: number };
}

interface Algorithm {
  name: string;
}

interface BenchmarkSectionProps {
  algorithm: Algorithm;
  benchmark: BenchmarkData;
}

const BenchmarkSection = ({ algorithm, benchmark }: BenchmarkSectionProps): React.ReactElement | null => {
  if (!benchmark) return null;

  const getBarWidth = (value: number, max: number): string => {
    return `${(value / max) * 100}%`;
  };

  const maxTime = Math.max(
    benchmark.small.time,
    benchmark.medium.time,
    benchmark.large.time
  );

  const getBarClass = (value: number, max: number): string => {
    const ratio = value / max;
    if (ratio < 0.33) return 'fast';
    if (ratio < 0.66) return 'medium';
    return 'slow';
  };

  return (
    <motion.div
      className="section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <div className="section-header">
        <div className="section-icon">⏱</div>
        <div>
          <h2 className="section-title">Benchmark Results</h2>
          <p className="section-description">
            Empirical performance measurements across different input sizes
          </p>
        </div>
      </div>

      <div className="benchmark-section">
        <div className="benchmark-header">
          <div className="benchmark-title">
            {algorithm.name} Performance
            <span className="benchmark-badge">Empirical Data</span>
          </div>
        </div>

        <table className="benchmark-table">
          <thead>
            <tr>
              <th>Input Size</th>
              <th>Elements</th>
              <th>Execution Time</th>
              <th>Memory Used</th>
              <th>Throughput</th>
            </tr>
          </thead>
          <tbody>
            <motion.tr
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <td style={{ fontWeight: 600 }}>Small</td>
              <td>{benchmark.small.n.toLocaleString()}</td>
              <td>
                <span className="benchmark-value">{benchmark.small.time.toFixed(2)}</span>
                <span className="benchmark-unit">ms</span>
              </td>
              <td>
                <span className="benchmark-value">{(benchmark.small.memory / 1024).toFixed(1)}</span>
                <span className="benchmark-unit">KB</span>
              </td>
              <td>
                <span className="benchmark-value">{benchmark.small.throughput.toLocaleString()}</span>
                <span className="benchmark-unit">ops/s</span>
              </td>
              <td>
                <div className="benchmark-bar-container">
                  <motion.div
                    className={`benchmark-bar ${getBarClass(benchmark.small.time, maxTime)}`}
                    initial={{ width: 0 }}
                    animate={{ width: getBarWidth(benchmark.small.time, maxTime) }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                  />
                </div>
              </td>
            </motion.tr>

            <motion.tr
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.85 }}
            >
              <td style={{ fontWeight: 600 }}>Medium</td>
              <td>{benchmark.medium.n.toLocaleString()}</td>
              <td>
                <span className="benchmark-value">{benchmark.medium.time.toFixed(2)}</span>
                <span className="benchmark-unit">ms</span>
              </td>
              <td>
                <span className="benchmark-value">{(benchmark.medium.memory / 1024).toFixed(1)}</span>
                <span className="benchmark-unit">KB</span>
              </td>
              <td>
                <span className="benchmark-value">{benchmark.medium.throughput.toLocaleString()}</span>
                <span className="benchmark-unit">ops/s</span>
              </td>
              <td>
                <div className="benchmark-bar-container">
                  <motion.div
                    className={`benchmark-bar ${getBarClass(benchmark.medium.time, maxTime)}`}
                    initial={{ width: 0 }}
                    animate={{ width: getBarWidth(benchmark.medium.time, maxTime) }}
                    transition={{ duration: 0.8, delay: 0.95 }}
                  />
                </div>
              </td>
            </motion.tr>

            <motion.tr
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
            >
              <td style={{ fontWeight: 600 }}>Large</td>
              <td>{benchmark.large.n.toLocaleString()}</td>
              <td>
                <span className="benchmark-value">{benchmark.large.time.toFixed(2)}</span>
                <span className="benchmark-unit">ms</span>
              </td>
              <td>
                <span className="benchmark-value">{(benchmark.large.memory / 1024).toFixed(1)}</span>
                <span className="benchmark-unit">KB</span>
              </td>
              <td>
                <span className="benchmark-value">{benchmark.large.throughput.toLocaleString()}</span>
                <span className="benchmark-unit">ops/s</span>
              </td>
              <td>
                <div className="benchmark-bar-container">
                  <motion.div
                    className={`benchmark-bar ${getBarClass(benchmark.large.time, maxTime)}`}
                    initial={{ width: 0 }}
                    animate={{ width: getBarWidth(benchmark.large.time, maxTime) }}
                    transition={{ duration: 0.8, delay: 1.1 }}
                  />
                </div>
              </td>
            </motion.tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default BenchmarkSection;
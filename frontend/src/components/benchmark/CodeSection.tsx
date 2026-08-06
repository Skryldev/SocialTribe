import React, {
  useState, useEffect, useCallback, useMemo, useRef, memo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2, Copy, Check, BookOpen, Plus, ExternalLink,
  AlertCircle, Loader2, FileCode2, WrapText, AlignLeft,
} from 'lucide-react';
import { FaGithub } from "react-icons/fa";
import { FaGolang, FaPython, FaJava, FaRust, FaPhp } from 'react-icons/fa6';
import { TbBrandCSharp } from 'react-icons/tb';
import { SiCplusplus } from 'react-icons/si';
import { IoLogoJavascript } from 'react-icons/io';
import './CodeSection.css';

const LANGUAGE_CONFIG: any = {
  python:     { id: 'python',     name: 'Python',     Icon: FaPython,        color: '#3776AB', extension: '.py'   },
  javascript: { id: 'javascript', name: 'JavaScript', Icon: IoLogoJavascript, color: '#F7DF1E', extension: '.js'   },
  java:       { id: 'java',       name: 'Java',       Icon: FaJava,           color: '#E76F00', extension: '.java' },
  cpp:        { id: 'cpp',        name: 'C++',        Icon: SiCplusplus,      color: '#00599C', extension: '.cpp'  },
  rust:       { id: 'rust',       name: 'Rust',       Icon: FaRust,           color: '#CE412B', extension: '.rs'   },
  golang:     { id: 'golang',     name: 'Go',         Icon: FaGolang,         color: '#00ADD8', extension: '.go'   },
  csharp:     { id: 'csharp',     name: 'C#',         Icon: TbBrandCSharp,    color: '#9B59B6', extension: '.cs'   },
  php:        { id: 'php',        name: 'PHP',        Icon: FaPhp,            color: '#777BB4', extension: '.php'  },
};

const implementationFiles: Record<string, any> = (import.meta as any).glob(
  "./content/**/implementations/*",
  {
    eager: true,
    query: "?raw",
    import: "default",
  }
);

const HIGHLIGHT_RULES = [
  { re: /("""[\s\S]*?"""|'''[\s\S]*?'''|`[^`]*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, cls: 'hl-string'  },
  { re: /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g,                                         cls: 'hl-comment' },
  { re: /\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[uUlLfF]*)\b/g,                                cls: 'hl-number'  },
  {
    re: /\b(abstract|and|as|async|await|break|case|catch|class|const|continue|def|default|defer|delete|do|else|enum|except|extends|extern|false|finally|fn|for|from|func|go|goto|if|impl|import|in|interface|is|lambda|let|loop|match|mod|move|mut|namespace|new|nil|not|null|operator|or|override|package|pass|private|protected|pub|public|raise|ref|return|self|static|struct|super|switch|this|throw|trait|true|try|type|typeof|union|unsafe|use|var|virtual|void|where|while|with|yield)\b/g,
    cls: 'hl-keyword',
  },
  {
    re: /\b(Array|Boolean|Console|Dict|Exception|False|Float|Function|HashMap|HashSet|Int|List|Map|None|Object|Option|Print|Promise|Result|Set|String|True|Vec|bool|byte|char|double|float|int|long|print|println|rune|short|str|string|tuple|uint|usize|isize)\b/g,
    cls: 'hl-builtin',
  },
  { re: /(@\w+)/g, cls: 'hl-decorator' },
  { re: /\b(def|fn|func|function)\s+(\w+)/g, cls: 'hl-function', group: 2 },
];

const tokenizeLine = (text: string, _langId: string): React.ReactNode[] => {
  if (!text.trim()) return [<span key="empty"> </span>];

  const ranges: { start: number; end: number; cls: string }[] = [];

  HIGHLIGHT_RULES.forEach(({ re, cls, group }) => {
    const regex = new RegExp(re.source, re.flags);
    let m;
    while ((m = regex.exec(text)) !== null) {
      const matchText = group ? m[group] : m[0];
      const start = group ? m.index + m[0].indexOf(matchText) : m.index;
      const end = start + matchText.length;
      if (!ranges.some((r) => start < r.end && end > r.start)) {
        ranges.push({ start, end, cls });
      }
    }
  });

  ranges.sort((a, b) => a.start - b.start);

  const spans: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(({ start, end, cls }, i) => {
    if (cursor < start) spans.push(<span key={`p-${i}`}>{text.slice(cursor, start)}</span>);
    spans.push(<span key={`t-${i}`} className={cls}>{text.slice(start, end)}</span>);
    cursor = end;
  });
  if (cursor < text.length) spans.push(<span key="tail">{text.slice(cursor)}</span>);

  return spans;
};

const getImplementation = (algorithmId: string, language: string): any => {
  const ext = LANGUAGE_CONFIG[language].extension;

  const candidates = [
    `./content/${algorithmId}/implementations/${algorithmId}${ext}`,
    `./content/${algorithmId}/implementations/bfs${ext}`,
    `./content/${algorithmId}/implementations/${language}${ext}`,
    `./content/${algorithmId}/implementations/${algorithmId}_${language}${ext}`,
  ];

  for (const path of candidates) {
    if (implementationFiles[path]) {
      return implementationFiles[path];
    }
  }

  return null;
};

const useCodeLoader = (algorithm: any, initialLanguage: string = 'python'): any => {
  const [codeContent, setCodeContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fileStatus, setFileStatus] = useState<any>({});
  const [activeLanguage, setActiveLanguage] = useState<string>(initialLanguage);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  useEffect(() => {
    if (!algorithm?.id) {
      setLoading(false);
      return;
    }

    const status: any = {};

    Object.keys(LANGUAGE_CONFIG).forEach((lang: string) => {
      status[lang] = getImplementation(algorithm.id, lang)
        ? 'exists'
        : 'not-found';
    });

    setFileStatus(status);
    setLoading(false);
  }, [algorithm?.id]);

  useEffect(() => {
    if (!algorithm?.id) return;

    setIsSwitching(true);
    setError(null);

    try {
      const implementation = getImplementation(
        algorithm.id,
        activeLanguage
      );

      if (implementation) {
        setCodeContent(implementation);
      } else {
        setCodeContent('');
      }
    } catch (err: any) {
      setError(err.message);
      setCodeContent('');
    } finally {
      setIsSwitching(false);
    }
  }, [algorithm?.id, activeLanguage]);

  return {
    codeContent,
    loading,
    error,
    fileStatus,
    activeLanguage,
    setActiveLanguage,
    isSwitching,
  };
};

interface LanguageSelectorProps {
  languages: [string, any][];
  activeLanguage: string;
  fileStatus: any;
  onSwitch: (langKey: string) => void;
}

const LanguageSelector = memo(({ languages, activeLanguage, fileStatus, onSwitch }: LanguageSelectorProps) => (
  <div className="cds-lang-bar" role="tablist" aria-label="Select programming language">
    {languages.map(([langKey, lang]) => {
      const isActive    = activeLanguage === langKey;
      const status      = fileStatus[langKey];
      const isAvailable = status === 'exists';
      const isProbing   = !status || status === 'loading';

      return (
        <motion.button
          key={langKey}
          role="tab"
          aria-selected={isActive}
          aria-label={`${lang.name}${!isAvailable && !isProbing ? ' (unavailable)' : ''}`}
          className={[
            'cds-lang-btn',
            isActive    ? 'cds-lang-btn--active'    : '',
            !isAvailable && !isProbing ? 'cds-lang-btn--unavailable' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => onSwitch(langKey)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.15 }}
        >
          <span className="cds-lang-btn__icon" aria-hidden="true">
            <lang.Icon size={16} color={isActive ? lang.color : 'currentColor'} />
          </span>

          <span className="cds-lang-btn__name">{lang.name}</span>

          {!isProbing && (
            <span
              className={`cds-lang-btn__dot ${isAvailable ? 'cds-lang-btn__dot--ok' : 'cds-lang-btn__dot--miss'}`}
              aria-hidden="true"
            />
          )}
          {isProbing && (
            <motion.span
              className="cds-lang-btn__dot cds-lang-btn__dot--probe"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              aria-hidden="true"
            />
          )}

          {isActive && (
            <motion.div
              className="cds-lang-btn__underline"
              layoutId="langUnderline"
              style={{ backgroundColor: lang.color }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            />
          )}
        </motion.button>
      );
    })}
  </div>
));
LanguageSelector.displayName = 'LanguageSelector';

interface CodeToolbarProps {
  filename: string;
  lineCount: number;
  charCount: number;
  hasCode: boolean;
  copied: boolean;
  wrapLines: boolean;
  onCopy: () => void;
  onToggleWrap: () => void;
}

const CodeToolbar = memo(({ filename, lineCount, charCount, hasCode, copied, wrapLines, onCopy, onToggleWrap }: CodeToolbarProps) => (
  <div className="cds-toolbar">
    <div className="cds-toolbar__dots" aria-hidden="true">
      <span className="cds-dot cds-dot--red"    />
      <span className="cds-dot cds-dot--yellow" />
      <span className="cds-dot cds-dot--green"  />
    </div>

    <motion.span
      className="cds-toolbar__filename"
      key={filename}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <FileCode2 size={12} strokeWidth={2} aria-hidden="true" />
      {filename}
    </motion.span>

    {hasCode && (
      <div className="cds-toolbar__stats" aria-label={`${lineCount} lines, ${charCount} characters`}>
        <span>{lineCount} lines</span>
        <span className="cds-toolbar__stats-sep">·</span>
        <span>{charCount.toLocaleString()} chars</span>
      </div>
    )}

    <div className="cds-toolbar__actions">
      {hasCode && (
        <motion.button
          className="cds-toolbar__btn"
          onClick={onToggleWrap}
          title={wrapLines ? 'Disable line wrap' : 'Enable line wrap'}
          aria-label={wrapLines ? 'Disable line wrap' : 'Enable line wrap'}
          aria-pressed={wrapLines}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {wrapLines
            ? <AlignLeft   size={13} strokeWidth={2} aria-hidden="true" />
            : <WrapText    size={13} strokeWidth={2} aria-hidden="true" />
          }
        </motion.button>
      )}

      {hasCode && (
        <motion.button
          className={`cds-toolbar__btn cds-toolbar__btn--copy ${copied ? 'cds-toolbar__btn--copied' : ''}`}
          onClick={onCopy}
          aria-label={copied ? 'Copied!' : 'Copy code to clipboard'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                className="cds-toolbar__btn-inner"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
              >
                <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                Copied!
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                className="cds-toolbar__btn-inner"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
              >
                <Copy size={13} strokeWidth={2} aria-hidden="true" />
                Copy
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      )}
    </div>
  </div>
));
CodeToolbar.displayName = 'CodeToolbar';

interface CodeLineProps {
  line: string;
  index: number;
  isActive: boolean;
  langId: string;
  wrapLines: boolean;
  onEnter: (index: number) => void;
  onLeave: () => void;
}

const CodeLine = memo(({ line, index, isActive, langId, wrapLines, onEnter, onLeave }: CodeLineProps) => {
  const tokens = useMemo(() => tokenizeLine(line.replace(/\t/g, '    '), langId), [line, langId]);

  return (
    <div
      className={`cds-line ${isActive ? 'cds-line--active' : ''}`}
      onMouseEnter={() => onEnter(index)}
      onMouseLeave={onLeave}
      aria-label={`Line ${index + 1}`}
    >
      <span className="cds-line__num" aria-hidden="true">{index + 1}</span>
      <span className={`cds-line__code ${wrapLines ? 'cds-line__code--wrap' : ''}`}>
        {tokens}
      </span>
    </div>
  );
});
CodeLine.displayName = 'CodeLine';

interface CodeNotFoundProps {
  language: any;
  algorithmName: string;
  githubRepo: string;
}

const CodeNotFound = memo(({ language, algorithmName, githubRepo }: CodeNotFoundProps) => {
  const LangIcon  = language?.Icon ?? Code2;
  const slugName  = algorithmName?.toLowerCase().replace(/\s+/g, '_') ?? 'algorithm';
  const fileName  = `${slugName}${language?.extension ?? '.txt'}`;
  const filePath  = `src/components/benchmark/content/${slugName}/implementations/${fileName}`;

  return (
    <motion.div
      className="cds-notfound"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28 }}
    >
      <motion.div
        className="cds-notfound__icon"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <LangIcon size={52} color={language?.color ?? 'var(--text-muted)'} />
      </motion.div>

      <span className="cds-notfound__badge">Coming Soon</span>

      <h3 className="cds-notfound__title">Implementation not available</h3>
      <p className="cds-notfound__desc">
        The <strong>{language?.name ?? 'language'}</strong> implementation
        for <strong>{algorithmName}</strong> hasn't been added yet.
      </p>

      <div className="cds-notfound__info">
        <div className="cds-notfound__info-row">
          <span className="cds-notfound__info-label">Expected location</span>
          <code className="cds-notfound__info-path">{filePath}</code>
        </div>
        <div className="cds-notfound__info-row">
          <span className="cds-notfound__info-label">File name</span>
          <code className="cds-notfound__info-path">{fileName}</code>
        </div>
      </div>

      <div className="cds-notfound__actions">
        <motion.a
          href={githubRepo}
          target="_blank"
          rel="noopener noreferrer"
          className="cds-notfound__cta cds-notfound__cta--primary"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          <FaGithub size={16} strokeWidth={2} aria-hidden="true" />
          View on GitHub
          <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
        </motion.a>

        <motion.a
          href={`${githubRepo}/issues/new`}
          target="_blank"
          rel="noopener noreferrer"
          className="cds-notfound__cta cds-notfound__cta--secondary"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={15} strokeWidth={2} aria-hidden="true" />
          Request implementation
        </motion.a>

        <motion.a
          href={`${githubRepo}/blob/main/CONTRIBUTING.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="cds-notfound__cta cds-notfound__cta--ghost"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          <BookOpen size={14} strokeWidth={2} aria-hidden="true" />
          Contributing guide
        </motion.a>
      </div>

      <p className="cds-notfound__footer">
        Submit a pull request to add this implementation.
      </p>
    </motion.div>
  );
});
CodeNotFound.displayName = 'CodeNotFound';

interface CodeSectionProps {
  algorithm?: any;
  githubRepo?: string;
}

const CodeSection = ({ algorithm = null, githubRepo = 'https://github.com/Asky23' }: CodeSectionProps): React.ReactElement => {
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [copied,     setCopied]     = useState<boolean>(false);
  const [wrapLines,  setWrapLines]  = useState<boolean>(false);
  const codeRef = useRef<HTMLDivElement>(null);

  const {
    codeContent, loading, error, fileStatus,
    activeLanguage, setActiveLanguage, isSwitching,
  } = useCodeLoader(algorithm);

  const currentLang = LANGUAGE_CONFIG[activeLanguage] ?? LANGUAGE_CONFIG.python;
  const languages   = useMemo(() => Object.entries(LANGUAGE_CONFIG), []);
  const codeLines   = useMemo(() => codeContent ? codeContent.split('\n') : [], [codeContent]);
  const hasCode     = fileStatus[activeLanguage] === 'exists' && codeContent?.trim().length > 0;
  const charCount   = useMemo(() => codeContent?.length ?? 0, [codeContent]);
  const filename    = `${algorithm?.id ?? 'file'}${currentLang.extension}`;

  const handleLanguageSwitch = useCallback((langKey: string) => {
    if (langKey === activeLanguage) return;
    setActiveLanguage(langKey);
  }, [activeLanguage, setActiveLanguage]);

  const handleCopy = useCallback(async () => {
    if (!codeContent) return;
    try {
      await navigator.clipboard.writeText(codeContent);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = codeContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeContent]);

  const handleLineEnter = useCallback((i: number) => setActiveLine(i), []);
  const handleLineLeave = useCallback(() => setActiveLine(null), []);

  if (!algorithm?.id) {
    return (
      <motion.section
        className="cds-root section"
        aria-labelledby="cds-heading"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <header className="section-header">
          <div className="section-icon" aria-hidden="true">
            <Code2 size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="section-title" id="cds-heading">Implementation</h2>
            <p className="section-description">Select an algorithm to view its code</p>
          </div>
        </header>
        <div className="cds-placeholder">
          <Code2 size={28} strokeWidth={1.25} aria-hidden="true" />
          <p>No algorithm selected</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="cds-root section"
      aria-labelledby="cds-heading"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <header className="section-header">
        <div className="section-icon" aria-hidden="true">
          <Code2 size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="section-title" id="cds-heading">Implementation</h2>
          <p className="section-description">
            Production-ready{' '}
            <strong>{currentLang.name}</strong> implementation of{' '}
            <strong>{algorithm.name}</strong>
          </p>
        </div>
      </header>

      <LanguageSelector
        languages={languages}
        activeLanguage={activeLanguage}
        fileStatus={fileStatus}
        onSwitch={handleLanguageSwitch}
      />

      <div className="cds-panel" ref={codeRef}>
        <CodeToolbar
          filename={filename}
          lineCount={codeLines.length}
          charCount={charCount}
          hasCode={hasCode}
          copied={copied}
          wrapLines={wrapLines}
          onCopy={handleCopy}
          onToggleWrap={() => setWrapLines((v: boolean) => !v)}
        />

        <div className="cds-viewport" tabIndex={0} aria-label={`${filename} code viewer`}>
          {loading ? (
            <div className="cds-state cds-state--loading" role="status" aria-label="Loading code">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                aria-hidden="true"
              >
                <Loader2 size={22} strokeWidth={1.5} />
              </motion.span>
              <span>Loading implementation…</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {hasCode ? (
                <motion.div
                  key={`code-${activeLanguage}`}
                  className="cds-code"
                  initial={{ opacity: 0, x: isSwitching ? 16 : 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  role="region"
                  aria-label={`${currentLang.name} code`}
                >
                  {codeLines.map((line: string, i: number) => (
                    <CodeLine
                      key={`${activeLanguage}-${i}`}
                      line={line}
                      index={i}
                      isActive={activeLine === i}
                      langId={activeLanguage}
                      wrapLines={wrapLines}
                      onEnter={handleLineEnter}
                      onLeave={handleLineLeave}
                    />
                  ))}
                </motion.div>
              ) : (
                <CodeNotFound
                  key={`notfound-${activeLanguage}`}
                  language={currentLang}
                  algorithmName={algorithm.name}
                  githubRepo={githubRepo}
                />
              )}
            </AnimatePresence>
          )}

          {error && !loading && (
            <div className="cds-state cds-state--error" role="alert">
              <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
              {error}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
};

CodeSection.displayName = 'CodeSection';

export default memo(CodeSection);
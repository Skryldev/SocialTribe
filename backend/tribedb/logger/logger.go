package logger

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	logger *zap.Logger
	once   sync.Once
	mu     sync.RWMutex
)

// ─── Config ───────────────────────────────────────────────────────────────────

type Config struct {
	FilePath    string
	Level       string
	Environment string
	OutputMode  OutputMode
}

type OutputMode string

const (
	OutputFile   OutputMode = "file"
	OutputStdout OutputMode = "stdout"
	OutputBoth   OutputMode = "both"
)

func DefaultConfig() Config {
	return Config{
		FilePath:    "logs/storage/app.jsonl",
		Level:       "info",
		Environment: "development",
		OutputMode:  OutputBoth,
	}
}

// ─── Init ────────────────────────────────────────────────────────────────────

func Init(cfg Config) error {
	var err error
	once.Do(func() {
		err = initLogger(cfg)
	})
	return err
}

func initLogger(cfg Config) error {
	// ─── تشخیص محیط ──────────────────────────────────────────────────────────
	if os.Getenv("DOCKER_ENV") == "true" ||
		os.Getenv("CONTAINER_RUNTIME") != "" ||
		os.Getenv("LOG_OUTPUT") == "stdout" {
		cfg.OutputMode = OutputStdout
	}

	// ─── تنظیمات Encoder ──────────────────────────────────────────────────
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "timestamp",
		LevelKey:       "level",
		NameKey:        "logger",
		CallerKey:      "caller",
		FunctionKey:    zapcore.OmitKey,
		MessageKey:     "message",
		StacktraceKey:  "stacktrace",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.StringDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	level := parseLevel(cfg.Level)

	// ─── ایجاد Writer ──────────────────────────────────────────────────────
	var writers []zapcore.WriteSyncer

	// همیشه stdout
	writers = append(writers, zapcore.AddSync(os.Stdout))

	// فایل (در صورت نیاز)
	if cfg.OutputMode == OutputFile || cfg.OutputMode == OutputBoth {
		if err := os.MkdirAll(filepath.Dir(cfg.FilePath), 0755); err != nil {
			// فقط warning, ادامه با stdout
			fmt.Fprintf(os.Stderr, "⚠️ Failed to create log directory: %v\n", err)
		} else {
			file, err := os.OpenFile(cfg.FilePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if err != nil {
				fmt.Fprintf(os.Stderr, "⚠️ Failed to open log file: %v\n", err)
			} else {
				writers = append(writers, zapcore.AddSync(file))
			}
		}
	}

	// ─── Core ──────────────────────────────────────────────────────────────
	core := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderConfig),
		zapcore.NewMultiWriteSyncer(writers...),
		zap.NewAtomicLevelAt(level),
	)

	// ─── Base Fields ──────────────────────────────────────────────────────
	baseFields := []zap.Field{
		zap.String("environment", cfg.Environment),
		zap.String("hostname", getHostname()),
	}

	if pid := os.Getpid(); pid > 0 {
		baseFields = append(baseFields, zap.Int("pid", pid))
	}

	// ─── Logger ────────────────────────────────────────────────────────────
	baseLogger := zap.New(core,
		zap.AddCaller(),
		zap.AddCallerSkip(1),
		zap.AddStacktrace(zapcore.ErrorLevel),
	)

	mu.Lock()
	logger = baseLogger.With(baseFields...)
	mu.Unlock()

	// ─── لاگ شروع (اصلاح شده) ────────────────────────────────────────────
	InfoFields("logger", "✅ Logger initialized",
		String("mode", string(cfg.OutputMode)),
		String("level", cfg.Level),
	)

	return nil
}

// ─── Helper Functions ──────────────────────────────────────────────────────

func getHostname() string {
	hostname, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return hostname
}

func parseLevel(level string) zapcore.Level {
	switch strings.ToLower(level) {
	case "debug":
		return zapcore.DebugLevel
	case "info":
		return zapcore.InfoLevel
	case "warn", "warning":
		return zapcore.WarnLevel
	case "error":
		return zapcore.ErrorLevel
	case "fatal":
		return zapcore.FatalLevel
	default:
		return zapcore.InfoLevel
	}
}

// ─── Core Logger Functions ────────────────────────────────────────────────

func getLogger() *zap.Logger {
	mu.RLock()
	defer mu.RUnlock()

	if logger == nil {
		// Fallback: initialize with defaults
		_ = Init(DefaultConfig())
		mu.RLock()
		defer mu.RUnlock()
	}
	return logger
}

func Debug(module, msg string) {
	getLogger().Debug(msg, zap.String("module", module))
}

func Info(module, msg string) {
	getLogger().Info(msg, zap.String("module", module))
}

func Warn(module, msg string) {
	getLogger().Warn(msg, zap.String("module", module))
}

func Error(module, msg string) {
	getLogger().Error(msg, zap.String("module", module))
}

func Fatal(module, msg string) {
	getLogger().Fatal(msg, zap.String("module", module))
}

// ─── With Fields ──────────────────────────────────────────────────────────

func DebugFields(module, msg string, fields ...zap.Field) {
	allFields := append([]zap.Field{zap.String("module", module)}, fields...)
	getLogger().Debug(msg, allFields...)
}

func InfoFields(module, msg string, fields ...zap.Field) {
	allFields := append([]zap.Field{zap.String("module", module)}, fields...)
	getLogger().Info(msg, allFields...)
}

func WarnFields(module, msg string, fields ...zap.Field) {
	allFields := append([]zap.Field{zap.String("module", module)}, fields...)
	getLogger().Warn(msg, allFields...)
}

func ErrorFields(module, msg string, fields ...zap.Field) {
	allFields := append([]zap.Field{zap.String("module", module)}, fields...)
	getLogger().Error(msg, allFields...)
}

func FatalFields(module, msg string, fields ...zap.Field) {
	allFields := append([]zap.Field{zap.String("module", module)}, fields...)
	getLogger().Fatal(msg, allFields...)
}

// ─── With Context ─────────────────────────────────────────────────────────

func With(fields ...zap.Field) *zap.Logger {
	return getLogger().With(fields...)
}

func Named(name string) *zap.Logger {
	return getLogger().Named(name)
}

// ─── Field Helpers ────────────────────────────────────────────────────────

func Status(code int) zap.Field {
	return zap.Int("status", code)
}

func Port(p int) zap.Field {
	return zap.Int("port", p)
}

func String(key, val string) zap.Field {
	return zap.String(key, val)
}

func Int(key string, val int) zap.Field {
	return zap.Int(key, val)
}

func Int64(key string, val int64) zap.Field {
	return zap.Int64(key, val)
}

func Uint64(key string, val uint64) zap.Field {
	return zap.Uint64(key, val)
}

func Float64(key string, val float64) zap.Field {
	return zap.Float64(key, val)
}

func Bool(key string, val bool) zap.Field {
	return zap.Bool(key, val)
}

func Duration(key string, val time.Duration) zap.Field {
	return zap.Duration(key, val)
}

func Err(err error) zap.Field {
	return zap.Error(err)
}

func Any(key string, val interface{}) zap.Field {
	return zap.Any(key, val)
}

func Strings(key string, val []string) zap.Field {
	return zap.Strings(key, val)
}

func Ints(key string, val []int) zap.Field {
	return zap.Ints(key, val)
}

func Float64s(key string, val []float64) zap.Field {
	return zap.Float64s(key, val)
}

// ─── Sync ─────────────────────────────────────────────────────────────────

func Sync() error {
	mu.RLock()
	defer mu.RUnlock()

	if logger != nil {
		return logger.Sync()
	}
	return nil
}

// ─── For Testing ──────────────────────────────────────────────────────────

func TestInit() {
	cfg := Config{
		FilePath:    "logs/test.jsonl",
		Level:       "debug",
		Environment: "test",
		OutputMode:  OutputStdout,
	}
	_ = Init(cfg)
}

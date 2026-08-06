import React, { useState } from 'react';
import * as Select from '@radix-ui/react-select';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { 
  ChevronDown, 
  Check, 
  Loader2, 
  Upload, 
  Copy, 
  CheckCircle2,
  LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import './Primitives.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps {
  value: string;
  onValueChange: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectInput({ 
  value, 
  onValueChange, 
  options = [], 
  placeholder = 'Select...',
  disabled = false,
  className = '',
}: SelectInputProps): React.ReactElement {
  return (
    <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger 
        className={`ip-select-trigger ${className}`}
        aria-label={placeholder}
      >
        <Select.Value placeholder={placeholder} className="ip-select-value" />
        <Select.Icon asChild>
          <ChevronDown size={14} className="ip-select-chevron" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="ip-select-content" position="popper" sideOffset={4}>
          <Select.Viewport>
            {options.map((option: SelectOption) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="ip-select-item"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="ip-select-item-indicator">
                  <Check size={12} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

interface ActionButtonProps {
  icon?: LucideIcon;
  label?: string;
  onClick?: () => void;
  variant?: string;
  size?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export function ActionButton({ 
  icon: Icon,
  label,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  style = {},
  type = 'button',
  title = '',
}: ActionButtonProps): React.ReactElement {
  const sizeClass = size !== 'md' ? ` ip-btn--${size}` : '';
  
  return (
    <motion.button
      className={`ip-btn ip-btn--${variant}${loading ? ' ip-btn--loading' : ''}${disabled ? ' ip-btn--disabled' : ''}${sizeClass} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      style={style}
      type={type}
      title={title}
    >
      {loading ? (
        <Loader2 size={Icon ? 14 : 16} className="ip-spinner" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 12 : 14} />
      ) : null}
      {label && <span>{loading ? `${label}...` : label}</span>}
    </motion.button>
  );
}

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  variant?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
  size?: number;
}

export function IconButton({ 
  icon: Icon,
  onClick,
  variant = 'restore',
  loading = false,
  disabled = false,
  className = '',
  title = '',
  size = 16,
}: IconButtonProps): React.ReactElement {
  return (
    <motion.button
      className={`ip-icon-btn ip-icon-btn--${variant}${loading ? ' ip-icon-btn--loading' : ''}${disabled ? ' ip-icon-btn--disabled' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.9 } : {}}
      title={title}
      type="button"
    >
      {loading ? (
        <Loader2 size={size} className="ip-spinner" />
      ) : (
        <Icon size={size} />
      )}
    </motion.button>
  );
}

interface DropZoneProps {
  onFile?: (file: File) => void;
  accept?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function DropZone({ 
  onFile, 
  accept, 
  hint,
  disabled = false,
  className = '',
}: DropZoneProps): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && onFile) onFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFile) onFile(file);
    e.target.value = '';
  };

  return (
    <motion.div
      className={`ip-dropzone${isDragOver ? ' ip-dropzone--active' : ''}${disabled ? ' ip-dropzone--disabled' : ''} ${className}`}
      onDragOver={(e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && document.getElementById('dropzone-input')?.click()}
      whileHover={!disabled ? { borderColor: 'var(--iem-blue-border)' } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
    >
      <Upload size={24} className="ip-dropzone-icon" />
      <p className="ip-dropzone-text">
        Drop file here or <strong>browse</strong>
      </p>
      {hint && <p className="ip-dropzone-hint">{hint}</p>}
      <input
        id="dropzone-input"
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
    </motion.div>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ 
  label, 
  description,
  checked = false, 
  onCheckedChange,
  disabled = false,
  className = '',
}: ToggleProps): React.ReactElement {
  return (
    <div className={`ip-toggle-wrapper ${className}`}>
      <label className="ip-toggle">
        <div className={`ip-toggle-track${checked ? ' ip-toggle-track--on' : ''}`}>
          <motion.div 
            className="ip-toggle-thumb"
            animate={{ x: checked ? 14 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </div>
        <div className="ip-toggle-content">
          <span className="ip-toggle-label">{label}</span>
          {description && (
            <span className="ip-toggle-desc">{description}</span>
          )}
        </div>
      </label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange?.(e.target.checked)}
        disabled={disabled}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />
    </div>
  );
}

interface FormatOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface FormatToggleProps {
  options?: FormatOption[];
  value: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function FormatToggle({ 
  options = [], 
  value, 
  onValueChange,
  disabled = false,
  className = '',
}: FormatToggleProps): React.ReactElement {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(val: string) => val && onValueChange?.(val)}
      disabled={disabled}
      className={`ip-format-toggle ${className}`}
    >
      {options.map((option: FormatOption) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={`ip-format-option${value === option.value ? ' ip-format-option--active' : ''}`}
          disabled={disabled}
        >
          {option.icon && <option.icon size={14} />}
          <span>{option.label}</span>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = 'Copy', className = '' }: CopyButtonProps): React.ReactElement {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <ActionButton
      icon={copied ? CheckCircle2 : Copy}
      label={copied ? 'Copied!' : label}
      onClick={handleCopy}
      variant={copied ? 'primary' : 'secondary'}
      size="sm"
      className={className}
    />
  );
}
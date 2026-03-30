import { useEffect, useState } from 'react';

function sanitizeKeyboardValue(value, config = {}) {
  const { allowColon = false, maxLength, singleColon = true } = config;
  let nextValue = String(value ?? '');

  nextValue = allowColon
    ? nextValue.replace(/[^0-9:]/g, '')
    : nextValue.replace(/[^0-9]/g, '');

  if (!allowColon) {
    nextValue = nextValue.replace(/:/g, '');
  } else if (singleColon) {
    const colonIndex = nextValue.indexOf(':');
    if (colonIndex !== -1) {
      nextValue = `${nextValue.slice(0, colonIndex + 1)}${nextValue.slice(colonIndex + 1).replace(/:/g, '')}`;
    }
  }

  if (Number.isInteger(maxLength) && maxLength > 0) {
    nextValue = nextValue.slice(0, maxLength);
  }

  return nextValue;
}

export function useCustomKeyboard(fields) {
  const [activeField, setActiveField] = useState(null);
  const activeConfig = activeField ? fields[activeField] : null;

  useEffect(() => {
    if (!activeField) return;
    if (fields[activeField]) return;
    setActiveField(null);
  }, [activeField, fields]);

  const openKeyboard = (fieldName, event) => {
    if (!fields[fieldName]) return;

    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
      event.currentTarget?.blur?.();
    }

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setActiveField(fieldName);
  };

  const closeKeyboard = () => {
    setActiveField(null);
  };

  const setKeyboardValue = (nextValue) => {
    if (!activeConfig?.setValue) return;

    if (typeof nextValue === 'function') {
      activeConfig.setValue((previousValue) => (
        sanitizeKeyboardValue(nextValue(String(previousValue ?? '')), activeConfig)
      ));
      return;
    }

    activeConfig.setValue(sanitizeKeyboardValue(nextValue, activeConfig));
  };

  const handleKeyboardKeyPress = (key) => {
    if (!activeConfig) return;
    if (key === ':' && !activeConfig.allowColon) return;

    setKeyboardValue((previousValue) => `${previousValue}${key}`);
  };

  const handleKeyboardBackspace = () => {
    setKeyboardValue((previousValue) => previousValue.slice(0, -1));
  };

  const handleKeyboardSubmit = () => {
    activeConfig?.onSubmit?.();
    if (activeConfig?.closeOnSubmit !== false) {
      closeKeyboard();
    }
  };

  const getInputProps = (fieldName, extraProps = {}) => {
    const { className, onClick, onFocus, ...restProps } = extraProps;

    return {
      readOnly: true,
      inputMode: 'none',
      autoComplete: 'off',
      enterKeyHint: 'done',
      className: ['custom-keyboard-target', className].filter(Boolean).join(' '),
      onFocus: (event) => {
        openKeyboard(fieldName, event);
        onFocus?.(event);
      },
      onClick: (event) => {
        openKeyboard(fieldName, event);
        onClick?.(event);
      },
      ...restProps,
    };
  };

  return {
    activeField,
    activeConfig,
    closeKeyboard,
    getInputProps,
    handleKeyboardBackspace,
    handleKeyboardKeyPress,
    handleKeyboardSubmit,
    showKeyboard: Boolean(activeConfig),
  };
}

export default function CustomKeyboard({
  visible,
  label,
  value,
  allowColon = false,
  submitLabel = 'إدخال',
  showPlaceholder = true,
  onInsert,
  onBackspace,
  onSubmit,
  onClose,
}) {
  if (!visible) return null;

  const keyRows = [
    { value: '1', area: 'one' },
    { value: '2', area: 'two' },
    { value: '3', area: 'three' },
    { value: '4', area: 'four' },
    { value: '5', area: 'five' },
    { value: '6', area: 'six' },
    { value: '7', area: 'seven' },
    { value: '8', area: 'eight' },
    { value: '9', area: 'nine' },
  ];

  return (
    <>
      <div className="custom-keyboard-spacer" aria-hidden="true" />
      <div className="custom-keyboard-shell" role="dialog" aria-label={label || 'لوحة إدخال'} aria-modal="false">
        <div className="custom-keyboard-sheet">
          <div className="custom-keyboard-entry-row">
            <div className="custom-keyboard-preview" dir="ltr">
              <span className="custom-keyboard-preview-text">
                {value || (showPlaceholder ? label : '') || ' '}
              </span>
              <span className="custom-keyboard-cursor" aria-hidden="true">|</span>
            </div>
            <button
              type="button"
              className="custom-keyboard-submit-top"
              onClick={onSubmit}
            >
              {submitLabel}
            </button>
            <button
              type="button"
              className="custom-keyboard-close-top"
              onClick={onClose}
              aria-label="إغلاق لوحة الإدخال"
            >
              إغلاق
            </button>
          </div>

          <div className="custom-keyboard-grid">
            {keyRows.map((key) => (
              <button
                key={key.value}
                type="button"
                className={`custom-keyboard-key custom-keyboard-key-${key.area}`}
                onClick={() => onInsert(key.value)}
              >
                {key.value}
              </button>
            ))}

            <button
              type="button"
              className="custom-keyboard-key custom-keyboard-key-erase custom-keyboard-key-alt"
              onClick={onBackspace}
            >
              ⌫
            </button>

            <button
              type="button"
              className="custom-keyboard-key custom-keyboard-key-zero"
              onClick={() => onInsert('0')}
            >
              0
            </button>

            <button
              type="button"
              className="custom-keyboard-key custom-keyboard-key-colon"
              onClick={() => onInsert(':')}
              disabled={!allowColon}
            >
              :
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

import React from 'react';

interface CloseButtonProps {
  onClick: () => void;
  variant?: 'icon' | 'label';
  label?: boolean;
  text?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

const CloseButton: React.FC<CloseButtonProps> = ({
  onClick,
  variant = 'icon',
  label = false,
  text = 'Close',
  ariaLabel,
  className = '',
  style,
}) => {
  if (variant === 'label' || label) {
    return (
      <button
        type="button"
        className={`hj-btn-close ${className}`}
        onClick={onClick}
        style={style}
      >
        {text}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`hj-icon-close ${className}`}
      onClick={onClick}
      aria-label={ariaLabel || 'Close'}
      style={style}
    >
      ✕
    </button>
  );
};

export default CloseButton;
import React from 'react';

interface DeactivateButtonProps {
  onClick: () => void;
  text?: string;
  iconOnly?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

const BlockIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <line x1="5.9" y1="5.9" x2="18.1" y2="18.1" />
  </svg>
);

const DeactivateButton: React.FC<DeactivateButtonProps> = ({
  onClick,
  text = 'Deactivate',
  iconOnly = false,
  disabled = false,
  title,
  className = '',
  style,
}) => {
  return (
    <button
      type="button"
      className={`hj-btn-deactivate ${iconOnly ? 'hj-btn-deactivate--icon' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title || (iconOnly ? 'Deactivate' : undefined)}
      style={style}
    >
      <BlockIcon />
      {!iconOnly && <span>{text}</span>}
    </button>
  );
};

export default DeactivateButton;
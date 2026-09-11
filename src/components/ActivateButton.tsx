import React from 'react';

interface ActivateButtonProps {
  onClick: () => void;
  text?: string;
  iconOnly?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

const PowerIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
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
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <line x1="12" y1="2" x2="12" y2="12" />
  </svg>
);

const ActivateButton: React.FC<ActivateButtonProps> = ({
  onClick,
  text = 'Activate',
  iconOnly = false,
  disabled = false,
  title,
  className = '',
  style,
}) => {
  return (
    <button
      type="button"
      className={`hj-btn-activate ${iconOnly ? 'hj-btn-activate--icon' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title || (iconOnly ? 'Activate' : undefined)}
      style={style}
    >
      <PowerIcon />
      {!iconOnly && <span>{text}</span>}
    </button>
  );
};

export default ActivateButton;
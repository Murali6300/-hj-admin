import React from 'react';

interface RemoveButtonProps {
  onClick: () => void;
  text?: string;
  iconOnly?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

const TrashIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
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
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const RemoveButton: React.FC<RemoveButtonProps> = ({
  onClick,
  text = 'Remove',
  iconOnly = false,
  disabled = false,
  title,
  className = '',
  style,
}) => {
  return (
    <button
      type="button"
      className={`hj-btn-remove ${iconOnly ? 'hj-btn-remove--icon' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title || (iconOnly ? 'Remove' : undefined)}
      style={style}
    >
      <TrashIcon />
      {!iconOnly && <span>{text}</span>}
    </button>
  );
};

export default RemoveButton;
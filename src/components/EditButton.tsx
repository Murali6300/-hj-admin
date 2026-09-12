import React from 'react';

interface EditButtonProps {
  onClick: () => void;
  text?: string;
  iconOnly?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

const EditIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
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
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const EditButton: React.FC<EditButtonProps> = ({
  onClick,
  text = 'Edit',
  iconOnly = false,
  disabled = false,
  title,
  className = '',
  style,
}) => {
  return (
    <button
      type="button"
      className={`hj-btn-edit ${iconOnly ? 'hj-btn-edit--icon' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title || (iconOnly ? 'Edit' : undefined)}
      style={style}
    >
      <EditIcon />
      {!iconOnly && <span>{text}</span>}
    </button>
  );
};

export default EditButton;
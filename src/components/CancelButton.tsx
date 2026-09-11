import React from 'react';

interface CancelButtonProps {
  onClick: () => void;
  text?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const CancelButton: React.FC<CancelButtonProps> = ({
  onClick,
  text = 'Cancel',
  disabled = false,
  className = '',
  style,
}) => {
  return (
    <button
      type="button"
      className={`hj-btn-cancel ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {text}
    </button>
  );
};

export default CancelButton;
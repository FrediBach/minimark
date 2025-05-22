import React from 'react';

interface SelectionRectangleProps {
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  } | null;
}

const SelectionRectangle: React.FC<SelectionRectangleProps> = ({ rect }) => {
  if (!rect || !rect.visible) {
    return null;
  }

  const style: React.CSSProperties = {
    position: 'fixed', // Relative to viewport, matching clientX/clientY
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    border: '1px dashed #007bff', // Standard blue dashed border
    backgroundColor: 'rgba(0, 123, 255, 0.1)', // Light blue semi-transparent background
    pointerEvents: 'none', // Ensures the rectangle doesn't interfere with other mouse events
    zIndex: 9999, // Ensure it's on top
  };

  return <div style={style} data-testid="selection-rectangle" />;
};

export default SelectionRectangle;
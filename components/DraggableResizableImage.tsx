import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DraggableResizableImageProps {
  src: string;
  initialPosition: { x: number; y: number };
  initialSize: { width: number; height: number };
  onUpdate: (pos: { x: number; y: number }, size: { width: number; height: number }) => void;
  bounds: { top: number; left: number; right: number; bottom: number };
}

type DragState = {
  active: boolean;
  type: 'move' | 'resize-br';
  offset: { x: number; y: number };
};

const DraggableResizableImage: React.FC<DraggableResizableImageProps> = ({ src, initialPosition, initialSize, onUpdate, bounds }) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isFocused, setIsFocused] = useState(false);
  const dragStateRef = useRef<DragState>({ active: false, type: 'move', offset: { x: 0, y: 0 } });
  const elementRef = useRef<HTMLDivElement>(null);

  // Sync internal state with props, crucial for reset functionality
  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);
  
  useEffect(() => {
    setSize(initialSize);
  }, [initialSize]);

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current.active) return;

    const { type, offset } = dragStateRef.current;
    
    const parentRect = elementRef.current?.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    if (type === 'move') {
      const newX = clamp(e.clientX - parentRect.left - offset.x, bounds.left, bounds.right - size.width);
      const newY = clamp(e.clientY - parentRect.top - offset.y, bounds.top, bounds.bottom - size.height);
      setPosition({ x: newX, y: newY });
    } else if (type === 'resize-br') {
      const newWidth = clamp(e.clientX - parentRect.left - position.x, 50, bounds.right - position.x);
      const newHeight = clamp(e.clientY - parentRect.top - position.y, 50, bounds.bottom - position.y);
      setSize({ width: newWidth, height: newHeight });
    }
  }, [bounds, position.x, position.y, size.width, size.height]);

  const handleMouseUp = useCallback(() => {
    if (dragStateRef.current.active) {
      onUpdate(position, size);
      dragStateRef.current = { active: false, type: 'move', offset: { x: 0, y: 0 } };
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    }
  }, [handleMouseMove, onUpdate, position, size]);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    elementRef.current?.focus();
    const targetRect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!parentRect) return;
    
    dragStateRef.current = {
      active: true,
      type: 'move',
      offset: { x: e.clientX - targetRect.left, y: e.clientY - targetRect.top },
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    elementRef.current?.focus();
    dragStateRef.current = {
      active: true,
      type: 'resize-br',
      offset: { x: 0, y: 0 }, // Offset not needed for this simple resize logic
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'se-resize';
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    
    setPosition(prevPos => {
      let newPos = { ...prevPos };
      switch (e.key) {
        case 'ArrowUp': newPos.y -= step; break;
        case 'ArrowDown': newPos.y += step; break;
        case 'ArrowLeft': newPos.x -= step; break;
        case 'ArrowRight': newPos.x += step; break;
      }
      newPos.x = clamp(newPos.x, bounds.left, bounds.right - size.width);
      newPos.y = clamp(newPos.y, bounds.top, bounds.bottom - size.height);
      return newPos;
    });
  };

  const handleInteractionEnd = useCallback(() => {
    onUpdate(position, size);
  }, [onUpdate, position, size]);

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  return (
    <div
      ref={elementRef}
      tabIndex={0}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: 'move',
        border: isFocused ? '2px solid #6a45ff' : '2px dashed rgba(106, 69, 255, 0.7)',
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'border-color 0.2s ease-in-out',
      }}
      onMouseDown={handleDragStart}
      onKeyDown={handleKeyDown}
      onKeyUp={handleInteractionEnd}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        handleInteractionEnd();
      }}
    >
      <img src={src} alt="Draggable" style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable="false" />
      <div
        style={{
          position: 'absolute',
          bottom: '-6px',
          right: '-6px',
          width: '12px',
          height: '12px',
          backgroundColor: '#6a45ff',
          border: '2px solid white',
          borderRadius: '50%',
          cursor: 'se-resize',
        }}
        onMouseDown={handleResizeStart}
      />
    </div>
  );
};

export default DraggableResizableImage;
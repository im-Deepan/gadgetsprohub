import React, { useRef, useState, useEffect } from 'react';

interface GlareHoverProps {
  children: React.ReactNode;
  glareColor?: string;
  glareOpacity?: number;
  glareAngle?: number;
  glareSize?: number;
  transitionDuration?: number;
  playOnce?: boolean;
  className?: string;
}

export const GlareHover: React.FC<GlareHoverProps> = ({
  children,
  glareColor = '#ffffff',
  glareOpacity = 0.2,
  glareAngle = -30,
  glareSize = 150,
  transitionDuration = 700,
  playOnce = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [hasPlayed, setHasPlayed] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (playOnce && hasPlayed) return;
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPosition({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (playOnce) setHasPlayed(true);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden w-full h-full ${className}`}
    >
      <div className="relative z-10 w-full h-full">{children}</div>
      <div
        className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay transition-opacity"
        style={{
          opacity: isHovered ? glareOpacity : 0,
          background: `radial-gradient(circle ${glareSize}px at ${position.x}% ${position.y}%, ${glareColor}, transparent)`,
          transitionDuration: `${transitionDuration}ms`
        }}
      />
    </div>
  );
};

export default GlareHover;

import React, { useRef, useState } from 'react';

interface BorderGlowProps {
  children: React.ReactNode;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  colors?: string[];
  className?: string;
}

export const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  glowColor = '40 80 80',
  backgroundColor = 'transparent',
  borderRadius = 28,
  glowRadius = 300,
  glowIntensity = 1,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(glowIntensity);
  const handleMouseLeave = () => setOpacity(0);

  // Handle color formatting if '40 80 80' instead of '40, 80, 80'
  const rgbColor = glowColor.includes(',') ? glowColor : glowColor.split(' ').join(', ');

  // Dynamic gradient based on colors if animated/multi-color is needed, but we'll stick to a smooth spotlight
  const gradientColors = colors.length >= 3 ? colors : ['#c084fc', '#f472b6', '#38bdf8'];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{
        borderRadius: `${borderRadius}px`,
      }}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(${glowRadius}px circle at ${position.x}px ${position.y}px, rgba(${rgbColor}, 1), transparent)`,
          borderRadius: `${borderRadius}px`,
        }}
      />
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-500 mix-blend-screen"
        style={{
          opacity: opacity * 0.8,
          background: `radial-gradient(${glowRadius * 1.2}px circle at ${position.x}px ${position.y}px, ${gradientColors[0]}66, transparent)`,
          borderRadius: `${borderRadius}px`,
        }}
      />
      <div
        className={`absolute inset-[1px] transition-colors duration-300 ${backgroundColor === 'transparent' ? 'bg-white dark:bg-slate-900' : ''}`}
        style={{
          backgroundColor: backgroundColor !== 'transparent' ? backgroundColor : undefined,
          borderRadius: `${borderRadius - 1}px`,
        }}
      />
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default BorderGlow;

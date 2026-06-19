import React, { useRef, useState } from 'react';

interface BorderGlowProps {
  children: React.ReactNode;
  edgeSensitivity?: number;
  /**
   * Space-separated RGB triplet format (e.g., '40 80 80' or with comma '40, 80, 80') representing the accent glow color.
   */
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  colors?: string[];
  className?: string;
}

const AMBIENT_COLORS = [
  { glow: '99, 102, 241', colors: ['#c084fc', '#6366f1', '#38bdf8'] }, // Indigo/Purple
  { glow: '236, 72, 153', colors: ['#f472b6', '#ec4899', '#fca5a5'] }, // Pink/Rose
  { glow: '20, 184, 166', colors: ['#2dd4bf', '#14b8a6', '#93c5fd'] }, // Teal/Blue
  { glow: '168, 85, 247', colors: ['#c084fc', '#a855f7', '#f472b6'] }, // Purple/Pink
  { glow: '6, 182, 212', colors: ['#67e8f9', '#06b6d4', '#38bdf8'] },  // Cyan/Blue
  { glow: '249, 115, 22', colors: ['#fdba74', '#f97316', '#fca5a5'] },  // Orange/Amber
  { glow: '16, 185, 129', colors: ['#34d399', '#10b981', '#a7f3d0'] }   // Emerald/Green
];

export const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  glowColor,
  backgroundColor = 'transparent',
  borderRadius = 28,
  glowRadius = 300,
  glowIntensity = 1,
  colors,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const [opacity, setOpacity] = useState(0);

  // Initialize a random color configuration state on mount to ensure dynamic visual variation across multiple card instances
  const [randomColorCfg] = useState(() => AMBIENT_COLORS[Math.floor(Math.random() * AMBIENT_COLORS.length)]);

  const finalGlowColor = glowColor !== undefined ? glowColor : randomColorCfg.glow;
  const finalColors = colors !== undefined ? colors : randomColorCfg.colors;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(glowIntensity);
  const handleMouseLeave = () => setOpacity(0);

  // Handle color formatting if '40 80 80' instead of '40, 80, 80'
  const rgbColor = finalGlowColor.includes(',') ? finalGlowColor : finalGlowColor.split(' ').join(', ');

  // Dynamic gradient based on colors if animated/multi-color is needed, but we'll stick to a smooth spotlight
  const gradientColors = finalColors.length >= 3 ? finalColors : ['#c084fc', '#f472b6', '#38bdf8'];

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

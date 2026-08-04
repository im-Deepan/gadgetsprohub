import React from 'react';
import { 
  Smartphone, Headphones, Laptop, Watch, Gamepad2, 
  Footprints, Cpu, Shirt, Home, Activity, BookOpen, 
  HeartPulse, Package, Flame, Layers, Tag
} from 'lucide-react';

interface CategoryIconProps {
  name?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name = '', className = 'h-4 w-4' }) => {
  const norm = name.toLowerCase().trim();

  if (!norm || norm === 'all' || norm.includes('all collection')) {
    return <Layers className={className} />;
  }
  if (norm.includes('trending') || norm.includes('flame')) {
    return <Flame className={className} />;
  }
  if (norm.includes('earbud') || norm.includes('headphone') || norm.includes('audio') || norm.includes('sound') || norm.includes('speaker')) {
    return <Headphones className={className} />;
  }
  if (norm.includes('mobile') || norm.includes('phone') || norm.includes('smartphone')) {
    return <Smartphone className={className} />;
  }
  if (norm.includes('laptop') || norm.includes('computer') || norm.includes('macbook')) {
    return <Laptop className={className} />;
  }
  if (norm.includes('watch') || norm.includes('wearable') || norm.includes('smartwatch')) {
    return <Watch className={className} />;
  }
  if (norm.includes('game') || norm.includes('gaming') || norm.includes('console')) {
    return <Gamepad2 className={className} />;
  }
  if (norm.includes('shoe') || norm.includes('footwear') || norm.includes('sneaker')) {
    return <Footprints className={className} />;
  }
  if (norm.includes('electron') || norm.includes('tech') || norm.includes('gadget') || norm.includes('appliances') || norm.includes('power') || norm.includes('charger')) {
    return <Cpu className={className} />;
  }
  if (norm.includes('fashion') || norm.includes('cloth') || norm.includes('wear') || norm.includes('style') || norm.includes('bag') || norm.includes('shirt')) {
    return <Shirt className={className} />;
  }
  if (norm.includes('home') || norm.includes('decor') || norm.includes('garden') || norm.includes('furniture') || norm.includes('kitchen')) {
    return <Home className={className} />;
  }
  if (norm.includes('sport') || norm.includes('fit') || norm.includes('gym') || norm.includes('athletic')) {
    return <Activity className={className} />;
  }
  if (norm.includes('book') || norm.includes('educat') || norm.includes('read')) {
    return <BookOpen className={className} />;
  }
  if (norm.includes('health') || norm.includes('beauty') || norm.includes('medical') || norm.includes('wellness')) {
    return <HeartPulse className={className} />;
  }

  return <Tag className={className} />;
};

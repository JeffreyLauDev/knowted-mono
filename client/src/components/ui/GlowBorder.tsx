import { cn } from '@/lib/utils';
import React from 'react';

interface GlowBorderProps {
  children: React.ReactNode;
  className?: string;
}

const GlowBorder: React.FC<GlowBorderProps> = ({ children, className }) => {
  return (
    <div className={cn('relative rounded-lg p-[1px] overflow-hidden h-full before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-green-700 before:via-mint-500 before:to-beige-200 before:animate-pulse-subtle after:absolute after:inset-[1px] after:rounded-lg after:bg-white', className)}>
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};

export default GlowBorder;

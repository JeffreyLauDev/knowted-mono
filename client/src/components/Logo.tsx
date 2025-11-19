import { cn } from '@/lib/utils';
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'default' | 'white';
}

const Logo: React.FC<LogoProps> = ({
  className,
  size = 'md',
  showText = true,
  variant = 'default'
}) => {
  const iconSize = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const isWhite = variant === 'white';
  const logoSrc = isWhite
    ? '/logos/Knowted Logo - Stacked (White)@1.5x@1.5x.png'
    : '/logos/Knowted Logo - Stacked (Green)@1.5x@1.5x.png';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src={logoSrc}
        alt="Knowted Logo"
        className={cn('object-contain', iconSize[size])}
      />

      {showText && (
        <span
          className={cn(
            'font-bold tracking-tight',
            textSize[size],
            isWhite ? 'text-white' : 'text-primary'
          )}
        >
          Knowted.io
        </span>
      )}
    </div>
  );
};

export default Logo;

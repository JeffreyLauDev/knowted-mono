
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

const StatsCard = ({
  title,
  value,
  description,
  icon,
  className,
  trend,
}: StatsCardProps) => {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center mt-1">
            {trend && (
              <span
                className={cn("text-xs font-medium mr-1", {
                  "text-green-500": trend.direction === "up",
                  "text-red-500": trend.direction === "down",
                  "text-muted-foreground": trend.direction === "neutral",
                })}
              >
                {trend.direction === "up" && "+"}
                {trend.direction === "down" && "-"}
                {Math.abs(trend.value)}%
              </span>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;

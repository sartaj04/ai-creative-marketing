'use client';

import { cn } from '@/lib/utils';

interface BarChartItem {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface BarChartProps {
  data: BarChartItem[];
  maxValue?: number;
  showSecondary?: boolean;
  valueLabel?: string;
  secondaryLabel?: string;
  className?: string;
}

export function BarChart({
  data,
  maxValue: maxValueProp,
  showSecondary = false,
  valueLabel = 'Count',
  secondaryLabel = 'Approval Rate',
  className,
}: BarChartProps) {
  const maxValue = maxValueProp || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn('space-y-3', className)}>
      {data.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No data available
        </p>
      ) : (
        data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium capitalize">{item.label}</span>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>
                  {item.value} {valueLabel.toLowerCase()}
                </span>
                {showSecondary && item.secondaryValue !== undefined && (
                  <span className="text-green-600">
                    {Math.round(item.secondaryValue * 100)}% {secondaryLabel.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

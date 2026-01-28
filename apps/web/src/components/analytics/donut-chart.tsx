'use client';

import { cn } from '@/lib/utils';

interface DonutChartItem {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartItem[];
  centerValue?: string;
  centerLabel?: string;
  className?: string;
}

export function DonutChart({
  data,
  centerValue,
  centerLabel,
  className,
}: DonutChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let currentAngle = -90; // Start from top

  const paths = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (percentage / 100) * 360;

    // Calculate arc path
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    // Handle full circle case
    if (percentage >= 99.9) {
      return (
        <circle
          key={index}
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={item.color}
          strokeWidth="16"
        />
      );
    }

    return (
      <path
        key={index}
        d={`M ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`}
        fill="none"
        stroke={item.color}
        strokeWidth="16"
        strokeLinecap="round"
      />
    );
  });

  return (
    <div className={cn('flex items-center gap-6', className)}>
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="16"
          />
          {/* Data segments */}
          {total > 0 && paths}
        </svg>
        {/* Center content */}
        {centerValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold">{centerValue}</span>
            {centerLabel && (
              <span className="text-xs text-muted-foreground">{centerLabel}</span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

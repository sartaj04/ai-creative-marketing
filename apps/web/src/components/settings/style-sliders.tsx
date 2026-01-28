'use client';

import { cn } from '@/lib/utils';

interface SliderProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function Slider({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
  disabled,
}: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-20 text-right">
          {leftLabel}
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={value * 100}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          disabled={disabled}
          className={cn(
            'flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-primary',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:shadow-sm',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        <span className="text-xs text-muted-foreground w-20">{rightLabel}</span>
      </div>
    </div>
  );
}

interface StyleSlidersProps {
  toneSliders: {
    formal_casual: number;
    technical_simple: number;
    serious_playful: number;
    humble_confident: number;
  };
  formatPreferences: {
    post: number;
    thread: number;
    carousel: number;
  };
  onToneChange: (key: string, value: number) => void;
  onFormatChange: (key: string, value: number) => void;
  disabled?: boolean;
}

export function StyleSliders({
  toneSliders,
  formatPreferences,
  onToneChange,
  onFormatChange,
  disabled,
}: StyleSlidersProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h4 className="font-medium">Tone Preferences</h4>
        <div className="space-y-6">
          <Slider
            label="Formality"
            leftLabel="Formal"
            rightLabel="Casual"
            value={toneSliders.formal_casual}
            onChange={(v) => onToneChange('formal_casual', v)}
            disabled={disabled}
          />
          <Slider
            label="Technical Level"
            leftLabel="Technical"
            rightLabel="Simple"
            value={toneSliders.technical_simple}
            onChange={(v) => onToneChange('technical_simple', v)}
            disabled={disabled}
          />
          <Slider
            label="Mood"
            leftLabel="Serious"
            rightLabel="Playful"
            value={toneSliders.serious_playful}
            onChange={(v) => onToneChange('serious_playful', v)}
            disabled={disabled}
          />
          <Slider
            label="Confidence"
            leftLabel="Humble"
            rightLabel="Confident"
            value={toneSliders.humble_confident}
            onChange={(v) => onToneChange('humble_confident', v)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Format Preferences</h4>
        <p className="text-sm text-muted-foreground">
          Adjust how often each format should appear in generated drafts.
        </p>
        <div className="space-y-6">
          <Slider
            label="Posts"
            leftLabel="Rare"
            rightLabel="Frequent"
            value={formatPreferences.post}
            onChange={(v) => onFormatChange('post', v)}
            disabled={disabled}
          />
          <Slider
            label="Threads"
            leftLabel="Rare"
            rightLabel="Frequent"
            value={formatPreferences.thread}
            onChange={(v) => onFormatChange('thread', v)}
            disabled={disabled}
          />
          <Slider
            label="Carousels"
            leftLabel="Rare"
            rightLabel="Frequent"
            value={formatPreferences.carousel}
            onChange={(v) => onFormatChange('carousel', v)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

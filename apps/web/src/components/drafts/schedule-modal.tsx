'use client';

import { useState } from 'react';
import { Draft, draftsApi, PlatformType } from '@/lib/api/drafts';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, Clock, Linkedin, Twitter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleModalProps {
  draft: Draft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled: () => void;
}

const suggestedTimes = [
  { label: 'Tomorrow 9 AM', getDate: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }},
  { label: 'Tomorrow 12 PM', getDate: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(12, 0, 0, 0);
    return d;
  }},
  { label: 'Tomorrow 5 PM', getDate: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d;
  }},
  { label: 'Next Week', getDate: () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
    return d;
  }},
];

export function ScheduleModal({
  draft,
  open,
  onOpenChange,
  onScheduled,
}: ScheduleModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [platform, setPlatform] = useState<PlatformType>('linkedin');

  const handleSchedule = async () => {
    if (!draft || !selectedDate) {
      toast({
        title: 'Missing date',
        description: 'Please select a date and time.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const scheduledTime = new Date(`${selectedDate}T${selectedTime}`);

      await draftsApi.schedule(draft.id, {
        scheduled_time: scheduledTime.toISOString(),
        platform,
      });

      toast({
        title: 'Draft scheduled',
        description: `Scheduled for ${scheduledTime.toLocaleString()} on ${platform}.`,
      });

      onScheduled();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed to schedule',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (getDate: () => Date) => {
    const date = getDate();
    setSelectedDate(date.toISOString().split('T')[0]);
    setSelectedTime(date.toTimeString().slice(0, 5));
  };

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClose={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>Schedule Draft</DialogTitle>
      </DialogHeader>

      <DialogContent className="space-y-4">
        <div className="rounded-lg bg-muted p-3">
          <p className="font-medium line-clamp-2">{draft.hook}</p>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{draft.body}</p>
        </div>

        <div className="space-y-2">
          <Label>Platform</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={platform === 'linkedin' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setPlatform('linkedin')}
            >
              <Linkedin className="h-4 w-4 mr-2" />
              LinkedIn
            </Button>
            <Button
              type="button"
              variant={platform === 'twitter' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setPlatform('twitter')}
            >
              <Twitter className="h-4 w-4 mr-2" />
              Twitter
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Quick Select</Label>
          <div className="grid grid-cols-2 gap-2">
            {suggestedTimes.map((time) => (
              <Button
                key={time.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(time.getDate)}
              >
                {time.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-9"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSchedule} disabled={isLoading || !selectedDate}>
          {isLoading ? 'Scheduling...' : 'Schedule'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

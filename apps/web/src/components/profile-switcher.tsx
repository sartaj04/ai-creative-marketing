'use client';

import { useRouter } from 'next/navigation';
import { useProfileStore } from '@/stores/profile-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronsUpDown, PlusCircle, Building2, Settings, LogOut, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const AVATAR_COLORS = [
  'bg-cyan-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-teal-500',
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

interface ProfileSwitcherProps {
  onLogout: () => void;
  invitationCount?: number;
  onOpenInvitations?: () => void;
}

export function ProfileSwitcher({ onLogout, invitationCount = 0, onOpenInvitations }: ProfileSwitcherProps) {
  const router = useRouter();
  const { profiles, currentProfile, setCurrentProfile } = useProfileStore();
  const { toast } = useToast();

  const handleCreateProfile = () => {
    router.push('/onboarding?mode=new-profile');
  };

  const handleAddEnterprise = () => {
    toast({
      title: 'Coming soon',
      description: 'Enterprise profiles will be available soon.',
    });
  };

  if (!currentProfile) {
    return (
      <button
        onClick={handleCreateProfile}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer text-left"
      >
        <PlusCircle className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Create profile</span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer group">
          <div className={`w-6 h-6 rounded-full ${getAvatarColor(currentProfile.name)} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>
            {currentProfile.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium truncate max-w-[140px]">{currentProfile.name}</span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {invitationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {invitationCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Profiles</DropdownMenuLabel>
        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => setCurrentProfile(profile)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className={`w-6 h-6 rounded-full ${getAvatarColor(profile.name)} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{profile.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {profile.type}{profile.role ? ` \u00b7 ${profile.role}` : ''}
              </p>
            </div>
            {currentProfile.id === profile.id && (
              <Check className="w-4 h-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {invitationCount > 0 && onOpenInvitations && (
          <>
            <DropdownMenuItem onClick={onOpenInvitations} className="cursor-pointer">
              <Mail className="w-4 h-4 mr-2" />
              Invitations
              <span className="ml-auto text-[10px] text-white bg-cyan-500 px-1.5 py-0.5 rounded-full font-bold">
                {invitationCount}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleCreateProfile} className="cursor-pointer">
          <PlusCircle className="w-4 h-4 mr-2" />
          Create profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleAddEnterprise} className="cursor-pointer">
          <Building2 className="w-4 h-4 mr-2" />
          Add enterprise
          <span className="ml-auto text-[10px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard/settings?tab=account')} className="cursor-pointer">
          <Settings className="w-4 h-4 mr-2" />
          Manage profiles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

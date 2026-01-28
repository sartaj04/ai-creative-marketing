'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Inbox,
  FileText,
  BarChart3,
  Settings,
  LayoutTemplate,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useProfileStore } from '@/stores/profile-store';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/drafts', label: 'Drafts', icon: FileText },
  { href: '/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const { currentProfile } = useProfileStore();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/inbox" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            P
          </div>
          <span className="text-xl font-semibold">Pixo</span>
        </Link>
      </div>

      {/* Profile Selector */}
      {currentProfile && (
        <div className="border-b p-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Current Profile</p>
            <p className="font-medium truncate">{currentProfile.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {currentProfile.type}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-3 rounded-lg p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <span className="text-sm font-medium">
              {user?.name?.[0] || user?.email?.[0] || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

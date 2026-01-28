'use client';

import { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profile-store';
import { profilesApi, Profile, ProfileSource } from '@/lib/api/profiles';
import { identityApi, StyleProfile, IdentityGraph } from '@/lib/api/identity';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StyleSliders } from '@/components/settings/style-sliders';
import { useToast } from '@/components/ui/use-toast';
import {
  Settings,
  User,
  Palette,
  Rss,
  Ban,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export default function SettingsPage() {
  const { currentProfile, fetchProfiles } = useProfileStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profileDescription, setProfileDescription] = useState('');

  // Sources state
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [rssUrls, setRssUrls] = useState<string[]>([]);
  const [newRssUrl, setNewRssUrl] = useState('');

  // Style state
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [toneSliders, setToneSliders] = useState({
    formal_casual: 0.5,
    technical_simple: 0.5,
    serious_playful: 0.5,
    humble_confident: 0.5,
  });
  const [formatPreferences, setFormatPreferences] = useState({
    post: 0.5,
    thread: 0.3,
    carousel: 0.2,
  });
  const [tabooList, setTabooList] = useState<string[]>([]);
  const [newTaboo, setNewTaboo] = useState('');

  const fetchData = async () => {
    if (!currentProfile) return;

    setIsLoading(true);
    try {
      // Fetch profile details
      const profile = await profilesApi.get(currentProfile.id);
      setProfileName(profile.name);
      setProfileDescription(profile.description || '');

      if (profile.sources) {
        setLinkedinUrl(profile.sources.linkedin_url || '');
        setWebsiteUrl(profile.sources.website_url || '');
        setManualText(profile.sources.manual_text || '');
        setRssUrls(profile.sources.rss_urls || []);
      }

      // Fetch style profile
      try {
        const style = await identityApi.getStyleProfile(currentProfile.id);
        setStyleProfile(style);
        setToneSliders({
          formal_casual: style.tone_sliders.formal_casual ?? 0.5,
          technical_simple: style.tone_sliders.technical_simple ?? 0.5,
          serious_playful: style.tone_sliders.serious_playful ?? 0.5,
          humble_confident: style.tone_sliders.humble_confident ?? 0.5,
        });
        setFormatPreferences({
          post: style.format_preferences.post ?? 0.5,
          thread: style.format_preferences.thread ?? 0.3,
          carousel: style.format_preferences.carousel ?? 0.2,
        });
        setTabooList(style.taboo_list || []);
      } catch (e) {
        // Style profile might not exist yet
      }
    } catch (error) {
      toast({
        title: 'Failed to load settings',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentProfile]);

  const handleSaveProfile = async () => {
    if (!currentProfile) return;

    setIsSaving(true);
    try {
      await profilesApi.update(currentProfile.id, {
        name: profileName,
        description: profileDescription,
      });

      toast({
        title: 'Profile saved',
        description: 'Your profile has been updated.',
      });

      fetchProfiles();
    } catch (error) {
      toast({
        title: 'Failed to save',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStyle = async () => {
    if (!currentProfile) return;

    setIsSaving(true);
    try {
      await identityApi.updateStyleProfile(currentProfile.id, {
        tone_sliders: toneSliders,
        format_preferences: formatPreferences,
        taboo_list: tabooList,
      });

      toast({
        title: 'Style saved',
        description: 'Your style preferences have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Failed to save',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerIngestion = async () => {
    if (!currentProfile) return;

    try {
      await profilesApi.triggerIngestion(currentProfile.id);
      toast({
        title: 'Ingestion started',
        description: 'Your sources are being processed. This may take a few minutes.',
      });
    } catch (error) {
      toast({
        title: 'Failed to start ingestion',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddRss = () => {
    if (newRssUrl && !rssUrls.includes(newRssUrl)) {
      setRssUrls([...rssUrls, newRssUrl]);
      setNewRssUrl('');
    }
  };

  const handleRemoveRss = (url: string) => {
    setRssUrls(rssUrls.filter((u) => u !== url));
  };

  const handleAddTaboo = () => {
    if (newTaboo && !tabooList.includes(newTaboo.toLowerCase())) {
      setTabooList([...tabooList, newTaboo.toLowerCase()]);
      setNewTaboo('');
    }
  };

  const handleRemoveTaboo = (item: string) => {
    setTabooList(tabooList.filter((t) => t !== item));
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <Settings className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-xl font-semibold">No profile selected</h2>
        <p className="text-muted-foreground">Create a profile to manage settings.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile and preferences
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="sources">
              <Rss className="mr-2 h-4 w-4" />
              Sources
            </TabsTrigger>
            <TabsTrigger value="style">
              <Palette className="mr-2 h-4 w-4" />
              Style
            </TabsTrigger>
            <TabsTrigger value="taboo">
              <Ban className="mr-2 h-4 w-4" />
              Taboo Topics
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Profile Information</h3>
                <p className="text-sm text-muted-foreground">
                  Basic information about your brand profile
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Profile Name</Label>
                  <Input
                    id="name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your profile name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={profileDescription}
                    onChange={(e) => setProfileDescription(e.target.value)}
                    placeholder="Brief description of your brand..."
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <span className="text-sm text-muted-foreground">
                    Type: <span className="font-medium capitalize">{currentProfile.type}</span>
                  </span>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Content Sources</h3>
                  <p className="text-sm text-muted-foreground">
                    URLs and content used to learn your style
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
                    <Input
                      id="linkedin"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website URL</Label>
                    <Input
                      id="website"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual">Manual Description</Label>
                    <textarea
                      id="manual"
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Describe your expertise, voice, and brand values..."
                      className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <Button onClick={handleTriggerIngestion} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-analyze Sources
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">RSS Feeds</h3>
                  <p className="text-sm text-muted-foreground">
                    Subscribe to feeds for content opportunities
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newRssUrl}
                      onChange={(e) => setNewRssUrl(e.target.value)}
                      placeholder="https://example.com/feed.xml"
                      className="flex-1"
                    />
                    <Button onClick={handleAddRss} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {rssUrls.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No RSS feeds added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {rssUrls.map((url) => (
                        <div
                          key={url}
                          className="flex items-center justify-between rounded-lg bg-muted p-3"
                        >
                          <span className="text-sm truncate flex-1">{url}</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRss(url)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Style Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  Customize how your AI-generated content sounds
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <StyleSliders
                  toneSliders={toneSliders}
                  formatPreferences={formatPreferences}
                  onToneChange={(key, value) =>
                    setToneSliders((prev) => ({ ...prev, [key]: value }))
                  }
                  onFormatChange={(key, value) =>
                    setFormatPreferences((prev) => ({ ...prev, [key]: value }))
                  }
                  disabled={isSaving}
                />

                <Button onClick={handleSaveStyle} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Style'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Taboo Tab */}
          <TabsContent value="taboo">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Taboo Topics</h3>
                <p className="text-sm text-muted-foreground">
                  Topics the AI should avoid in generated content
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTaboo}
                    onChange={(e) => setNewTaboo(e.target.value)}
                    placeholder="Add a topic to avoid..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTaboo();
                      }
                    }}
                  />
                  <Button onClick={handleAddTaboo} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {tabooList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No taboo topics added. Add topics you want the AI to avoid.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tabooList.map((item) => (
                      <span
                        key={item}
                        className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive"
                      >
                        {item}
                        <button
                          onClick={() => handleRemoveTaboo(item)}
                          className="ml-1 hover:text-destructive/70"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <Button onClick={handleSaveStyle} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Taboo List'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

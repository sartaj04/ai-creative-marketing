import React, { useState, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Upload, Image as ImageIcon, Check } from 'lucide-react';
import { visualTemplatesApi } from '@/lib/api/visual-templates';
import { useToast } from '@/components/ui/use-toast';

interface ImageVariablePickerProps {
    value: string;
    onChange: (value: string) => void;
    schema: { label?: string; description?: string; placeholder?: string | null; type?: string; itemSchema?: any };
}

export function ImageVariablePicker({ value, onChange, schema }: ImageVariablePickerProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    // Unsplash State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const results = await visualTemplatesApi.searchUnsplash(searchQuery);
            setSearchResults(results);
        } catch (err) {
            toast({ title: 'Search failed', description: 'Could not fetch images from Unsplash.', variant: 'destructive' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { url } = await visualTemplatesApi.uploadImage(file);
            onChange(url);
            setOpen(false); // Close popover on successful upload
            toast({ title: 'Image uploaded', description: 'Your image has been applied to the template.' });
        } catch (err) {
            toast({ title: 'Upload failed', description: 'Could not upload your image.', variant: 'destructive' });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const [activeTab, setActiveTab] = useState('unsplash');

    const triggerLabel = value ? 'Change Image' : 'Select Image';
    const isValueUrl = value?.startsWith('http') || value?.startsWith('data:');

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="group relative cursor-pointer rounded-lg border overflow-hidden bg-slate-50 hover:border-cyan-400 transition-colors">
                    {isValueUrl ? (
                        <div className="aspect-video relative overflow-hidden bg-slate-100 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={value} alt="Selected" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 flex items-center gap-1 rounded-md backdrop-blur-sm">
                                    <ImageIcon className="h-3 w-3" /> {triggerLabel}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="aspect-video flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50 group-hover:bg-slate-100 transition-colors">
                            <ImageIcon className="h-6 w-6" />
                            <span className="text-xs font-medium text-slate-500">{triggerLabel}</span>
                        </div>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full rounded-none border-b bg-transparent p-0 flex">
                        <TabsTrigger value="unsplash" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:shadow-none">
                            Unsplash
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:shadow-none">
                            Upload
                        </TabsTrigger>
                        <TabsTrigger value="url" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:shadow-none">
                            URL
                        </TabsTrigger>
                    </TabsList>

                    {/* UNSPLASH TAB */}
                    <TabsContent value="unsplash" className="p-3 m-0 space-y-3">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search stock photos..."
                                    className="pl-8 text-sm h-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button type="submit" size="sm" className="h-9 px-3 shrink-0" disabled={isSearching}>
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                            </Button>
                        </form>

                        <div className="h-[240px] overflow-y-auto overflow-x-hidden pr-1 -mr-1">
                            {searchResults.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {searchResults.map((photo) => (
                                        <button
                                            key={photo.id}
                                            onClick={() => {
                                                onChange(photo.url_regular);
                                                setOpen(false);
                                            }}
                                            className="relative aspect-square rounded-md overflow-hidden bg-slate-100 hover:ring-2 hover:ring-cyan-500 hover:ring-offset-1 transition-all group"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={photo.url_thumb} alt={photo.alt} className="w-full h-full object-cover" loading="lazy" />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-[9px] text-white/90 truncate">By {photo.photographer}</p>
                                            </div>
                                            {value === photo.url_regular && (
                                                <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                                    <div className="bg-cyan-500 text-white p-1 rounded-full">
                                                        <Check className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground px-4">
                                    <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
                                    <p>Search Unsplash to discover high-quality free images.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* UPLOAD TAB */}
                    <TabsContent value="upload" className="p-4 m-0 h-[290px] flex flex-col items-center justify-center">
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/gif"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleUpload}
                        />
                        <div
                            className="w-full flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 hover:border-cyan-300 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-slate-700">Uploading image...</p>
                                        <p className="text-xs text-slate-500 mt-1">Please wait a moment</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-white p-3 rounded-full shadow-sm border">
                                        <Upload className="h-6 w-6 text-cyan-600" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-slate-700">Click to upload image</p>
                                        <p className="text-[10px] text-slate-500 mt-1 max-w-[180px] leading-tight">PNG, JPG, WEBP, or GIF<br />(max 5MB recommended)</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </TabsContent>

                    {/* URL TAB */}
                    <TabsContent value="url" className="p-4 m-0 h-[290px] flex flex-col">
                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs">Image URL</Label>
                                <Input
                                    type="url"
                                    value={value || ''}
                                    onChange={(e) => onChange(e.target.value)}
                                    placeholder="https://example.com/image.png"
                                    className="mt-1.5 text-sm"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Paste a direct link to an image. Ensure the URL ends in .jpg, .png, or similar, and is publicly accessible.
                            </p>
                        </div>
                        {isValueUrl && (
                            <div className="mt-auto h-24 rounded-md border overflow-hidden bg-slate-100 relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={value} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </PopoverContent>
        </Popover>
    );
}

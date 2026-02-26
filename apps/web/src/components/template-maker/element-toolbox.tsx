'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Type, Square, Circle, Minus, ImageIcon, Upload } from 'lucide-react';

interface ElementToolboxProps {
    onAddText: () => void;
    onAddShape: (type: 'rect' | 'circle' | 'line') => void;
    onAddImage: (url: string) => void;
    disabled?: boolean;
}

const ELEMENTS = [
    { id: 'text', label: 'Text', icon: Type, action: 'text' as const },
    { id: 'rect', label: 'Rectangle', icon: Square, action: 'rect' as const },
    { id: 'circle', label: 'Circle', icon: Circle, action: 'circle' as const },
    { id: 'line', label: 'Line', icon: Minus, action: 'line' as const },
];

export function ElementToolbox({ onAddText, onAddShape, onAddImage, disabled }: ElementToolboxProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            onAddImage(dataUrl);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return (
        <div className="w-52 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
            <div className="p-3 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Elements</h3>
            </div>

            <div className="p-2 space-y-1">
                {ELEMENTS.map((el) => (
                    <Button
                        key={el.id}
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => {
                            if (el.action === 'text') onAddText();
                            else onAddShape(el.action);
                        }}
                        className="w-full justify-start gap-3 h-10 text-sm font-normal hover:bg-cyan-50 hover:text-cyan-700"
                    >
                        <el.icon className="h-4 w-4 text-slate-400" />
                        {el.label}
                    </Button>
                ))}

                {/* Image upload */}
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full justify-start gap-3 h-10 text-sm font-normal hover:bg-cyan-50 hover:text-cyan-700"
                >
                    <Upload className="h-4 w-4 text-slate-400" />
                    Upload Image
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </div>

            {/* Quick styles */}
            <div className="p-3 border-t border-slate-100 mt-auto">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Colors</h3>
                <div className="grid grid-cols-6 gap-1.5">
                    {['#0f172a', '#1e293b', '#ffffff', '#0ea5e9', '#8b5cf6', '#10b981',
                        '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316'].map((color) => (
                            <button
                                key={color}
                                className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                                style={{ background: color }}
                                title={color}
                            />
                        ))}
                </div>
            </div>
        </div>
    );
}

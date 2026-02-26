'use client';

import { useState } from 'react';
import * as fabric from 'fabric';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link2, Link2Off } from 'lucide-react';

interface VariableBinderProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetObject: fabric.FabricObject | null;
    canvas: fabric.Canvas | null;
    onBound: () => void;
}

export function VariableBinder({
    open,
    onOpenChange,
    targetObject,
    canvas,
    onBound,
}: VariableBinderProps) {
    const existingName = (targetObject as any)?.variableName || '';
    const [name, setName] = useState(existingName);

    const handleBind = () => {
        if (!targetObject || !canvas || !name.trim()) return;
        const cleanName = name.trim().replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        (targetObject as any).isVariable = true;
        (targetObject as any).variableName = cleanName;
        canvas.renderAll();
        onBound();
        onOpenChange(false);
        setName('');
    };

    const handleUnbind = () => {
        if (!targetObject || !canvas) return;
        (targetObject as any).isVariable = false;
        (targetObject as any).variableName = '';
        canvas.renderAll();
        onBound();
        onOpenChange(false);
        setName('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-cyan-600" />
                        Bind to Variable
                    </DialogTitle>
                    <DialogDescription>
                        Make this element dynamic by binding it to a template variable.
                        Users filling this template will provide a value for <code className="text-xs bg-muted px-1 py-0.5 rounded">{`{{${name || 'variable_name'}}}`}</code>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Variable Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. title, subtitle, author_name"
                            className="font-mono text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Use snake_case. This will appear as an editable field when someone uses your template.
                        </p>
                    </div>

                    {/* Quick suggestions */}
                    <div>
                        <Label className="text-xs text-muted-foreground">Common Variables</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {['title', 'subtitle', 'body_text', 'author_name', 'stat_number', 'cta_text', 'accent_color', 'quote_text'].map((v) => (
                                <button
                                    key={v}
                                    className="px-2 py-0.5 text-[11px] rounded-full bg-slate-100 hover:bg-cyan-100 hover:text-cyan-700 transition-colors"
                                    onClick={() => setName(v)}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex gap-2">
                    {existingName && (
                        <Button variant="outline" size="sm" onClick={handleUnbind} className="text-red-600 border-red-200 hover:bg-red-50">
                            <Link2Off className="h-3 w-3 mr-1" />
                            Unbind
                        </Button>
                    )}
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleBind} disabled={!name.trim()}>
                        <Link2 className="h-3 w-3 mr-1" />
                        Bind Variable
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

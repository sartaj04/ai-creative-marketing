'use client';

import { useState, useEffect } from 'react';
import * as fabric from 'fabric';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
    AlignLeft, AlignCenter, AlignRight,
    Bold, Italic, Underline,
    ArrowUp, ArrowDown, Trash2, Link2,
} from 'lucide-react';

interface PropertyPanelProps {
    selectedObject: fabric.FabricObject | null;
    canvas: fabric.Canvas | null;
    onPropertyChange?: () => void;
    onBindVariable?: (obj: fabric.FabricObject) => void;
    onDelete?: () => void;
}

const FONTS = [
    'Inter', 'Roboto', 'Outfit', 'Merriweather', 'Playfair Display',
    'Poppins', 'Lato', 'Montserrat', 'Open Sans', 'Raleway',
];

export function PropertyPanel({
    selectedObject,
    canvas,
    onPropertyChange,
    onBindVariable,
    onDelete,
}: PropertyPanelProps) {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        forceUpdate((v) => v + 1);
    }, [selectedObject]);

    if (!selectedObject || !canvas) {
        return (
            <div className="w-64 bg-white border-l border-slate-200 flex items-center justify-center p-6">
                <p className="text-sm text-muted-foreground text-center">
                    Select an element on the canvas to edit its properties
                </p>
            </div>
        );
    }

    const isText = selectedObject instanceof fabric.Textbox || selectedObject instanceof fabric.IText;
    const variableName = (selectedObject as any).variableName || '';
    const isVariable = (selectedObject as any).isVariable || false;

    const update = (props: Record<string, any>) => {
        selectedObject.set(props);
        canvas.renderAll();
        onPropertyChange?.();
        forceUpdate((v) => v + 1);
    };

    const bringForward = () => { canvas.bringObjectForward(selectedObject); canvas.renderAll(); };
    const sendBackward = () => { canvas.sendObjectBackwards(selectedObject); canvas.renderAll(); };

    return (
        <div className="w-64 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
            <div className="p-3 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Properties</h3>
            </div>

            <div className="p-3 space-y-4">
                {/* Variable binding */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs">Variable</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-cyan-600"
                            onClick={() => onBindVariable?.(selectedObject)}
                        >
                            <Link2 className="h-3 w-3 mr-1" />
                            {isVariable ? variableName : 'Bind'}
                        </Button>
                    </div>
                    {isVariable && (
                        <div className="text-[10px] bg-cyan-50 text-cyan-700 px-2 py-1 rounded">
                            Bound to: <code className="font-mono">{`{{${variableName}}}`}</code>
                        </div>
                    )}
                </div>

                {/* Position */}
                <div className="space-y-1.5">
                    <Label className="text-xs">Position</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-[10px] text-muted-foreground">X</span>
                            <Input
                                type="number"
                                value={Math.round(selectedObject.left || 0)}
                                onChange={(e) => update({ left: Number(e.target.value) })}
                                className="h-7 text-xs"
                            />
                        </div>
                        <div>
                            <span className="text-[10px] text-muted-foreground">Y</span>
                            <Input
                                type="number"
                                value={Math.round(selectedObject.top || 0)}
                                onChange={(e) => update({ top: Number(e.target.value) })}
                                className="h-7 text-xs"
                            />
                        </div>
                    </div>
                </div>

                {/* Size */}
                <div className="space-y-1.5">
                    <Label className="text-xs">Size</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-[10px] text-muted-foreground">W</span>
                            <Input
                                type="number"
                                value={Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))}
                                onChange={(e) => {
                                    const w = Number(e.target.value);
                                    update({ width: w / (selectedObject.scaleX || 1) });
                                }}
                                className="h-7 text-xs"
                            />
                        </div>
                        <div>
                            <span className="text-[10px] text-muted-foreground">H</span>
                            <Input
                                type="number"
                                value={Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1))}
                                onChange={(e) => {
                                    const h = Number(e.target.value);
                                    update({ height: h / (selectedObject.scaleY || 1) });
                                }}
                                className="h-7 text-xs"
                            />
                        </div>
                    </div>
                </div>

                {/* Fill color */}
                <div className="space-y-1.5">
                    <Label className="text-xs">{isText ? 'Text Color' : 'Fill Color'}</Label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="color"
                            value={(selectedObject.fill as string) || '#ffffff'}
                            onChange={(e) => update({ fill: e.target.value })}
                            className="w-8 h-8 rounded border cursor-pointer"
                        />
                        <Input
                            value={(selectedObject.fill as string) || ''}
                            onChange={(e) => update({ fill: e.target.value })}
                            className="h-7 text-xs font-mono flex-1"
                        />
                    </div>
                </div>

                {/* Opacity */}
                <div className="space-y-1.5">
                    <Label className="text-xs">Opacity: {Math.round((selectedObject.opacity || 1) * 100)}%</Label>
                    <Slider
                        value={[(selectedObject.opacity || 1) * 100]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={([v]) => update({ opacity: v / 100 })}
                    />
                </div>

                {/* Rotation */}
                <div className="space-y-1.5">
                    <Label className="text-xs">Rotation: {Math.round(selectedObject.angle || 0)}°</Label>
                    <Slider
                        value={[selectedObject.angle || 0]}
                        min={0}
                        max={360}
                        step={1}
                        onValueChange={([v]) => update({ angle: v })}
                    />
                </div>

                {/* Text properties */}
                {isText && (
                    <>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Font</Label>
                            <Select
                                value={(selectedObject as fabric.Textbox).fontFamily || 'Inter'}
                                onChange={(e) => update({ fontFamily: e.target.value })}
                                className="h-7 text-xs"
                            >
                                {FONTS.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">Font Size</Label>
                            <Input
                                type="number"
                                value={(selectedObject as fabric.Textbox).fontSize || 24}
                                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                                className="h-7 text-xs"
                                min={8}
                                max={200}
                            />
                        </div>

                        <div className="flex gap-1">
                            <Button
                                variant={((selectedObject as fabric.Textbox).fontWeight === 'bold') ? 'default' : 'outline'}
                                size="icon" className="h-7 w-7"
                                onClick={() => update({ fontWeight: (selectedObject as fabric.Textbox).fontWeight === 'bold' ? 'normal' : 'bold' })}
                            ><Bold className="h-3 w-3" /></Button>
                            <Button
                                variant={((selectedObject as fabric.Textbox).fontStyle === 'italic') ? 'default' : 'outline'}
                                size="icon" className="h-7 w-7"
                                onClick={() => update({ fontStyle: (selectedObject as fabric.Textbox).fontStyle === 'italic' ? 'normal' : 'italic' })}
                            ><Italic className="h-3 w-3" /></Button>
                            <Button
                                variant={((selectedObject as fabric.Textbox).underline) ? 'default' : 'outline'}
                                size="icon" className="h-7 w-7"
                                onClick={() => update({ underline: !(selectedObject as fabric.Textbox).underline })}
                            ><Underline className="h-3 w-3" /></Button>
                            <div className="w-px bg-slate-200 mx-1" />
                            <Button variant={((selectedObject as fabric.Textbox).textAlign === 'left') ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => update({ textAlign: 'left' })}><AlignLeft className="h-3 w-3" /></Button>
                            <Button variant={((selectedObject as fabric.Textbox).textAlign === 'center') ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => update({ textAlign: 'center' })}><AlignCenter className="h-3 w-3" /></Button>
                            <Button variant={((selectedObject as fabric.Textbox).textAlign === 'right') ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => update({ textAlign: 'right' })}><AlignRight className="h-3 w-3" /></Button>
                        </div>
                    </>
                )}

                {/* Layer */}
                <div className="space-y-1.5">
                    <Label className="text-xs">Layer</Label>
                    <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={bringForward}>
                            <ArrowUp className="h-3 w-3 mr-1" /> Forward
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={sendBackward}>
                            <ArrowDown className="h-3 w-3 mr-1" /> Back
                        </Button>
                    </div>
                </div>

                {/* Delete */}
                <Button
                    variant="outline" size="sm"
                    className="w-full h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={onDelete}
                >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete Element
                </Button>
            </div>
        </div>
    );
}

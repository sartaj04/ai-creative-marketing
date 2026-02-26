'use client';

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as fabric from 'fabric';

export interface CanvasEditorRef {
    canvas: fabric.Canvas | null;
    exportJSON: () => object;
    loadJSON: (json: object) => void;
    exportPNG: () => string;
    addText: (text?: string) => void;
    addShape: (type: 'rect' | 'circle' | 'line') => void;
    addImage: (url: string) => void;
    undo: () => void;
    redo: () => void;
    deleteSelected: () => void;
    setCanvasDimensions: (w: number, h: number) => void;
}

interface CanvasEditorProps {
    width?: number;
    height?: number;
    background?: string;
    onSelectionChange?: (obj: fabric.FabricObject | null) => void;
    onModified?: () => void;
}

export const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(
    ({ width = 1080, height = 1080, background = '#0f172a', onSelectionChange, onModified }, ref) => {
        const canvasElRef = useRef<HTMLCanvasElement>(null);
        const canvasRef = useRef<fabric.Canvas | null>(null);
        const historyRef = useRef<string[]>([]);
        const historyIdxRef = useRef(-1);
        const ignoreHistoryRef = useRef(false);

        const [scale, setScale] = useState(0.45);

        // Initialize canvas
        useEffect(() => {
            if (!canvasElRef.current) return;

            const c = new fabric.Canvas(canvasElRef.current, {
                width,
                height,
                backgroundColor: background,
                preserveObjectStacking: true,
                selection: true,
            });

            canvasRef.current = c;

            // Save initial state
            saveHistory(c);

            // Event listeners
            c.on('selection:created', (e) => {
                onSelectionChange?.(e.selected?.[0] || null);
            });
            c.on('selection:updated', (e) => {
                onSelectionChange?.(e.selected?.[0] || null);
            });
            c.on('selection:cleared', () => {
                onSelectionChange?.(null);
            });
            c.on('object:modified', () => {
                saveHistory(c);
                onModified?.();
            });

            // Responsive scaling
            const handleResize = () => {
                const container = canvasElRef.current?.parentElement?.parentElement;
                if (container) {
                    const maxW = container.clientWidth - 40;
                    const maxH = container.clientHeight - 40;
                    const s = Math.min(maxW / width, maxH / height, 0.6);
                    setScale(s);
                }
            };
            handleResize();
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                c.dispose();
                canvasRef.current = null;
            };
        }, []);

        // Update background when prop changes
        useEffect(() => {
            if (canvasRef.current) {
                canvasRef.current.backgroundColor = background;
                canvasRef.current.renderAll();
            }
        }, [background]);

        const saveHistory = (c: fabric.Canvas) => {
            if (ignoreHistoryRef.current) return;
            const json = JSON.stringify((c as any).toJSON(['variable', 'variableName', 'isVariable']));
            const history = historyRef.current;
            // Trim future states
            history.splice(historyIdxRef.current + 1);
            history.push(json);
            if (history.length > 50) history.shift();
            historyIdxRef.current = history.length - 1;
        };

        const loadHistoryState = (idx: number) => {
            const c = canvasRef.current;
            if (!c || !historyRef.current[idx]) return;
            ignoreHistoryRef.current = true;
            c.loadFromJSON(JSON.parse(historyRef.current[idx])).then(() => {
                c.renderAll();
                ignoreHistoryRef.current = false;
                historyIdxRef.current = idx;
            });
        };

        useImperativeHandle(ref, () => ({
            canvas: canvasRef.current,
            exportJSON: () => {
                const c = canvasRef.current;
                if (!c) return {};
                return (c as any).toJSON(['variable', 'variableName', 'isVariable']);
            },
            loadJSON: (json: object) => {
                const c = canvasRef.current;
                if (!c) return;
                ignoreHistoryRef.current = true;
                c.loadFromJSON(json).then(() => {
                    c.renderAll();
                    ignoreHistoryRef.current = false;
                    saveHistory(c);
                });
            },
            exportPNG: () => {
                const c = canvasRef.current;
                if (!c) return '';
                return c.toDataURL({ format: 'png', multiplier: 2, quality: 1 });
            },
            addText: (text = 'Your text here') => {
                const c = canvasRef.current;
                if (!c) return;
                const t = new fabric.Textbox(text, {
                    left: width / 2 - 200,
                    top: height / 2 - 30,
                    width: 400,
                    fontSize: 40,
                    fontFamily: 'Inter',
                    fill: '#ffffff',
                    textAlign: 'center',
                });
                c.add(t);
                c.setActiveObject(t);
                c.renderAll();
                saveHistory(c);
                onModified?.();
            },
            addShape: (type) => {
                const c = canvasRef.current;
                if (!c) return;
                let obj: fabric.FabricObject;
                if (type === 'rect') {
                    obj = new fabric.Rect({
                        left: width / 2 - 100,
                        top: height / 2 - 100,
                        width: 200,
                        height: 200,
                        fill: '#3b82f6',
                        rx: 12,
                        ry: 12,
                    });
                } else if (type === 'circle') {
                    obj = new fabric.Circle({
                        left: width / 2 - 75,
                        top: height / 2 - 75,
                        radius: 75,
                        fill: '#8b5cf6',
                    });
                } else {
                    obj = new fabric.Line(
                        [width / 4, height / 2, (width * 3) / 4, height / 2],
                        { stroke: '#e2e8f0', strokeWidth: 4 }
                    );
                }
                c.add(obj);
                c.setActiveObject(obj);
                c.renderAll();
                saveHistory(c);
                onModified?.();
            },
            addImage: (url: string) => {
                const c = canvasRef.current;
                if (!c) return;
                fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
                    // Scale to fit within canvas
                    const maxDim = Math.min(width, height) * 0.6;
                    const scaleW = maxDim / (img.width || 1);
                    const scaleH = maxDim / (img.height || 1);
                    const s = Math.min(scaleW, scaleH, 1);
                    img.set({
                        left: width / 2 - ((img.width || 0) * s) / 2,
                        top: height / 2 - ((img.height || 0) * s) / 2,
                        scaleX: s,
                        scaleY: s,
                    });
                    c.add(img);
                    c.setActiveObject(img);
                    c.renderAll();
                    saveHistory(c);
                    onModified?.();
                });
            },
            undo: () => {
                if (historyIdxRef.current > 0) {
                    loadHistoryState(historyIdxRef.current - 1);
                }
            },
            redo: () => {
                if (historyIdxRef.current < historyRef.current.length - 1) {
                    loadHistoryState(historyIdxRef.current + 1);
                }
            },
            deleteSelected: () => {
                const c = canvasRef.current;
                if (!c) return;
                const active = c.getActiveObjects();
                if (active.length > 0) {
                    active.forEach((obj) => c.remove(obj));
                    c.discardActiveObject();
                    c.renderAll();
                    saveHistory(c);
                    onModified?.();
                }
            },
            setCanvasDimensions: (w: number, h: number) => {
                const c = canvasRef.current;
                if (!c) return;
                c.setDimensions({ width: w, height: h });
                c.renderAll();
            },
        }));

        return (
            <div className="flex-1 flex items-center justify-center bg-[#1a1a2e] overflow-hidden relative">
                {/* Checkerboard background */}
                <div
                    className="relative"
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'center center',
                    }}
                >
                    <canvas ref={canvasElRef} />
                </div>

                {/* Scale indicator */}
                <div className="absolute bottom-3 right-3 text-xs text-white/40 bg-black/30 px-2 py-1 rounded">
                    {Math.round(scale * 100)}%
                </div>
            </div>
        );
    }
);

CanvasEditor.displayName = 'CanvasEditor';

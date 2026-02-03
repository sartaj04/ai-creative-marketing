'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Loader2, Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { 
    getFieldByKey, 
    FieldSchema,
    isFieldEmpty,
    TONE_SLIDER_DEFINITIONS,
    FORMAT_PREFERENCE_DEFINITIONS
} from '@/lib/schemas/identity-schema';
import { cn } from '@/lib/utils';

interface NodePosition {
    id: string;
    x: number;
    y: number;
    type: string;
    label: string;
    value: any;
    field: string;
    size: 'sm' | 'md' | 'lg';
    isEmpty: boolean;
}

interface InlineEditorProps {
    node: NodePosition;
    onSave: (field: string, value: any) => Promise<void>;
    onClose: () => void;
}

export function InlineEditor({ node, onSave, onClose }: InlineEditorProps) {
    const schema = useMemo(() => getFieldByKey(node.field), [node.field]);
    const [saving, setSaving] = useState(false);
    
    // State for different field types
    const [stringValue, setStringValue] = useState('');
    const [arrayValue, setArrayValue] = useState<string[]>([]);
    const [objectArrayValue, setObjectArrayValue] = useState<Record<string, any>[]>([]);
    const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
    const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
    const [customInput, setCustomInput] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Initialize values based on field type
    useEffect(() => {
        if (!schema) return;

        const currentValue = node.value;

        switch (schema.type) {
            case 'string':
            case 'text':
            case 'enum':
                setStringValue(currentValue || '');
                break;
            case 'array':
                setArrayValue(Array.isArray(currentValue) ? currentValue : []);
                break;
            case 'array_enum':
                setArrayValue(Array.isArray(currentValue) ? currentValue : []);
                setSelectedOptions(new Set(Array.isArray(currentValue) ? currentValue : []));
                break;
            case 'object_array':
                setObjectArrayValue(Array.isArray(currentValue) ? currentValue : []);
                break;
            case 'slider_group':
                setSliderValues(currentValue && typeof currentValue === 'object' ? currentValue : {});
                break;
            case 'dict':
                // For dict types, we'll show as JSON for now
                setStringValue(currentValue ? JSON.stringify(currentValue, null, 2) : '{}');
                break;
        }

        setTimeout(() => inputRef.current?.focus(), 100);
    }, [node, schema]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSave = async () => {
        if (!schema) return;
        
        setSaving(true);
        try {
            let valueToSave: any;

            switch (schema.type) {
                case 'string':
                case 'text':
                case 'enum':
                    valueToSave = stringValue.trim();
                    break;
                case 'array':
                    valueToSave = arrayValue.filter(v => v.trim());
                    break;
                case 'array_enum':
                    valueToSave = Array.from(selectedOptions);
                    break;
                case 'object_array':
                    valueToSave = objectArrayValue;
                    break;
                case 'slider_group':
                    valueToSave = sliderValues;
                    break;
                case 'dict':
                    try {
                        valueToSave = JSON.parse(stringValue);
                    } catch {
                        valueToSave = {};
                    }
                    break;
                default:
                    valueToSave = stringValue;
            }

            await onSave(node.field, valueToSave);
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSaving(false);
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
        // Only save on Enter for single-line inputs
        if (e.key === 'Enter' && !e.shiftKey && schema?.type === 'string') {
            e.preventDefault();
            handleSave();
        }
    };

    const toggleOption = (optionValue: string) => {
        const newSelected = new Set(selectedOptions);
        if (newSelected.has(optionValue)) {
            newSelected.delete(optionValue);
        } else {
            if (schema?.maxItems && newSelected.size >= schema.maxItems) {
                return; // Max items reached
            }
            newSelected.add(optionValue);
        }
        setSelectedOptions(newSelected);
    };

    const addCustomValue = () => {
        if (!customInput.trim()) return;
        const newSelected = new Set(selectedOptions);
        newSelected.add(customInput.trim());
        setSelectedOptions(newSelected);
        setCustomInput('');
    };

    const addArrayItem = () => {
        if (!customInput.trim()) return;
        setArrayValue([...arrayValue, customInput.trim()]);
        setCustomInput('');
    };

    const removeArrayItem = (index: number) => {
        setArrayValue(arrayValue.filter((_, i) => i !== index));
    };

    const addObjectItem = () => {
        if (!schema?.objectSchema) return;
        const newItem: Record<string, any> = {};
        Object.keys(schema.objectSchema).forEach(key => {
            newItem[key] = '';
        });
        setObjectArrayValue([...objectArrayValue, newItem]);
    };

    const updateObjectItem = (index: number, key: string, value: any) => {
        const updated = [...objectArrayValue];
        updated[index] = { ...updated[index], [key]: value };
        setObjectArrayValue(updated);
    };

    const removeObjectItem = (index: number) => {
        setObjectArrayValue(objectArrayValue.filter((_, i) => i !== index));
    };

    if (!schema) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
            >
                <div className="bg-red-900/90 text-white p-4 rounded-lg">
                    Unknown field: {node.field}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl min-w-[400px] max-w-lg w-full max-h-[90vh] flex flex-col">
                {/* Header - Fixed */}
                <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 flex-shrink-0">
                    <div>
                        <h4 className="text-lg font-semibold text-slate-900">
                            {isFieldEmpty(node.value, schema) ? 'Add' : 'Edit'} {schema.label}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">{schema.description}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-900"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Required badge */}
                {schema.required && (
                    <div className="px-6 pt-4 flex-shrink-0">
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                            Required
                        </span>
                    </div>
                )}

                {/* Field-specific editors - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* STRING / ENUM */}
                    {(schema.type === 'string' || schema.type === 'enum') && (
                        <>
                            {schema.options ? (
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowDropdown(!showDropdown)}
                                        className="w-full px-4 py-3 text-left bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-cyan-300 transition-colors"
                                    >
                                        <span className={stringValue ? 'text-slate-900' : 'text-slate-400'}>
                                            {schema.options.find(o => o.value === stringValue)?.label || stringValue || 'Select an option...'}
                                        </span>
                                        <ChevronDown className={cn('w-5 h-5 text-slate-400 transition-transform', showDropdown && 'rotate-180')} />
                                    </button>
                                    {showDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                                            {schema.options.map(option => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setStringValue(option.value);
                                                        setShowDropdown(false);
                                                    }}
                                                    className={cn(
                                                        'w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between',
                                                        stringValue === option.value && 'bg-cyan-50'
                                                    )}
                                                >
                                                    <div>
                                                        <div className="font-medium text-slate-900">{option.label}</div>
                                                        {option.description && (
                                                            <div className="text-xs text-slate-500">{option.description}</div>
                                                        )}
                                                    </div>
                                                    {stringValue === option.value && (
                                                        <Check className="w-4 h-4 text-cyan-600" />
                                                    )}
                                                </button>
                                            ))}
                                            {schema.allowCustom && (
                                                <div className="p-3 border-t border-slate-100">
                                                    <Input
                                                        placeholder="Or enter custom value..."
                                                        value={stringValue}
                                                        onChange={(e) => setStringValue(e.target.value)}
                                                        className="text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Input
                                    ref={inputRef as any}
                                    value={stringValue}
                                    onChange={(e) => setStringValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={schema.placeholder || `Enter ${schema.label.toLowerCase()}...`}
                                    className="bg-slate-50 border-slate-200 text-slate-900"
                                />
                            )}
                        </>
                    )}

                    {/* TEXT */}
                    {schema.type === 'text' && (
                        <Textarea
                            ref={inputRef as any}
                            value={stringValue}
                            onChange={(e) => setStringValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={schema.placeholder || `Enter ${schema.label.toLowerCase()}...`}
                            className="bg-slate-50 border-slate-200 text-slate-900 min-h-[120px]"
                            maxLength={schema.validation?.maxLength}
                        />
                    )}

                    {/* ARRAY (free text) */}
                    {schema.type === 'array' && (
                        <div className="space-y-3">
                            {arrayValue.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        value={item}
                                        onChange={(e) => {
                                            const updated = [...arrayValue];
                                            updated[index] = e.target.value;
                                            setArrayValue(updated);
                                        }}
                                        className="bg-slate-50 border-slate-200 flex-1"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeArrayItem(index)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <div className="flex items-center gap-2">
                                <Input
                                    value={customInput}
                                    onChange={(e) => setCustomInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addArrayItem();
                                        }
                                    }}
                                    placeholder={`Add ${schema.label.toLowerCase()}...`}
                                    className="bg-slate-50 border-slate-200 flex-1"
                                />
                                <Button
                                    variant="outline"
                                    onClick={addArrayItem}
                                    disabled={!customInput.trim()}
                                    className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            {schema.maxItems && (
                                <p className="text-xs text-slate-500">
                                    {arrayValue.length} / {schema.maxItems} items
                                </p>
                            )}
                        </div>
                    )}

                    {/* ARRAY_ENUM (multi-select with options) */}
                    {schema.type === 'array_enum' && schema.options && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                {schema.options.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => toggleOption(option.value)}
                                        className={cn(
                                            'px-3 py-2 text-left text-sm rounded-lg border transition-all',
                                            selectedOptions.has(option.value)
                                                ? 'bg-cyan-50 border-cyan-300 text-cyan-900'
                                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-cyan-200'
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                'w-4 h-4 rounded border flex items-center justify-center',
                                                selectedOptions.has(option.value)
                                                    ? 'bg-cyan-600 border-cyan-600'
                                                    : 'border-slate-300'
                                            )}>
                                                {selectedOptions.has(option.value) && (
                                                    <Check className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                            <span>{option.label}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {schema.allowCustom && (
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                    <Input
                                        value={customInput}
                                        onChange={(e) => setCustomInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addCustomValue();
                                            }
                                        }}
                                        placeholder="Add custom..."
                                        className="bg-slate-50 border-slate-200 flex-1 text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addCustomValue}
                                        disabled={!customInput.trim()}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-1">
                                {Array.from(selectedOptions).map(val => (
                                    <span
                                        key={val}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs"
                                    >
                                        {schema.options?.find(o => o.value === val)?.label || val}
                                        <button
                                            type="button"
                                            onClick={() => toggleOption(val)}
                                            className="hover:text-cyan-900"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            {schema.maxItems && (
                                <p className="text-xs text-slate-500">
                                    {selectedOptions.size} / {schema.maxItems} selected
                                </p>
                            )}
                        </div>
                    )}

                    {/* OBJECT_ARRAY */}
                    {schema.type === 'object_array' && schema.objectSchema && (
                        <div className="space-y-4">
                            {objectArrayValue.map((item, index) => (
                                <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700">Item {index + 1}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeObjectItem(index)}
                                            className="text-red-500 hover:text-red-700 h-6 w-6"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    {Object.entries(schema.objectSchema!).map(([key, def]) => (
                                        <div key={key}>
                                            <label className="text-xs font-medium text-slate-600 block mb-1">
                                                {def.label}
                                            </label>
                                            <Input
                                                type={def.type === 'number' ? 'number' : 'text'}
                                                value={item[key] || ''}
                                                onChange={(e) => updateObjectItem(
                                                    index, 
                                                    key, 
                                                    def.type === 'number' ? Number(e.target.value) : e.target.value
                                                )}
                                                className="bg-white border-slate-200 text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                onClick={addObjectItem}
                                className="w-full border-dashed border-slate-300 text-slate-600"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add {schema.label}
                            </Button>
                        </div>
                    )}

                    {/* SLIDER_GROUP (tone_sliders, format_preferences) */}
                    {schema.type === 'slider_group' && (
                        <div className="space-y-6">
                            {node.field === 'tone_sliders' && Object.entries(TONE_SLIDER_DEFINITIONS).map(([key, def]) => (
                                <div key={key} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">{def.left}</span>
                                        <span className="text-xs text-slate-400">{def.description}</span>
                                        <span className="text-slate-600">{def.right}</span>
                                    </div>
                                    <Slider
                                        value={[sliderValues[key] ?? 0.5]}
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        onValueChange={([val]) => setSliderValues({ ...sliderValues, [key]: val })}
                                        className="w-full"
                                    />
                                </div>
                            ))}
                            {node.field === 'format_preferences' && Object.entries(FORMAT_PREFERENCE_DEFINITIONS).map(([key, def]) => (
                                <div key={key} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-slate-700">{def.label}</span>
                                        <span className="text-slate-500">{Math.round((sliderValues[key] ?? 0.5) * 100)}%</span>
                                    </div>
                                    <Slider
                                        value={[sliderValues[key] ?? 0.5]}
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        onValueChange={([val]) => setSliderValues({ ...sliderValues, [key]: val })}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-slate-400">{def.description}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* DICT (show as JSON for now) */}
                    {schema.type === 'dict' && (
                        <Textarea
                            value={stringValue}
                            onChange={(e) => setStringValue(e.target.value)}
                            placeholder="{}"
                            className="bg-slate-50 border-slate-200 text-slate-900 font-mono text-sm min-h-[120px]"
                        />
                    )}
                </div>

                {/* Actions - Fixed at bottom */}
                <div className="flex gap-3 p-6 pt-4 border-t border-slate-100 flex-shrink-0">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

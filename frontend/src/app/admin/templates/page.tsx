"use client";

import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    Eye,
    Edit2,
    CheckCircle2,
    AlertCircle,
    Archive,
    FileCode,
    Sparkles,
    Code2,
    ChevronDown
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { format } from "date-fns";

export default function TemplateListPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [showAddMenu, setShowAddMenu] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
                setShowAddMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/admin/templates/");
            setTemplates(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Failed to fetch templates:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED":
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved
                    </span>
                );
            case "DRAFT":
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                        <Clock className="w-3 h-3" />
                        Draft
                    </span>
                );
            case "DEPRECATED":
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                        <Archive className="w-3 h-3" />
                        Deprecated
                    </span>
                );
            default:
                return (
                    <span className="text-xs font-medium text-gray-700 bg-gray-50 px-2 py-1 rounded-full">
                        {status}
                    </span>
                );
        }
    };

    const filteredTemplates = (templates || []).filter(template => {
        const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || template.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
                        <p className="text-gray-500">Manage and validate creative templates for the platform.</p>
                    </div>

                    {/* Add Template Dropdown */}
                    <div className="relative" ref={addMenuRef}>
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add Template
                            <ChevronDown className={`w-4 h-4 transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showAddMenu && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                                <div className="p-2">
                                    <Link
                                        href="/admin/templates/ai-create"
                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gradient-to-r hover:from-primary-50 hover:to-violet-50 transition group"
                                        onClick={() => setShowAddMenu(false)}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 group-hover:text-primary-700">AI-Powered</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Upload image or HTML, let AI process</p>
                                        </div>
                                    </Link>
                                    <Link
                                        href="/admin/templates/new"
                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition group"
                                        onClick={() => setShowAddMenu(false)}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                            <Code2 className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Manual</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Write HTML/CSS code directly</p>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition bg-white"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="APPROVED">Approved</option>
                            <option value="DEPRECATED">Deprecated</option>
                        </select>
                        <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600">
                            <Filter className="w-4 h-4" />
                            More
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm font-medium">
                                <tr>
                                    <th className="px-6 py-4">Template</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Platform</th>
                                    <th className="px-6 py-4">Last Updated</th>
                                    <th className="px-6 py-4">Version</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-5 bg-gray-100 rounded w-48" /></td>
                                            <td className="px-6 py-4"><div className="h-5 bg-gray-100 rounded w-20" /></td>
                                            <td className="px-6 py-4"><div className="h-5 bg-gray-100 rounded w-24" /></td>
                                            <td className="px-6 py-4"><div className="h-5 bg-gray-100 rounded w-32" /></td>
                                            <td className="px-6 py-4"><div className="h-5 bg-gray-100 rounded w-12" /></td>
                                            <td className="px-6 py-4 text-right"><div className="h-5 bg-gray-100 rounded w-8 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : filteredTemplates.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No templates found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTemplates.map((template) => (
                                        <tr key={template.id} className="hover:bg-gray-50 transition group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                                        {template.thumbnail_url ? (
                                                            <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FileCode className="w-5 h-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 leading-none mb-1">{template.name}</p>
                                                        <p className="text-xs text-gray-500 font-mono truncate max-w-[150px]">{template.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5 align-start">
                                                    {getStatusBadge(template.status)}
                                                    {template.status === "DRAFT" && !template.dummy_render_passed && (
                                                        <span className="flex items-center gap-1 text-[10px] text-amber-600">
                                                            <AlertCircle className="w-3 h-3" />
                                                            QA Required
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600 capitalize">{template.platform}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">
                                                    {format(new Date(template.updated_at), "MMM d, yyyy")}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                                    v{template.version}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/admin/templates/${template.id}`}
                                                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                                                        title="Edit Template"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Link>
                                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

function Clock(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}

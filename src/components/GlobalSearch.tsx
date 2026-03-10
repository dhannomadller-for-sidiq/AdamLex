'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Gavel, CreditCard, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{
        leads: any[];
        cases: any[];
        payments: any[];
    }>({ leads: [], cases: [], payments: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!query.trim() || query.length < 2) {
            setResults({ leads: [], cases: [], payments: [] });
            setIsSearching(false);
            return;
        }

        const debounceTimer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const [leadsRes, casesRes, paymentsRes] = await Promise.all([
                    supabase.from('leads')
                        .select('id, client_name, phone_number, status')
                        .or(`client_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
                        .limit(5),
                    supabase.from('court_cases')
                        .select('id, lead_id, cnr_number, court_name')
                        .or(`cnr_number.ilike.%${query}%,court_name.ilike.%${query}%`)
                        .limit(5),
                    supabase.from('payments')
                        .select('id, lead_id, payment_id, remarks, total_payment')
                        .or(`payment_id.ilike.%${query}%,remarks.ilike.%${query}%`)
                        .limit(5)
                ]);

                setResults({
                    leads: leadsRes.data || [],
                    cases: casesRes.data || [],
                    payments: paymentsRes.data || []
                });
            } catch (err) {
                console.error('Global search error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [query]);

    const handleResultClick = (type: string, id: string, leadId?: string) => {
        setIsOpen(false);
        setQuery('');

        const targetLeadId = leadId || id;
        const currentPath = window.location.pathname;

        if (currentPath.startsWith('/admin')) {
            router.push(`/admin/workspace?searchId=${targetLeadId}`);
        } else if (currentPath.startsWith('/lawyer')) {
            router.push(`/lawyer?searchId=${targetLeadId}&tab=Workspace`);
        } else {
            // Default fallback
            router.push(`/admin/workspace?searchId=${targetLeadId}`);
        }
    };

    const hasResults = results.leads.length > 0 || results.cases.length > 0 || results.payments.length > 0;

    return (
        <div className="relative w-full max-w-md" ref={searchRef}>
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-gold)] transition-colors" size={18} />
                <input
                    type="text"
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-[var(--border-color)] rounded-xl py-2 pl-10 pr-10 text-sm focus:outline-none focus:border-[var(--accent-gold)] focus:bg-[rgba(255,255,255,0.08)] transition-all placeholder:text-[var(--text-secondary)]/50"
                    placeholder="Search CNR, Clients, Payments..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                />
                {query && (
                    <button
                        onClick={() => { setQuery(''); setResults({ leads: [], cases: [], payments: [] }); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && (query.length >= 2) && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-panel border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[400px] overflow-y-auto p-2 space-y-4">
                        {isSearching && (
                            <div className="flex items-center justify-center py-8 gap-3 text-[var(--text-secondary)]">
                                <Loader2 size={18} className="animate-spin text-[var(--accent-gold)]" />
                                <span className="text-sm font-medium">Searching records...</span>
                            </div>
                        )}

                        {!isSearching && !hasResults && (
                            <div className="py-8 text-center text-[var(--text-secondary)]">
                                <p className="text-sm">No matches found for "{query}"</p>
                            </div>
                        )}

                        {/* Leads Results */}
                        {results.leads.length > 0 && (
                            <div>
                                <h4 className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--accent-gold)] opacity-70 mb-1 flex items-center gap-2">
                                    <User size={12} /> Clients
                                </h4>
                                <div className="space-y-1">
                                    {results.leads.map(lead => (
                                        <button
                                            key={lead.id}
                                            onClick={() => handleResultClick('lead', lead.id)}
                                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-[rgba(255,255,255,0.05)] group transition-all"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-semibold text-[var(--text-primary)]">{lead.client_name}</p>
                                                    <p className="text-xs text-[var(--text-secondary)]">{lead.phone_number}</p>
                                                </div>
                                                <ArrowRight size={14} className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cases Results */}
                        {results.cases.length > 0 && (
                            <div>
                                <h4 className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#a78bfa] opacity-70 mb-1 flex items-center gap-2">
                                    <Gavel size={12} /> Court Cases
                                </h4>
                                <div className="space-y-1">
                                    {results.cases.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => handleResultClick('case', c.id, c.lead_id)}
                                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-[rgba(255,255,255,0.05)] group transition-all"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-semibold font-mono text-[var(--text-primary)] tracking-tight">{c.cnr_number || 'No CNR'}</p>
                                                    <p className="text-xs text-[var(--text-secondary)]">{c.court_name}</p>
                                                </div>
                                                <ArrowRight size={14} className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Payments Results */}
                        {results.payments.length > 0 && (
                            <div>
                                <h4 className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500 opacity-70 mb-1 flex items-center gap-2">
                                    <CreditCard size={12} /> Payments
                                </h4>
                                <div className="space-y-1">
                                    {results.payments.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleResultClick('payment', p.id, p.lead_id)}
                                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-[rgba(255,255,255,0.05)] group transition-all"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-semibold text-[var(--text-primary)]">Ref: {p.payment_id || 'Cash'}</p>
                                                    <p className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">{p.remarks || 'No remarks'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-500">₹{Number(p.total_payment).toLocaleString('en-IN')}</p>
                                                    <ArrowRight size={14} className="ml-auto text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

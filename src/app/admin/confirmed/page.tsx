'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase, CreditCard, ChevronDown, CheckCircle, FileText, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ConfirmedLeadsPage() {
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [confirmedLeads, setConfirmedLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchConfirmed() {
            // Join leads with payments and profiles
            const { data, error } = await supabase
                .from('leads')
                .select(`
          id,
          client_name,
          case_mode,
          case_summary,
          status,
          profiles(full_name),
          payments(total_payment, advance_payment, payment_id, remarks)
        `)
                .eq('status', 'Confirmed')
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching confirmed leads:', error);
                // Optionally set an error state here
            }
            if (data) setConfirmedLeads(data);
            setLoading(false);
        }
        fetchConfirmed();
    }, []);

    const toggleSummary = (index: number) => {
        if (expandedRow === index) {
            setExpandedRow(null);
        } else {
            setExpandedRow(index);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] relative inline-block">
                        Confirmed Cases & Payments
                        <div className="absolute -bottom-2 left-0 w-1/3 h-1 bg-gradient-to-r from-[var(--success-green)] to-transparent rounded-full"></div>
                    </h2>
                    <p className="text-[var(--text-secondary)] mt-3">Review closed cases, collected payments, and detailed case summaries.</p>
                </div>
                <button className="btn-secondary flex items-center gap-2 border-[var(--success-green)] text-[var(--success-green)] hover:bg-[rgba(16,185,129,0.1)]">
                    <Download size={18} />
                    Export Report
                </button>
            </header>

            <div className="glass-card rounded-xl overflow-hidden stagger-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-[rgba(0,0,0,0.3)] text-[var(--text-secondary)] text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                                <th className="p-5 font-semibold">Client Name</th>
                                <th className="p-5 font-semibold">Assigned Lawyer</th>
                                <th className="p-5 font-semibold">Total Fee</th>
                                <th className="p-5 font-semibold">Advance Paid</th>
                                <th className="p-5 font-semibold">Payment ID</th>
                                <th className="p-5 font-semibold text-right">Case Summary</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-[var(--accent-gold)] animate-pulse">Loading confirmed cases...</td></tr>
                            ) : confirmedLeads.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-[var(--text-secondary)]">No confirmed cases found.</td></tr>
                            ) : (
                                confirmedLeads.map((lead, i) => {
                                    // Safely extract joined data
                                    const lawyerName = lead.profiles?.full_name || 'Unassigned';
                                    const payment = lead.payments?.[0] || { total_payment: 0, advance_payment: 0, payment_id: 'N/A', remarks: 'No payment record' };

                                    return (
                                        <React.Fragment key={lead.id}>
                                            <tr className={`hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer ${expandedRow === i ? 'bg-[rgba(212,175,55,0.05)]' : ''}`} onClick={() => toggleSummary(i)}>
                                                <td className="p-5">
                                                    <p className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                                        <CheckCircle size={16} className="text-[var(--success-green)]" />
                                                        {lead.client_name}
                                                    </p>
                                                    <p className="text-xs text-[var(--text-secondary)] mt-1">{lead.case_mode || 'Unspecified Case'}</p>
                                                </td>
                                                <td className="p-5 text-sm font-medium">{lawyerName}</td>
                                                <td className="p-5 font-semibold text-[var(--text-primary)]">
                                                    ₹{Number(payment.total_payment).toLocaleString('en-IN')}
                                                </td>
                                                <td className="p-5">
                                                    <span className="text-[var(--success-green)] font-medium">₹{Number(payment.advance_payment).toLocaleString('en-IN')}</span>
                                                </td>
                                                <td className="p-5 text-xs font-mono text-[var(--text-secondary)]">
                                                    {payment.payment_id}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <button
                                                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-2 ml-auto"
                                                        onClick={(e) => { e.stopPropagation(); toggleSummary(i); }}
                                                    >
                                                        <FileText size={14} />
                                                        {expandedRow === i ? 'Close Summary' : 'View Summary'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* Expanded Summary Row */}
                                            {expandedRow === i && (
                                                <tr className="bg-[rgba(0,0,0,0.2)] border-b-2 border-[var(--accent-gold)]">
                                                    <td colSpan={6} className="p-6">
                                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                                                            <div className="lg:col-span-2 space-y-4">
                                                                <div>
                                                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Detailed Case Summary</h4>
                                                                    <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-sm leading-relaxed whitespace-pre-wrap">
                                                                        {lead.case_summary || 'No summary provided.'}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Lawyer's Remarks</h4>
                                                                    <p className="text-sm italic text-[var(--text-primary)] opacity-80">"{payment.remarks}"</p>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <div className="glass-panel p-4 rounded-lg">
                                                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-3 flex items-center gap-2">
                                                                        <CreditCard size={14} /> Financial Breakdown
                                                                    </h4>
                                                                    <div className="space-y-2 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-[var(--text-secondary)]">Total Settled:</span>
                                                                            <span className="font-semibold">₹{Number(payment.total_payment).toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-[var(--text-secondary)]">Advance Received:</span>
                                                                            <span className="text-[var(--success-green)] font-semibold">₹{Number(payment.advance_payment).toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                        <div className="my-2 border-t border-[var(--border-color)]"></div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-[var(--text-secondary)]">Balance Due:</span>
                                                                            <span className="text-[var(--danger-red)] font-semibold">₹{(Number(payment.total_payment) - Number(payment.advance_payment)).toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

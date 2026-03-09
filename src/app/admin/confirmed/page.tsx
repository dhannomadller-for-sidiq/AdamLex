'use client';

import React, { useEffect, useState } from 'react';
import {
    Clock, CheckCircle, X, Loader2, Users, Phone, FileText,
    CreditCard, MessageSquare, ChevronRight, Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ModalPortal from '@/components/ModalPortal';

export default function ApprovalPendingPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [associatesList, setAssociatesList] = useState<any[]>([]);
    const [lawyersList, setLawyersList] = useState<any[]>([]);

    // View Details modal
    const [viewingLead, setViewingLead] = useState<any | null>(null);

    // Approve modal
    const [approvingLead, setApprovingLead] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [approveData, setApproveData] = useState({
        assigned_to_lawyer_id: '',
        associate_id: '',
        total_payment: '',
        advance_payment: '',
        associate_total_payment: '',
        associate_advance_payment: '',
        remarks: '',
    });

    async function fetchPending() {
        setLoading(true);
        const { data, error } = await supabase
            .from('leads')
            .select(`
                id,
                client_name,
                phone_number,
                case_mode,
                case_summary,
                status,
                updated_at,
                created_at,
                next_followup_date,
                associate_id,
                associate_payment,
                associate_advance_payment,
                associate_remarks,
                admin_approved,
                profiles!assigned_to(id, full_name, phone_number),
                associate_profile:profiles!associate_id(full_name),
                payments(total_payment, advance_payment, payment_id, remarks),
                followups(id, summary_text, created_at, status_at_time, profiles(full_name))
            `)
            .eq('status', 'Confirmed')
            .eq('admin_approved', false)
            .order('updated_at', { ascending: false });

        if (error) console.error('Error fetching pending:', error);
        setLeads(data || []);
        setLoading(false);
    }

    async function fetchAssociates() {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, associates(specialization)')
            .eq('role', 'associate');
        if (data) {
            setAssociatesList(data.map((item: any) => ({
                id: item.id,
                full_name: item.full_name,
                specialization: item.associates?.[0]?.specialization || ''
            })));
        }
    }

    async function fetchLawyers() {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'lawyer');
        if (data) setLawyersList(data);
    }

    useEffect(() => {
        fetchPending();
        fetchAssociates();
        fetchLawyers();
    }, []);

    function openApprove(lead: any) {
        setViewingLead(null);
        setApprovingLead(lead);
        setApproveData({
            assigned_to_lawyer_id: '',
            associate_id: lead.associate_id || '',
            total_payment: lead.payments?.[0]?.total_payment?.toString() || '',
            advance_payment: lead.payments?.[0]?.advance_payment?.toString() || '',
            associate_total_payment: lead.associate_payment?.toString() || '',
            associate_advance_payment: lead.associate_advance_payment?.toString() || '',
            remarks: lead.associate_remarks || '',
        });
    }

    async function handleApprove(e: React.FormEvent) {
        e.preventDefault();
        if (!approvingLead) return;
        setIsSubmitting(true);

        try {
            const { error: leadErr } = await supabase
                .from('leads')
                .update({
                    admin_approved: true,
                    assigned_to: approveData.assigned_to_lawyer_id || approvingLead.assigned_to || null,
                    associate_id: approveData.associate_id || null,
                    associate_payment: Number(approveData.associate_total_payment) || 0,
                    associate_advance_payment: Number(approveData.associate_advance_payment) || 0,
                    associate_remarks: approveData.remarks,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', approvingLead.id);

            if (leadErr) throw leadErr;

            if (approveData.total_payment) {
                const existing = approvingLead.payments?.[0];
                if (existing) {
                    await supabase.from('payments').update({
                        total_payment: Number(approveData.total_payment),
                        advance_payment: Number(approveData.advance_payment) || 0,
                        remarks: approveData.remarks,
                    }).eq('lead_id', approvingLead.id);
                } else {
                    await supabase.from('payments').insert({
                        lead_id: approvingLead.id,
                        total_payment: Number(approveData.total_payment),
                        advance_payment: Number(approveData.advance_payment) || 0,
                        remarks: approveData.remarks,
                    });
                }
            }

            setApprovingLead(null);
            fetchPending();
        } catch (err: any) {
            console.error('Approve error:', err);
            alert('Error: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    const caseColor = (mode: string) => {
        const m = (mode || '').toLowerCase();
        if (m.includes('criminal')) return 'text-red-400 bg-red-400/10 border-red-400/30';
        if (m.includes('civil')) return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
        if (m.includes('family')) return 'text-pink-400 bg-pink-400/10 border-pink-400/30';
        return 'text-[var(--accent-gold)] bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.3)]';
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <Clock size={28} className="text-[var(--accent-gold)]" />
                        Approval Pending
                    </h2>
                    <p className="text-[var(--text-secondary)] mt-1">Click any case to view full details before approving.</p>
                </div>
                <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] border border-[rgba(212,175,55,0.3)]">
                    {leads.length} Pending
                </span>
            </header>

            {loading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="animate-spin text-[var(--accent-gold)]" size={36} />
                </div>
            ) : leads.length === 0 ? (
                <div className="glass-card rounded-2xl p-16 text-center">
                    <CheckCircle size={48} className="text-[var(--success-green)] mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">All Clear!</h3>
                    <p className="text-[var(--text-secondary)]">No cases are pending approval right now.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {leads.map((lead) => {
                        const lawyer = (lead.profiles as any)?.full_name || 'Unassigned';
                        const associate = (lead.associate_profile as any)?.full_name;
                        return (
                            <div
                                key={lead.id}
                                className="glass-card rounded-2xl border border-[rgba(212,175,55,0.12)] p-5 flex flex-col lg:flex-row gap-4 items-start lg:items-center cursor-pointer hover:border-[rgba(212,175,55,0.35)] hover:bg-[rgba(212,175,55,0.03)] transition-all group"
                                onClick={() => setViewingLead(lead)}
                            >
                                {/* Lead info */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors">{lead.client_name}</h3>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${caseColor(lead.case_mode)}`}>
                                            {lead.case_mode || 'General'}
                                        </span>
                                        {associate && (
                                            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border text-[#a78bfa] bg-[rgba(139,92,246,0.1)] border-[rgba(139,92,246,0.3)]">
                                                {associate}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-5 text-xs text-[var(--text-secondary)] flex-wrap">
                                        <span className="flex items-center gap-1"><Phone size={11} /> {lead.phone_number}</span>
                                        <span className="flex items-center gap-1"><Users size={11} /> {lawyer}</span>
                                        <span className="flex items-center gap-1"><Clock size={11} /> {new Date(lead.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setViewingLead(lead)}
                                        className="h-9 px-4 rounded-xl font-bold text-xs border border-[rgba(255,255,255,0.1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[rgba(255,255,255,0.2)] transition-all flex items-center gap-1.5"
                                    >
                                        <FileText size={13} /> View Details
                                    </button>
                                    <button
                                        onClick={() => openApprove(lead)}
                                        className="h-9 px-4 rounded-xl font-bold text-xs bg-[var(--accent-gold)] text-[var(--bg-main)] hover:brightness-110 transition-all flex items-center gap-1.5 shadow-lg shadow-[rgba(212,175,55,0.15)]"
                                    >
                                        <CheckCircle size={13} /> Approve
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== VIEW DETAILS MODAL ===== */}
            {viewingLead && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                        <div className="glass-card w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col max-h-[90vh]">

                            {/* Modal Header */}
                            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-start bg-[rgba(0,0,0,0.3)] shrink-0">
                                <div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-xl font-bold text-[var(--text-primary)]">{viewingLead.client_name}</h3>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${caseColor(viewingLead.case_mode)}`}>
                                            {viewingLead.case_mode || 'General'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                                        <Phone size={11} /> {viewingLead.phone_number}
                                    </p>
                                </div>
                                <button onClick={() => setViewingLead(null)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full">
                                    <X size={18} className="text-[var(--text-secondary)]" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto flex-1 p-6 space-y-6">

                                {/* Client & Lawyer Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                        <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest mb-2 flex items-center gap-1.5"><Users size={10} /> Assigned Lawyer</p>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{(viewingLead.profiles as any)?.full_name || '—'}</p>
                                        {(viewingLead.profiles as any)?.phone_number && (
                                            <p className="text-xs text-[var(--text-secondary)] mt-1">{(viewingLead.profiles as any).phone_number}</p>
                                        )}
                                    </div>
                                    <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                        <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest mb-2 flex items-center gap-1.5"><Calendar size={10} /> Confirmed On</p>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                                            {new Date(viewingLead.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                                            {new Date(viewingLead.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Case Summary */}
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest mb-2 flex items-center gap-1.5"><FileText size={10} /> Case Summary</p>
                                    <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-sm leading-relaxed text-[var(--text-secondary)]">
                                        {viewingLead.case_summary || 'No summary provided.'}
                                    </div>
                                </div>

                                {/* Payment Info from Lawyer */}
                                {viewingLead.payments?.[0] && (
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest mb-3 flex items-center gap-1.5"><CreditCard size={10} /> Payment Details (by Lawyer)</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
                                                <p className="text-xs text-[var(--text-secondary)] mb-1">Total Fee</p>
                                                <p className="text-base font-bold text-[var(--text-primary)]">₹{Number(viewingLead.payments[0].total_payment || 0).toLocaleString('en-IN')}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
                                                <p className="text-xs text-[var(--text-secondary)] mb-1">Advance Paid</p>
                                                <p className="text-base font-bold text-[var(--success-green)]">₹{Number(viewingLead.payments[0].advance_payment || 0).toLocaleString('en-IN')}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
                                                <p className="text-xs text-[var(--text-secondary)] mb-1">Balance Due</p>
                                                <p className="text-base font-bold text-[var(--danger-red)]">₹{(Number(viewingLead.payments[0].total_payment || 0) - Number(viewingLead.payments[0].advance_payment || 0)).toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                        {viewingLead.payments[0].remarks && (
                                            <p className="text-xs italic text-[var(--text-secondary)] mt-2 ml-1">"{viewingLead.payments[0].remarks}"</p>
                                        )}
                                    </div>
                                )}

                                {/* Interaction / Followup History */}
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest mb-3 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5"><MessageSquare size={10} /> Interaction History</span>
                                        <span className="bg-[rgba(255,255,255,0.08)] px-2 py-0.5 rounded-full font-normal normal-case tracking-normal text-[10px]">
                                            {viewingLead.followups?.length || 0} records
                                        </span>
                                    </p>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                        {(!viewingLead.followups || viewingLead.followups.length === 0) ? (
                                            <p className="text-xs text-[var(--text-secondary)] italic">No interactions recorded.</p>
                                        ) : (
                                            [...viewingLead.followups]
                                                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                .map((f: any) => (
                                                    <div key={f.id} className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[10px] font-bold text-[var(--accent-gold)] uppercase tracking-wider">{f.status_at_time}</span>
                                                            <span className="text-[10px] text-[var(--text-secondary)]">{new Date(f.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                        </div>
                                                        {f.profiles?.full_name && (
                                                            <p className="text-[10px] text-[var(--text-secondary)] mb-1">by {f.profiles.full_name}</p>
                                                        )}
                                                        <p className="text-xs text-[var(--text-secondary)]">{f.summary_text || 'Status updated.'}</p>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-5 border-t border-[var(--border-color)] bg-[rgba(0,0,0,0.2)] shrink-0 flex justify-between items-center gap-3">
                                <button onClick={() => setViewingLead(null)} className="btn-secondary px-6">Close</button>
                                <button
                                    onClick={() => openApprove(viewingLead)}
                                    className="h-10 px-6 rounded-xl font-bold text-sm bg-[var(--accent-gold)] text-[var(--bg-main)] hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-[rgba(212,175,55,0.2)]"
                                >
                                    <CheckCircle size={15} /> Approve &amp; Assign
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* ===== APPROVE & ASSIGN MODAL ===== */}
            {approvingLead && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                        <div className="glass-card w-full max-w-lg rounded-2xl shadow-2xl border border-[rgba(212,175,55,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-start bg-[rgba(0,0,0,0.3)] shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                        <CheckCircle size={18} className="text-[var(--accent-gold)]" />
                                        Approve &amp; Assign
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                                        <span className="font-semibold text-[var(--text-primary)]">{approvingLead.client_name}</span> — {approvingLead.case_mode || 'General Case'}
                                    </p>
                                </div>
                                <button onClick={() => setApprovingLead(null)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full">
                                    <X size={18} className="text-[var(--text-secondary)]" />
                                </button>
                            </div>

                            <form onSubmit={handleApprove} className="overflow-y-auto flex flex-col flex-1">
                                <div className="p-6 space-y-5 flex-1">

                                    {/* Assign Lawyer */}
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-[var(--text-secondary)] mb-2 tracking-wider flex items-center gap-1.5">
                                            <Users size={11} /> Assign Lawyer
                                        </label>
                                        <select
                                            className="input-field w-full"
                                            value={approveData.assigned_to_lawyer_id}
                                            onChange={e => setApproveData(p => ({ ...p, assigned_to_lawyer_id: e.target.value }))}
                                        >
                                            <option value="">— Keep Current Lawyer —</option>
                                            {lawyersList.map(l => (
                                                <option key={l.id} value={l.id}>{l.full_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Assign Associate */}
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-[var(--text-secondary)] mb-2 tracking-wider flex items-center gap-1.5">
                                            <Users size={11} /> Assign Associate <span className="font-normal normal-case tracking-normal">(optional)</span>
                                        </label>
                                        <select
                                            className="input-field w-full"
                                            value={approveData.associate_id}
                                            onChange={e => setApproveData(p => ({ ...p, associate_id: e.target.value }))}
                                        >
                                            <option value="">— No Associate —</option>
                                            {associatesList.map(a => (
                                                <option key={a.id} value={a.id}>{a.full_name}{a.specialization ? ` · ${a.specialization}` : ''}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* ASSOCIATE PAYMENT — right below associate dropdown */}
                                    {approveData.associate_id && (
                                        <div className="rounded-xl border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.06)] p-4 space-y-3 animate-fade-in">
                                            <p className="text-[10px] uppercase font-bold text-[#a78bfa] tracking-widest flex items-center gap-1.5">
                                                <Users size={11} /> Associate Settlement
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">Total Fee (₹)</label>
                                                    <input
                                                        type="number"
                                                        className="input-field w-full"
                                                        placeholder="e.g. 20000"
                                                        value={approveData.associate_total_payment}
                                                        onChange={e => setApproveData(p => ({ ...p, associate_total_payment: e.target.value }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">Advance Paid (₹)</label>
                                                    <input
                                                        type="number"
                                                        className="input-field w-full"
                                                        placeholder="e.g. 5000"
                                                        value={approveData.associate_advance_payment}
                                                        onChange={e => setApproveData(p => ({ ...p, associate_advance_payment: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            {approveData.associate_total_payment && approveData.associate_advance_payment && (
                                                <div className="flex justify-between text-xs pt-1 border-t border-[rgba(139,92,246,0.2)]">
                                                    <span className="text-[var(--text-secondary)]">Balance Due:</span>
                                                    <span className="font-bold text-[var(--danger-red)]">
                                                        ₹{(Number(approveData.associate_total_payment) - Number(approveData.associate_advance_payment)).toLocaleString('en-IN')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* CLIENT PAYMENT — visible boxed card */}
                                    <div className="rounded-xl border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.04)] p-4 space-y-3">
                                        <p className="text-[10px] uppercase font-bold text-[var(--accent-gold)] tracking-widest flex items-center gap-1.5">
                                            <CreditCard size={11} /> Client Payment
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">Total Fee (₹)</label>
                                                <input
                                                    type="number"
                                                    className="input-field w-full"
                                                    placeholder="e.g. 50000"
                                                    value={approveData.total_payment}
                                                    onChange={e => setApproveData(p => ({ ...p, total_payment: e.target.value }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">Advance Paid (₹)</label>
                                                <input
                                                    type="number"
                                                    className="input-field w-full"
                                                    placeholder="e.g. 10000"
                                                    value={approveData.advance_payment}
                                                    onChange={e => setApproveData(p => ({ ...p, advance_payment: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        {approveData.total_payment && approveData.advance_payment && (
                                            <div className="flex justify-between text-xs pt-1 border-t border-[rgba(212,175,55,0.15)]">
                                                <span className="text-[var(--text-secondary)]">Balance Due:</span>
                                                <span className="font-bold text-[var(--danger-red)]">
                                                    ₹{(Number(approveData.total_payment) - Number(approveData.advance_payment)).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Remarks */}
                                    <div>
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1 uppercase font-bold tracking-wider">Admin Remarks</label>
                                        <textarea className="input-field w-full resize-none" rows={3} placeholder="Internal remarks..."
                                            value={approveData.remarks} onChange={e => setApproveData(p => ({ ...p, remarks: e.target.value }))} />
                                    </div>
                                </div>

                                <div className="p-5 border-t border-[var(--border-color)] bg-[rgba(0,0,0,0.2)] shrink-0 flex gap-3">
                                    <button type="button" onClick={() => setApprovingLead(null)} className="btn-secondary flex-1">Cancel</button>
                                    <button type="submit" disabled={isSubmitting}
                                        className="flex-1 h-10 rounded-xl font-bold text-sm bg-[var(--accent-gold)] text-[var(--bg-main)] hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                        {isSubmitting ? 'Approving...' : 'Confirm Approval'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}

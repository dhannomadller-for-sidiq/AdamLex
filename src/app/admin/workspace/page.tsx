'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Gavel,
    CreditCard,
    Briefcase,
    FileText,
    X,
    Loader2,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    Phone,
    Users,
    Clock,
    Plus,
    Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ChatPanel from '@/components/ChatPanel';
import ModalPortal from '@/components/ModalPortal';
import CaseProgressView from '@/components/CaseProgressView';

export default function WorkspacePage() {
    const searchParams = useSearchParams();
    const searchId = searchParams.get('searchId');
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    useEffect(() => {
        if (searchId) {
            setExpandedRow(searchId);
        }
    }, [searchId]);
    const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
    const [chatLead, setChatLead] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showQuickCollect, setShowQuickCollect] = useState(false);
    const [showAssociateSettle, setShowAssociateSettle] = useState(false);
    const [activeTab, setActiveTab] = useState<'activity' | 'court' | 'finance'>('activity');
    const [paymentData, setPaymentData] = useState({
        amount: '',
        payment_id: '',
        remarks: ''
    });
    const [associateSettleData, setAssociateSettleData] = useState({
        amount: '',
        remarks: ''
    });

    async function fetchWorkspace() {
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
                associate_id,
                associate_payment,
                associate_advance_payment,
                associate_remarks,
                admin_approved,
                profiles!assigned_to(full_name),
                associate_profile:profiles!associate_id(full_name),
                payments(total_payment, advance_payment, remarks),
                followups(id, summary_text, created_at, status_at_time)
            `)
            .eq('status', 'Confirmed')
            .eq('admin_approved', true)
            .order('updated_at', { ascending: false });

        if (error) console.error('Workspace fetch error:', error);
        setLeads(data || []);
        setLoading(false);
    }

    useEffect(() => {
        fetchWorkspace();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase.from('profiles').select('id, full_name').eq('id', user.id).single()
                    .then(({ data }) => { if (data) setCurrentUser({ id: data.id, name: data.full_name }); });
            }
        });
    }, []);

    const handleCollectPayment = async (e: React.FormEvent, leadId: string) => {
        e.preventDefault();
        if (!paymentData.amount) return;
        setIsSubmitting(true);

        try {
            const currentLead = leads.find(l => l.id === leadId);
            const totalFee = currentLead?.payments?.[0]?.total_payment || 0;

            const res = await fetch('/api/admin/record-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    total_payment: totalFee,
                    advance_payment: paymentData.amount,
                    payment_id: paymentData.payment_id,
                    remarks: paymentData.remarks
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to record payment');

            setShowQuickCollect(false);
            setPaymentData({ amount: '', payment_id: '', remarks: '' });
            fetchWorkspace();
        } catch (err: any) {
            console.error('Error collecting payment:', err);
            alert(`Failed to record payment: ${err?.message || 'Unknown error'}. If this is an RLS policy issue, please run the SQL fix in the Supabase SQL Editor.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSettleAssociate = async (e: React.FormEvent, leadId: string) => {
        e.preventDefault();
        if (!associateSettleData.amount) return;
        setIsSubmitting(true);

        try {
            const currentLead = leads.find(l => l.id === leadId);
            const currentPaid = currentLead?.associate_advance_payment || 0;
            const newPaid = currentPaid + Number(associateSettleData.amount);

            const res = await fetch('/api/admin/settle-associate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    new_advance_payment: newPaid,
                    remarks: associateSettleData.remarks || currentLead?.associate_remarks
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to settle associate');

            setShowAssociateSettle(false);
            setAssociateSettleData({ amount: '', remarks: '' });
            fetchWorkspace();
        } catch (err: any) {
            console.error('Error settling associate:', err);
            alert(`Failed to settle associate: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

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
                        <Gavel size={28} className="text-[var(--accent-gold)]" />
                        Workspace
                    </h2>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Active court cases — approved and in progress.
                    </p>
                </div>
                <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-[rgba(139,92,246,0.12)] text-[#a78bfa] border border-[rgba(139,92,246,0.3)]">
                    {leads.length} Active Cases
                </span>
            </header>

            {loading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="animate-spin text-[var(--accent-gold)]" size={36} />
                </div>
            ) : leads.length === 0 ? (
                <div className="glass-card rounded-2xl p-16 text-center">
                    <Gavel size={48} className="text-[var(--text-secondary)] mx-auto mb-4 opacity-40" />
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No Active Cases</h3>
                    <p className="text-[var(--text-secondary)]">Approved cases will appear here once you confirm them from Approval Pending.</p>
                </div>
            ) : (
                <div className="glass-card rounded-2xl overflow-hidden">
                    {/* Table Header */}
                    <div className="grid items-center gap-4 px-6 py-3 bg-[rgba(0,0,0,0.3)] border-b border-[var(--border-color)]" style={{ gridTemplateColumns: '1fr 110px 130px 130px 180px' }}>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest">Client</span>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest">Mode</span>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest">Lawyer</span>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest">Associate</span>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest text-right">Actions</span>
                    </div>

                    {leads.map((lead) => {
                        const lawyer = (lead.profiles as any)?.full_name || '—';
                        const associate = (lead.associate_profile as any)?.full_name || '—';
                        const totalFee = lead.payments?.[0]?.total_payment || 0;
                        const totalAdvance = lead.payments?.reduce((sum: number, p: any) => sum + Number(p.advance_payment || 0), 0) || 0;
                        const balanceDue = Math.max(0, totalFee - totalAdvance);
                        const isOpen = expandedRow === lead.id;

                        return (
                            <React.Fragment key={lead.id}>
                                {/* Row */}
                                <div
                                    className={`grid items-center gap-4 px-6 py-4 border-b border-[var(--border-color)] cursor-pointer transition-colors ${isOpen ? 'bg-[rgba(212,175,55,0.04)]' : 'hover:bg-[rgba(255,255,255,0.02)]'}`}
                                    style={{ gridTemplateColumns: '1fr 110px 130px 130px 180px' }}
                                    onClick={() => {
                                        setExpandedRow(isOpen ? null : lead.id);
                                        setShowQuickCollect(false);
                                        setShowAssociateSettle(false);
                                    }}
                                >
                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)]">{lead.client_name}</p>
                                        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
                                            <Phone size={11} /> {lead.phone_number}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border whitespace-nowrap ${caseColor(lead.case_mode)}`}>
                                        {lead.case_mode || 'General'}
                                    </span>
                                    <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">{lawyer}</span>
                                    <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">{associate}</span>
                                    <div className="flex items-center gap-2 justify-end">
                                        <button
                                            className="h-8 px-3 text-xs font-bold whitespace-nowrap rounded-lg bg-[rgba(139,92,246,0.1)] text-[#a78bfa] border border-[rgba(139,92,246,0.35)] hover:bg-[rgba(139,92,246,0.2)] transition-all flex items-center gap-1.5"
                                            onClick={(e) => { e.stopPropagation(); setChatLead(lead); }}
                                        >
                                            <MessageSquare size={12} /> Chat
                                        </button>
                                        <button
                                            className="h-8 px-3 text-xs font-bold whitespace-nowrap rounded-lg bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] border border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.2)] transition-all flex items-center gap-1.5"
                                            onClick={(e) => { e.stopPropagation(); setExpandedRow(isOpen ? null : lead.id); setShowQuickCollect(false); setShowAssociateSettle(false); }}
                                        >
                                            <FileText size={12} /> {isOpen ? 'Close' : 'View'}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Panel */}
                                {isOpen && (
                                    <div className="bg-[rgba(0,0,0,0.15)] border-b-2 border-[var(--accent-gold)] px-6 py-8 animate-fade-in">
                                        {/* Tab Navigation */}
                                        <div className="flex items-center gap-8 mb-8 border-b border-[rgba(255,255,255,0.05)] pb-0 overflow-x-auto no-scrollbar">
                                            {[
                                                { id: 'activity', label: 'Case Activity', icon: Clock },
                                                { id: 'court', label: 'Court Progress', icon: Gavel },
                                                { id: 'finance', label: 'Financials', icon: CreditCard },
                                            ].map(tab => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id as any)}
                                                    className={`pb-4 px-1 flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === tab.id ? 'text-[var(--accent-gold)] border-[var(--accent-gold)] opacity-100' : 'text-[var(--text-secondary)] border-transparent opacity-60 hover:opacity-100 hover:text-white'}`}
                                                >
                                                    <tab.icon size={14} /> {tab.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Tab Content */}
                                        <div className="animate-in fade-in duration-500">
                                            {activeTab === 'activity' && (
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                    {/* Summary & History */}
                                                    <div className="space-y-6">
                                                        <div>
                                                            <h4 className="text-[10px] uppercase font-bold text-[var(--accent-gold)] tracking-widest mb-3 flex items-center gap-2">
                                                                <FileText size={12} /> Case Summary
                                                            </h4>
                                                            <div className="p-5 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-sm leading-relaxed text-[var(--text-secondary)]">
                                                                {lead.case_summary || 'No summary provided.'}
                                                            </div>
                                                        </div>
                                                        {lead.associate_remarks && (
                                                            <div>
                                                                <h4 className="text-[10px] uppercase font-bold text-[var(--accent-gold)] tracking-widest mb-2">Admin Remarks</h4>
                                                                <div className="p-4 rounded-xl bg-[rgba(212,175,55,0.03)] border border-[rgba(212,175,55,0.1)] text-xs italic text-[var(--accent-gold)]">
                                                                    "{lead.associate_remarks}"
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest mb-3 flex justify-between items-center">
                                                            <span className="flex items-center gap-2"><Clock size={12} /> Interaction History</span>
                                                            <span className="text-[9px] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full font-normal tracking-normal normal-case">
                                                                {lead.followups?.length || 0} records
                                                            </span>
                                                        </h4>
                                                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {(!lead.followups || lead.followups.length === 0) ? (
                                                                <div className="text-center py-10 rounded-2xl border border-dashed border-[var(--border-color)]">
                                                                    <p className="text-xs text-[var(--text-secondary)] italic">No interactions recorded yet.</p>
                                                                </div>
                                                            ) : (
                                                                [...lead.followups]
                                                                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                                    .map((f: any) => (
                                                                        <div key={f.id} className="p-4 rounded-xl bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                                                                            <div className="flex justify-between items-center mb-1.5">
                                                                                <span className="text-[10px] font-bold text-[var(--accent-gold)] uppercase tracking-wider">{f.status_at_time}</span>
                                                                                <span className="text-[9px] text-[var(--text-secondary)] opacity-50">{new Date(f.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                                            </div>
                                                                            <p className="text-xs text-[var(--text-secondary)]">{f.summary_text || 'Status updated.'}</p>
                                                                        </div>
                                                                    ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'court' && (
                                                <div className="p-8 rounded-3xl bg-[rgba(139,92,246,0.02)] border border-[rgba(139,92,246,0.1)]">
                                                    <CaseProgressView
                                                        leadId={lead.id}
                                                        userId={currentUser?.id || ''}
                                                        readOnly={false}
                                                    />
                                                </div>
                                            )}

                                            {activeTab === 'finance' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {/* Client Payment Card */}
                                                    <div className="glass-panel p-6 rounded-2xl border-[rgba(212,175,55,0.2)]">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <h4 className="text-[10px] uppercase font-bold text-[var(--accent-gold)] tracking-widest flex items-center gap-2">
                                                                <CreditCard size={14} /> Client Payment Status
                                                            </h4>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${balanceDue === 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                                {balanceDue === 0 ? 'Paid' : 'Unpaid'}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                                            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                                                                <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mb-1">Total Fee</p>
                                                                <p className="text-sm font-bold text-[var(--text-primary)]">₹{Number(totalFee).toLocaleString('en-IN')}</p>
                                                            </div>
                                                            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                                                                <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mb-1">Total Paid</p>
                                                                <p className="text-sm font-bold text-[var(--success-green)]">₹{Number(totalAdvance).toLocaleString('en-IN')}</p>
                                                            </div>
                                                            <div className="text-center p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                                                <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mb-1">Balance</p>
                                                                <p className="text-sm font-bold text-[var(--danger-red)]">₹{Number(balanceDue).toLocaleString('en-IN')}</p>
                                                            </div>
                                                        </div>

                                                        <div className="pt-6 border-t border-white/5">
                                                            {!showQuickCollect ? (
                                                                <button
                                                                    onClick={() => setShowQuickCollect(true)}
                                                                    className="w-full py-3 rounded-xl bg-[var(--accent-gold)] text-black hover:opacity-90 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                                                >
                                                                    <Plus size={14} /> Record Payment
                                                                </button>
                                                            ) : (
                                                                <form onSubmit={(e) => handleCollectPayment(e, lead.id)} className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] font-bold text-[var(--accent-gold)] uppercase tracking-widest">Collect Payment</span>
                                                                        <button onClick={() => setShowQuickCollect(false)} type="button" className="text-[10px] text-[var(--text-secondary)] hover:text-white">Cancel</button>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <input type="number" className="input-glass text-xs py-3 h-11" placeholder="Amount" value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })} required />
                                                                        <input type="text" className="input-glass text-xs py-3 h-11" placeholder="Reference ID" value={paymentData.payment_id} onChange={e => setPaymentData({ ...paymentData, payment_id: e.target.value })} />
                                                                    </div>
                                                                    <input type="text" className="input-glass text-xs py-3 h-11 w-full" placeholder="Remarks (e.g. Cash / UPI / Bank Transfer)" value={paymentData.remarks} onChange={e => setPaymentData({ ...paymentData, remarks: e.target.value })} />
                                                                    <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[var(--accent-gold)] text-black rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                                                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                                        {isSubmitting ? 'Recording...' : 'Confirm Payment'}
                                                                    </button>
                                                                </form>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Associate Settlement Card */}
                                                    <div className="glass-panel p-6 rounded-2xl border-[rgba(139,92,246,0.2)]">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <h4 className="text-[10px] uppercase font-bold text-[#a78bfa] tracking-widest flex items-center gap-2">
                                                                <Briefcase size={14} /> Associate Settlement
                                                            </h4>
                                                            <span className="text-[10px] text-[#a78bfa] font-bold opacity-60">{associate}</span>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                                            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                                                                <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mb-1">Agreed Fee</p>
                                                                <p className="text-sm font-bold text-[var(--text-primary)]">₹{Number(lead.associate_payment || 0).toLocaleString('en-IN')}</p>
                                                            </div>
                                                            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                                                                <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mb-1">Paid Already</p>
                                                                <p className="text-sm font-bold text-[var(--success-green)]">₹{Number(lead.associate_advance_payment || 0).toLocaleString('en-IN')}</p>
                                                            </div>
                                                            <div className="text-center p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                                                <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mb-1">Outstanding</p>
                                                                <p className="text-sm font-bold text-[var(--danger-red)]">₹{(Number(lead.associate_payment || 0) - Number(lead.associate_advance_payment || 0)).toLocaleString('en-IN')}</p>
                                                            </div>
                                                        </div>

                                                        <div className="pt-6 border-t border-white/5">
                                                            {!showAssociateSettle ? (
                                                                <button
                                                                    onClick={() => setShowAssociateSettle(true)}
                                                                    className="w-full py-3 rounded-xl bg-[rgba(139,92,246,0.1)] text-[#a78bfa] border border-[rgba(139,92,246,0.3)] hover:bg-[rgba(139,92,246,0.2)] transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                                                >
                                                                    <Briefcase size={14} /> Settle Associate
                                                                </button>
                                                            ) : (
                                                                <form onSubmit={(e) => handleSettleAssociate(e, lead.id)} className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-widest">Settle Associate</span>
                                                                        <button onClick={() => setShowAssociateSettle(false)} type="button" className="text-[10px] text-[var(--text-secondary)] hover:text-white">Cancel</button>
                                                                    </div>
                                                                    <input type="number" className="input-glass text-xs py-3 h-11 w-full" placeholder="Amount to Pay" value={associateSettleData.amount} onChange={e => setAssociateSettleData({ ...associateSettleData, amount: e.target.value })} required />
                                                                    <input type="text" className="input-glass text-xs py-3 h-11 w-full" placeholder="Settlement Remarks" value={associateSettleData.remarks} onChange={e => setAssociateSettleData({ ...associateSettleData, remarks: e.target.value })} />
                                                                    <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#8b5cf6] text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                                                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                                        {isSubmitting ? 'Processing...' : 'Confirm Settlement'}
                                                                    </button>
                                                                </form>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}

            {/* Chat Popup */}
            {chatLead && currentUser && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                        <div className="glass-card w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col" style={{ height: '520px' }}>
                            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.3)] shrink-0">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <MessageSquare size={16} className="text-[var(--accent-gold)]" />
                                        <h3 className="text-base font-bold text-[var(--text-primary)]">Chat — {chatLead.client_name}</h3>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 ml-6">Internal chat with associate</p>
                                </div>
                                <button onClick={() => setChatLead(null)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
                                    <X size={20} className="text-[var(--text-secondary)]" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <ChatPanel
                                    leadId={chatLead.id}
                                    currentUserId={currentUser.id}
                                    currentUserName={currentUser.name}
                                />
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}

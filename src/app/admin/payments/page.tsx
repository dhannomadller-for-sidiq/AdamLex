'use client';

import React, { useEffect, useState } from 'react';
import {
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    Search,
    Filter,
    Calendar,
    User,
    FileText,
    ChevronRight,
    Loader2,
    TrendingUp,
    X,
    Phone,
    Briefcase,
    Plus,
    Check,
    Clock,
    Gavel,
    AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ModalPortal from '@/components/ModalPortal';

export default function AdminPaymentsPage() {
    const [clientPayments, setClientPayments] = useState<any[]>([]);
    const [leadsList, setLeadsList] = useState<any[]>([]); // For payment collection dropdown
    const [associateSettlements, setAssociateSettlements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'client' | 'associate'>('client');
    const [searchQuery, setSearchQuery] = useState('');

    const [showCollectModal, setShowCollectModal] = useState(false);
    const [showQuickCollect, setShowQuickCollect] = useState(false);
    const [showAssociateSettle, setShowAssociateSettle] = useState(false);
    const [viewingLead, setViewingLead] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [paymentData, setPaymentData] = useState({
        lead_id: '',
        amount: '',
        payment_id: '',
        remarks: ''
    });

    const [associateSettleData, setAssociateSettleData] = useState({
        amount: '',
        remarks: ''
    });

    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalAssociateSettlement: 0,
        netBalance: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Client Payments (all individual transactions)
            const { data: payments, error: pError } = await supabase
                .from('payments')
                .select(`
                    *,
                    leads(
                        id, 
                        client_name, 
                        case_mode, 
                        case_summary, 
                        updated_at, 
                        created_at, 
                        phone_number,
                        assigned_to,
                        associate_id,
                        profiles!assigned_to(full_name),
                        associate_profile:profiles!associate_id(full_name),
                        associate_payment,
                        associate_advance_payment,
                        associate_remarks
                    )
                `)
                .order('created_at', { ascending: false });

            if (pError) throw pError;

            // 2. Fetch All Leads for payments table
            const { data: leads, error: lError } = await supabase
                .from('leads')
                .select(`
                    id,
                    client_name,
                    case_mode,
                    case_summary,
                    created_at,
                    updated_at,
                    phone_number,
                    assigned_to,
                    associate_id,
                    status,
                    admin_approved,
                    is_confirmed,
                    associate_payment,
                    associate_advance_payment,
                    associate_remarks,
                    profiles!assigned_to(full_name),
                    associate_profile:profiles!associate_id(full_name),
                    payments(total_payment, advance_payment)
                `)
                .order('updated_at', { ascending: false });

            if (lError) throw lError;

            // 3. Fetch Associate Settlements
            const { data: settlements, error: sError } = await supabase
                .from('leads')
                .select(`
                    id,
                    client_name,
                    associate_payment,
                    associate_advance_payment,
                    associate_id,
                    updated_at,
                    associate_profile:profiles!associate_id(full_name)
                `)
                .not('associate_id', 'is', null)
                .order('updated_at', { ascending: false });

            if (sError) throw sError;

            // Process Leads for Collection and Due Amounts
            const processedLeads = (leads || []).map(lead => {
                // Find highest total_payment out of all payments, avoiding 0 overrides
                const maxFee = lead.payments?.reduce((max: number, p: any) => Math.max(max, Number(p.total_payment || 0)), 0) || 0;
                const totalPaid = lead.payments?.reduce((sum: number, p: any) => sum + (Number(p.advance_payment) || 0), 0) || 0;
                return {
                    ...lead,
                    total_fee: maxFee,
                    total_paid: totalPaid,
                    due_amount: Math.max(0, maxFee - totalPaid)
                };
            });

            setLeadsList(processedLeads);
            setClientPayments(payments || []);
            setAssociateSettlements(settlements || []);

            // Calculate Stats
            const revenue = (payments || []).reduce((acc: number, p: any) => acc + (Number(p.advance_payment) || 0), 0);
            const settlement = (settlements || []).reduce((acc: number, s: any) => acc + (Number(s.associate_payment) || 0), 0);

            setStats({
                totalRevenue: revenue,
                totalAssociateSettlement: settlement,
                netBalance: revenue - settlement
            });

        } catch (error: any) {
            console.error('Error fetching payment data:', {
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                code: error?.code,
                full: error
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCollectPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentData.lead_id || !paymentData.amount) return;
        setIsSubmitting(true);

        try {
            const lead = leadsList.find(l => l.id === paymentData.lead_id);
            const totalFee = lead?.total_fee || 0;

            const res = await fetch('/api/admin/record-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: paymentData.lead_id,
                    total_payment: totalFee,
                    advance_payment: paymentData.amount,
                    payment_id: paymentData.payment_id,
                    remarks: paymentData.remarks
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to record payment');

            setShowCollectModal(false);
            setPaymentData({ lead_id: '', amount: '', payment_id: '', remarks: '' });
            fetchData();
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
            const currentLead = leadsList.find(l => l.id === leadId) || viewingLead;
            const currentPaid = Number(currentLead?.associate_advance_payment || 0);
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
            fetchData();

            // Re-fetch the viewing lead to update the UI immediately
            const { data: updatedLead } = await supabase.from('leads').select('*').eq('id', leadId).single();
            if (updatedLead) {
                setViewingLead((prev: any) => ({ ...prev, associate_advance_payment: updatedLead.associate_advance_payment, associate_remarks: updatedLead.associate_remarks }));

                // Update leadsList instantly to reflect in UI without waiting for full refresh
                setLeadsList(prev => prev.map(l => l.id === leadId ? { ...l, associate_advance_payment: updatedLead.associate_advance_payment, associate_remarks: updatedLead.associate_remarks } : l));
            }

        } catch (err: any) {
            console.error('Error settling associate:', err);
            alert(`Failed to settle associate: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredClientPayments = clientPayments.filter(p =>
        p.leads?.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.payment_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredLeads = leadsList.filter(l => {
        const q = searchQuery.toLowerCase();
        const matchesClient = l.client_name?.toLowerCase().includes(q);
        const matchesMode = l.case_mode?.toLowerCase().includes(q);
        const matchesTxn = clientPayments.some(p => p.lead_id === l.id && p.payment_id?.toLowerCase().includes(q));
        return matchesClient || matchesMode || matchesTxn;
    });

    const filteredAssociateSettlements = associateSettlements.filter(s =>
        s.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.associate_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="w-10 h-10 text-[var(--accent-gold)] animate-spin" />
                <p className="text-[var(--text-secondary)] animate-pulse">Loading financial data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gold-gradient-text tracking-tight">Financial Overview</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Track revenue, associate settlements, and net margins.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCollectModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-gold)] text-black font-bold hover:opacity-90 transition-all shadow-lg shadow-[rgba(212,175,55,0.2)]"
                    >
                        <Plus size={18} />
                        Collect Payment
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
                    >
                        <Calendar size={20} />
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                        <input
                            type="text"
                            placeholder="Search payments..."
                            className="input-glass pl-10 w-full md:w-64"
                            style={{ paddingLeft: '2.5rem' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Total Revenue Collected"
                    value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
                    icon={<TrendingUp className="text-[var(--success-green)]" />}
                    trend="+12% from last month"
                    color="var(--success-green)"
                />
                <StatCard
                    label="Associate Settlements"
                    value={`₹${stats.totalAssociateSettlement.toLocaleString('en-IN')}`}
                    icon={<ArrowDownRight className="text-[var(--danger-red)]" />}
                    trend="Active commitments"
                    color="var(--danger-red)"
                />
                <StatCard
                    label="Net Margin"
                    value={`₹${stats.netBalance.toLocaleString('en-IN')}`}
                    icon={<Wallet className="text-[var(--accent-gold)]" />}
                    trend="Profit after settlements"
                    color="var(--accent-gold)"
                />
            </div>

            {/* Tabs & Table */}
            <div className="glass-panel rounded-2xl border border-[var(--border-color)] overflow-hidden">
                <div className="flex border-b border-[var(--border-color)]">
                    <button
                        onClick={() => setActiveTab('client')}
                        className={`flex-1 py-4 text-sm font-semibold transition-all ${activeTab === 'client' ? 'text-[var(--accent-gold)] bg-[var(--accent-glow)] border-b-2 border-[var(--accent-gold)]' : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.02)]'}`}
                    >
                        Client Payments
                    </button>
                    <button
                        onClick={() => setActiveTab('associate')}
                        className={`flex-1 py-4 text-sm font-semibold transition-all ${activeTab === 'associate' ? 'text-[var(--accent-gold)] bg-[var(--accent-glow)] border-b-2 border-[var(--accent-gold)]' : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.02)]'}`}
                    >
                        Associate Settlements
                    </button>
                </div>

                <div className="overflow-x-auto">
                    {activeTab === 'client' ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[rgba(0,0,0,0.2)]">
                                    <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Client / Lead</th>
                                    <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-right">Total Fee</th>
                                    <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-right">Total Paid</th>
                                    <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-right">Due Amount</th>
                                    <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-center">Status</th>
                                    <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-center">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {filteredLeads.map((lead) => (
                                    <tr
                                        key={lead.id}
                                        className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group"
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[rgba(212,175,55,0.1)] flex items-center justify-center text-[var(--accent-gold)] text-xs font-bold">
                                                    {lead.client_name?.substring(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <button
                                                        onClick={() => { setViewingLead(lead); setShowQuickCollect(false); setShowAssociateSettle(false); }}
                                                        className="font-semibold text-[var(--accent-gold)] hover:underline text-left"
                                                    >
                                                        {lead.client_name}
                                                    </button>
                                                    <p className="text-[10px] text-[var(--text-secondary)]">{lead.case_mode || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-[var(--text-secondary)] text-right font-medium">₹{Number(lead.total_fee || 0).toLocaleString('en-IN')}</td>
                                        <td className="p-4 text-right">
                                            <span className="text-[var(--success-green)] font-bold">₹{Number(lead.total_paid || 0).toLocaleString('en-IN')}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${lead.due_amount > 0 ? 'bg-[rgba(239,68,68,0.1)] text-red-400' : 'bg-[rgba(34,197,94,0.1)] text-green-400'}`}>
                                                ₹{Number(lead.due_amount || 0).toLocaleString('en-IN')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border ${lead.due_amount <= 0 && lead.total_fee > 0 ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                                {lead.due_amount <= 0 && lead.total_fee > 0 ? 'Fully Paid' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => { setViewingLead(lead); setShowQuickCollect(false); setShowAssociateSettle(false); }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] text-[var(--accent-gold)] text-[10px] font-bold uppercase tracking-wider hover:bg-[rgba(212,175,55,0.2)] transition-all"
                                            >
                                                <CreditCard size={11} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-[var(--text-secondary)] italic">No clients found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[rgba(0,0,0,0.2)]">
                                    <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Lead / Client</th>
                                    <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Assigned Associate</th>
                                    <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total Settlement</th>
                                    <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Advance Paid</th>
                                    <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Pending</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {filteredAssociateSettlements.map((s) => (
                                    <tr key={s.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                                        <td className="p-4">
                                            <p className="font-medium text-[var(--text-primary)]">{s.client_name}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-[var(--accent-gold)]" />
                                                <span className="text-sm font-medium">{s.associate_profile?.full_name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-[var(--text-primary)]">₹{Number(s.associate_payment || 0).toLocaleString('en-IN')}</td>
                                        <td className="p-4 text-[var(--success-green)] font-semibold text-sm">₹{Number(s.associate_advance_payment || 0).toLocaleString('en-IN')}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-md bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] text-[10px] font-bold">
                                                ₹{(Number(s.associate_payment || 0) - Number(s.associate_advance_payment || 0)).toLocaleString('en-IN')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredAssociateSettlements.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-[var(--text-secondary)] italic">No associate settlements found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* MODALS */}

            {/* 1. Collect Payment Modal */}
            {showCollectModal && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                        onClick={() => setShowCollectModal(false)}
                    >
                        <div className="modal-glass p-8 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold gold-gradient-text uppercase tracking-widest">New Payment</h3>
                                <button onClick={() => setShowCollectModal(false)} className="text-[var(--text-secondary)] hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleCollectPayment} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--accent-gold)] uppercase mb-2 tracking-widest">Select Client Lead</label>
                                    <select
                                        className="input-glass w-full"
                                        value={paymentData.lead_id}
                                        onChange={(e) => setPaymentData({ ...paymentData, lead_id: e.target.value })}
                                        required
                                    >
                                        <option value="" className="bg-[#0b0b0b]">-- Choose a Lead --</option>
                                        {leadsList.map(l => (
                                            <option key={l.id} value={l.id} className="bg-[#0b0b0b]">
                                                {l.client_name} ({l.case_mode}) - Due: ₹{l.due_amount.toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--accent-gold)] uppercase mb-2 tracking-widest">Payment Amount (INR)</label>
                                    <input
                                        type="number"
                                        className="input-glass w-full"
                                        placeholder="Amount in ₹"
                                        value={paymentData.amount}
                                        onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--accent-gold)] uppercase mb-2 tracking-widest">Payment ID / Reference</label>
                                    <input
                                        type="text"
                                        className="input-glass w-full"
                                        placeholder="e.g. TXN987654"
                                        value={paymentData.payment_id}
                                        onChange={(e) => setPaymentData({ ...paymentData, payment_id: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--accent-gold)] uppercase mb-2 tracking-widest">Remarks</label>
                                    <textarea
                                        className="input-glass w-full min-h-[80px]"
                                        placeholder="Details about this installment..."
                                        value={paymentData.remarks}
                                        onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full btn-gold-shimmer py-3 flex items-center justify-center gap-2 font-bold"
                                >
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                                    {isSubmitting ? 'Recording...' : 'Record Payment'}
                                </button>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* 2. Viewing Lead Details Modal */}
            {!!viewingLead && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                        onClick={() => { setViewingLead(null); setShowQuickCollect(false); setShowAssociateSettle(false); }}
                    >
                        <div
                            className="w-full max-w-2xl bg-[#0b0b0b] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl shadow-black/60 flex flex-col"
                            style={{ maxHeight: '90vh' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-[var(--border-color)] bg-gradient-to-r from-[rgba(212,175,55,0.08)] to-transparent flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-black border border-[var(--accent-gold)] flex items-center justify-center text-[var(--accent-gold)]">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[var(--text-primary)]">{viewingLead?.client_name}</h3>
                                        <p className="text-[10px] text-[var(--accent-gold)] font-bold tracking-widest uppercase">{viewingLead?.case_mode}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setViewingLead(null); setShowQuickCollect(false); setShowAssociateSettle(false); }}
                                    className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body - scrollable */}
                            <div className="overflow-y-auto flex-1 p-5 space-y-5">

                                {/* 2-col info block */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Case info */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
                                            <Briefcase size={12} /> Case Info
                                        </h4>
                                        <p className="text-sm text-[var(--text-primary)] leading-relaxed italic border-l-2 border-[var(--accent-gold)] pl-3">
                                            "{viewingLead?.case_summary || 'No summary available.'}"
                                        </p>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-0.5">Lawyer</p>
                                                <p className="font-medium">{viewingLead?.profiles?.full_name || 'System'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-0.5">Associate</p>
                                                <p className="font-medium text-[var(--accent-gold)]">{viewingLead?.associate_profile?.full_name || 'None'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment summary */}
                                    {(() => {
                                        const summary = leadsList.find(l => l.id === viewingLead?.id);
                                        if (!summary) return null;
                                        return (
                                            <div className="p-4 rounded-xl bg-black border border-[var(--accent-gold)] border-dashed space-y-2">
                                                <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5 mb-3">
                                                    <CreditCard size={12} /> Payment Summary
                                                </h4>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--text-secondary)]">Total Fee</span>
                                                    <span className="font-bold">₹{Number(summary.total_fee).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--text-secondary)]">Total Paid</span>
                                                    <span className="font-bold text-[var(--success-green)]">₹{Number(summary.total_paid).toLocaleString()}</span>
                                                </div>
                                                <div className="h-px bg-[var(--border-color)] my-1" />
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--accent-gold)] font-bold">Remaining Due</span>
                                                    <span className="font-bold text-[var(--danger-red)]">₹{Number(summary.due_amount).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Transaction History */}
                                <div>
                                    <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5 mb-3">
                                        <CreditCard size={12} /> Payment Transactions
                                    </h4>
                                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                        {clientPayments.filter(p => p.lead_id === viewingLead?.id).length === 0 ? (
                                            <div className="text-center py-6 text-[var(--text-secondary)] text-sm italic">No transactions recorded yet.</div>
                                        ) : (
                                            clientPayments
                                                .filter(p => p.lead_id === viewingLead?.id)
                                                .map((p) => (
                                                    <div key={p.id} className="p-3 rounded-lg border border-[var(--border-color)] flex justify-between items-start" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                        <div>
                                                            <p className="text-sm font-bold text-[var(--success-green)]">₹{Number(p.advance_payment || 0).toLocaleString()}</p>
                                                            <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">{p.payment_id || 'NO ID'}</p>
                                                            {p.remarks && <p className="text-[10px] text-[var(--text-secondary)] italic mt-0.5">"{p.remarks}"</p>}
                                                        </div>
                                                        <span className="text-[10px] text-[var(--text-secondary)] shrink-0 ml-4">{new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>

                                {/* Action: Record Client Payment */}
                                <div className="border-t border-[var(--border-color)] pt-4">
                                    {!showQuickCollect ? (
                                        <button
                                            onClick={() => { setPaymentData({ ...paymentData, lead_id: viewingLead.id }); setShowQuickCollect(true); setShowAssociateSettle(false); }}
                                            className="w-full py-3 bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] text-[var(--accent-gold)] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[rgba(212,175,55,0.2)] transition-all"
                                        >
                                            <CreditCard size={18} /> Record Client Payment
                                        </button>
                                    ) : (
                                        <div className="p-4 rounded-xl border border-[var(--accent-gold)] bg-[rgba(212,175,55,0.05)] space-y-3">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-sm font-bold gold-gradient-text uppercase tracking-widest">Client Payment</h4>
                                                <button onClick={() => setShowQuickCollect(false)} className="text-xs text-[var(--text-secondary)] hover:text-white">Cancel</button>
                                            </div>
                                            <form onSubmit={async (e) => { await handleCollectPayment(e); setShowQuickCollect(false); }} className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-[var(--accent-gold)] uppercase mb-1 tracking-widest">Amount</label>
                                                        <input type="number" className="input-glass w-full h-10" placeholder="₹ Amount" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} required />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-[var(--accent-gold)] uppercase mb-1 tracking-widest">Payment ID</label>
                                                        <input type="text" className="input-glass w-full h-10" placeholder="Ref ID" value={paymentData.payment_id} onChange={(e) => setPaymentData({ ...paymentData, payment_id: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-[var(--accent-gold)] uppercase mb-1 tracking-widest">Remarks</label>
                                                    <input type="text" className="input-glass w-full h-10" placeholder="Note..." value={paymentData.remarks} onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })} />
                                                </div>
                                                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[var(--accent-gold)] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                                    {isSubmitting ? 'Recording...' : 'Record Payment'}
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>

                                {/* Action: Settle Associate */}
                                {viewingLead?.associate_id && (
                                    <div className="border-t border-[var(--border-color)] pt-4">
                                        {(() => {
                                            const assFee = Number(viewingLead?.associate_payment || 0);
                                            const assPaid = Number(leadsList.find(l => l.id === viewingLead?.id)?.associate_advance_payment || 0);
                                            const assDue = Math.max(0, assFee - assPaid);
                                            return (
                                                <div className="flex justify-between items-center text-xs mb-3">
                                                    <span className="text-[10px] uppercase font-bold text-[#a78bfa] tracking-widest">Assoc. Net Due:</span>
                                                    <span className="font-bold text-[var(--danger-red)]">₹{assDue.toLocaleString()}</span>
                                                </div>
                                            );
                                        })()}
                                        {!showAssociateSettle ? (
                                            <button
                                                onClick={() => { setShowAssociateSettle(true); setShowQuickCollect(false); }}
                                                className="w-full py-3 bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.3)] text-[#a78bfa] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[rgba(139,92,246,0.2)] transition-all"
                                            >
                                                <Briefcase size={18} /> Settle Associate
                                            </button>
                                        ) : (
                                            <div className="p-4 rounded-xl border border-[#a78bfa] bg-[rgba(139,92,246,0.05)] space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-sm font-bold text-[#a78bfa] uppercase tracking-widest">Associate Settlement</h4>
                                                    <button onClick={() => setShowAssociateSettle(false)} className="text-xs text-[var(--text-secondary)] hover:text-white">Cancel</button>
                                                </div>
                                                <form onSubmit={(e) => handleSettleAssociate(e, viewingLead?.id)} className="space-y-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-[#a78bfa] uppercase mb-1 tracking-widest">Amount to Pay (INR)</label>
                                                        <input type="number" className="input-glass w-full h-10" placeholder="₹ Amount" value={associateSettleData.amount} onChange={(e) => setAssociateSettleData({ ...associateSettleData, amount: e.target.value })} required />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-[#a78bfa] uppercase mb-1 tracking-widest">Remarks</label>
                                                        <input type="text" className="input-glass w-full h-10" placeholder="Mode/Txn ID..." value={associateSettleData.remarks} onChange={(e) => setAssociateSettleData({ ...associateSettleData, remarks: e.target.value })} />
                                                    </div>
                                                    <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#8b5cf6] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                                        {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

        </div>
    );
}

function StatCard({ label, value, icon, trend, color }: { label: string, value: string, icon: React.ReactNode, trend: string, color: string }) {
    return (
        <div className="glass-panel p-6 rounded-2xl border border-[var(--border-color)] relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[var(--border-color)]">
                    {icon}
                </div>
                <div className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight size={20} />
                </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-1 font-medium">{label}</p>
            <h3 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{value}</h3>
            <p className="text-[10px] mt-3 font-semibold uppercase tracking-wider opacity-60" style={{ color }}>{trend}</p>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent-gold)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}

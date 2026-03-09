'use client';

import { useEffect, useState } from 'react';
import { Users, Search, Plus, PhoneCall, CheckCircle, Clock, X, Briefcase, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminLeadsPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmingLead, setConfirmingLead] = useState<any | null>(null);
    const [viewingLead, setViewingLead] = useState<any | null>(null);
    const [newLead, setNewLead] = useState({ client_name: '', phone_number: '', case_mode: '', assigned_to: '' });
    const [addingLead, setAddingLead] = useState(false);
    const [lawyersList, setLawyersList] = useState<any[]>([]);
    const [associatesList, setAssociatesList] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Confirmation Form State
    const [confirmData, setConfirmData] = useState({
        associate_id: '',
        total_payment: '',
        advance_payment: '',
        remarks: ''
    });

    const fetchInitialData = async () => {
        setLoading(true);
        console.log('AdminLeadsPage: Fetching initial data...');
        // Fetch lawyers and associates
        const { data: lawyers, error: lErr } = await supabase.from('profiles').select('id, full_name, phone_number').eq('role', 'lawyer');
        console.log('AdminLeadsPage: Lawyers:', lawyers?.length, lErr);

        const { data: assocProfiles, error: aErr } = await supabase
            .from('profiles')
            .select('id, full_name, phone_number, associates(specialization)')
            .eq('role', 'associate');
        console.log('AdminLeadsPage: Associates:', assocProfiles?.length, aErr);

        if (lawyers) setLawyersList(lawyers);
        if (assocProfiles) {
            setAssociatesList(assocProfiles.map((p: any) => ({
                ...p,
                specialization: p.associates?.[0]?.specialization
            })));
        }

        // Fetch leads
        console.log('AdminLeadsPage: Fetching leads...');
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
                profiles!assigned_to(id, full_name, role),
                followups(id, status_at_time, summary_text, created_at, profiles(full_name))
            `)
            .order('updated_at', { ascending: false });

        console.log('AdminLeadsPage: Leads Query Result:', data?.length, error);

        if (data) setLeads(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingLead(true);
        try {
            const payload = {
                client_name: newLead.client_name,
                phone_number: newLead.phone_number,
                case_mode: newLead.case_mode,
                status: 'New'
            } as any;

            if (newLead.assigned_to) {
                payload.assigned_to = newLead.assigned_to;
            }

            const { error } = await supabase.from('leads').insert([payload]);
            if (error) throw error;

            await fetchInitialData();
            setIsAddModalOpen(false);
            setNewLead({ client_name: '', phone_number: '', case_mode: '', assigned_to: '' });
        } catch (err) {
            console.error('Failed to add lead', err);
            alert('Failed to add lead. Please try again.');
        } finally {
            setAddingLead(false);
        }
    };

    const handleConfirmLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmingLead) return;
        setIsSubmitting(true);

        try {
            const { error } = await supabase.from('leads').update({
                status: 'Confirmed',
                associate_id: confirmData.associate_id || null,
                associate_payment: Number(confirmData.total_payment) || 0,
                associate_advance_payment: Number(confirmData.advance_payment) || 0,
                associate_remarks: confirmData.remarks,
                is_confirmed: true,
                updated_at: new Date().toISOString()
            }).eq('id', confirmingLead.id);

            if (error) throw error;

            // WhatsApp Share with Associate
            if (confirmData.associate_id) {
                const associate = associatesList.find(a => a.id === confirmData.associate_id);
                if (associate && associate.phone_number) {
                    const message = `*NEW CASE ASSIGNED*\n\nClient: ${confirmingLead.client_name}\nPhone: ${confirmingLead.phone_number}\nCase: ${confirmingLead.case_mode || 'N/A'}\n\nRemarks: ${confirmData.remarks || 'Proceed with case.'}`;
                    const waLink = `https://wa.me/${associate.phone_number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
                    window.open(waLink, '_blank');
                }
            }

            setIsConfirmModalOpen(false);
            setConfirmingLead(null);
            setConfirmData({ associate_id: '', total_payment: '', advance_payment: '', remarks: '' });
            await fetchInitialData();
        } catch (err) {
            console.error('Failed to confirm lead', err);
            alert('Failed to confirm. Please check connection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] relative inline-block">
                            Global Leads Management
                            <div className="absolute -bottom-2 left-0 w-1/3 h-1 bg-gradient-to-r from-[var(--accent-gold)] to-transparent rounded-full"></div>
                        </h2>
                        <p className="text-[var(--text-secondary)] mt-3">View and manually allocate leads to your lawyer team.</p>
                    </div>

                    <button onClick={() => setIsAddModalOpen(true)} className="btn-primary flex items-center gap-2">
                        <Plus size={18} />
                        New Lead
                    </button>
                </header>

                {/* Control Bar */}
                <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between stagger-1">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                        <input
                            type="text"
                            placeholder="Search by client name, case, or ID..."
                            className="input-glass pl-10 py-2 w-full"
                        />
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <select className="input-glass py-2 appearance-none">
                            <option value="all">All Statuses</option>
                            <option value="new">New</option>
                            <option value="followup">Needs Follow-up</option>
                        </select>
                        <select className="input-glass py-2 appearance-none">
                            <option value="all">Any Lawyer</option>
                            {lawyersList.map((lawyer) => (
                                <option key={lawyer.id} value={lawyer.id}>{lawyer.full_name}</option>
                            ))}
                        </select>
                        <button className="btn-secondary whitespace-nowrap">Auto-Allocate Pending</button>
                    </div>
                </div >

                {/* Leads Data Table */}
                < div className="glass-card rounded-xl overflow-hidden stagger-2" >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-[rgba(0,0,0,0.3)] text-[var(--text-secondary)] text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                                    <th className="p-5 font-semibold">Client Detail</th>
                                    <th className="p-5 font-semibold">Case Type</th>
                                    <th className="p-5 font-semibold">Assigned Lawyer</th>
                                    <th className="p-5 font-semibold">Status</th>
                                    <th className="p-5 font-semibold">Last Interaction</th>
                                    <th className="p-5 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-[var(--accent-gold)] animate-pulse">Loading leads...</td></tr>
                                ) : leads.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-[var(--text-secondary)]">No leads found.</td></tr>
                                ) : (
                                    leads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                                            <td className="p-5">
                                                <p className="font-semibold text-[var(--text-primary)]">{lead.client_name}</p>
                                                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1 mt-1">
                                                    <PhoneCall size={12} /> {lead.phone_number}
                                                </p>
                                            </td>
                                            <td className="p-5 text-sm text-[var(--text-secondary)]">
                                                <span className="px-2 py-1 rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
                                                    {lead.case_mode || 'Unspecified'}
                                                </span>
                                            </td>
                                            <td className="p-5">
                                                {lead.profiles?.full_name ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-[var(--accent-glow)] flex items-center justify-center text-[10px] text-[var(--accent-gold)] border border-[rgba(212,175,55,0.3)]">
                                                            {lead.profiles.full_name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-medium">{lead.profiles.full_name}</span>
                                                    </div>
                                                ) : (
                                                    <button className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] border border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.2)] transition-colors">
                                                        Assign Manually
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-5">
                                                <StatusBadge status={lead.status} />
                                            </td>
                                            <td className="p-5 text-sm text-[var(--text-secondary)]">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="opacity-70" />
                                                    {new Date(lead.updated_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex items-center justify-end gap-4">
                                                    <button
                                                        onClick={() => setViewingLead(lead)}
                                                        className="text-sm text-[var(--accent-gold)] hover:underline font-medium"
                                                    >
                                                        Full File
                                                    </button>
                                                    {lead.status === 'Confirmed' && !lead.is_confirmed && (
                                                        <button
                                                            onClick={() => {
                                                                setConfirmingLead(lead);
                                                                setIsConfirmModalOpen(true);
                                                            }}
                                                            className="px-3 py-1 text-xs font-bold bg-[rgba(16,185,129,0.1)] text-[var(--success-green)] border border-[rgba(16,185,129,0.3)] rounded hover:bg-[rgba(16,185,129,0.2)]"
                                                        >
                                                            Confirm
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )))}
                            </tbody>
                        </table>
                    </div>
                </div >
            </div>

            {/* Add New Lead Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
                        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Add New Lead (Admin)</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
                                <X size={20} className="text-[var(--text-secondary)]" />
                            </button>
                        </div>
                        <form onSubmit={handleAddLead}>
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Client Name *</label>
                                    <input
                                        type="text"
                                        required
                                        className="input-glass w-full"
                                        placeholder="e.g. John Doe"
                                        value={newLead.client_name}
                                        onChange={(e) => setNewLead({ ...newLead, client_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Phone Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        className="input-glass w-full"
                                        placeholder="e.g. +91 98765 43210"
                                        value={newLead.phone_number}
                                        onChange={(e) => setNewLead({ ...newLead, phone_number: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Case Type / Mode</label>
                                    <input
                                        type="text"
                                        className="input-glass w-full"
                                        placeholder="e.g. Civil Dispute"
                                        value={newLead.case_mode}
                                        onChange={(e) => setNewLead({ ...newLead, case_mode: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Assign Lawyer Automatically?</label>
                                    <select
                                        className="input-glass w-full appearance-none"
                                        value={newLead.assigned_to}
                                        onChange={(e) => setNewLead({ ...newLead, assigned_to: e.target.value })}
                                    >
                                        <option value="">Leave unassigned (Pool)</option>
                                        {lawyersList.map(l => (
                                            <option key={l.id} value={l.id}>{l.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="p-5 border-t border-[var(--border-color)] bg-[rgba(0,0,0,0.2)] flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-secondary" disabled={addingLead}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={addingLead}>
                                    {addingLead ? "Adding..." : "Confirm & Add"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
                        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <CheckCircle className="text-[var(--success-green)]" size={20} />
                                Confirm Lead Settlement
                            </h3>
                            <button onClick={() => setIsConfirmModalOpen(false)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
                                <X size={20} className="text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmLead} className="p-6 space-y-5">
                            <div className="p-4 rounded-xl bg-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.1)]">
                                <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase font-bold tracking-wider">Client Being Confirmed</p>
                                <p className="text-lg font-bold text-[var(--text-primary)]">{confirmingLead?.client_name}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Assign to Associate</label>
                                <select
                                    className="input-glass w-full appearance-none"
                                    value={confirmData.associate_id}
                                    onChange={e => setConfirmData({ ...confirmData, associate_id: e.target.value })}
                                >
                                    <option value="">Select Associate (Optional)</option>
                                    {associatesList.map(a => (
                                        <option key={a.id} value={a.id}>{a.full_name} ({a.specialization || 'General'})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Associate Total Fee (₹)</label>
                                    <input type="number" className="input-glass w-full" placeholder="e.g. 10000"
                                        value={confirmData.total_payment} onChange={e => setConfirmData({ ...confirmData, total_payment: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Advance Paid (₹)</label>
                                    <input type="number" className="input-glass w-full text-[var(--success-green)]" placeholder="e.g. 5000"
                                        value={confirmData.advance_payment} onChange={e => setConfirmData({ ...confirmData, advance_payment: e.target.value })} />
                                </div>
                            </div>

                            {confirmData.total_payment && confirmData.advance_payment && (
                                <div className="flex justify-between items-center text-xs px-2">
                                    <span className="text-[var(--text-secondary)] uppercase font-bold">Balance Due to Associate:</span>
                                    <span className="text-[var(--danger-red)] font-black text-sm">₹{(Number(confirmData.total_payment) - Number(confirmData.advance_payment)).toLocaleString()}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Internal Remarks</label>
                                <textarea
                                    className="input-glass w-full min-h-[80px] text-sm"
                                    placeholder="Any specific instructions for the associate..."
                                    value={confirmData.remarks}
                                    onChange={e => setConfirmData({ ...confirmData, remarks: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="pt-4 flex items-center gap-3">
                                <button type="button" onClick={() => setIsConfirmModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                    {isSubmitting ? 'Confirming...' : 'Confirm & Share'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Lead Modal */}
            {viewingLead && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
                        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Lead Details</h3>
                            <button onClick={() => setViewingLead(null)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
                                <X size={20} className="text-[var(--text-secondary)]" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Client Name</h4>
                                    <p className="text-[var(--text-primary)] font-medium text-lg">{viewingLead.client_name}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Phone Number</h4>
                                    <p className="text-[var(--text-primary)] flex items-center gap-2">
                                        <PhoneCall size={14} className="text-[var(--accent-gold)]" />
                                        {viewingLead.phone_number}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Case Type</h4>
                                    <p className="text-[var(--text-primary)]">{viewingLead.case_mode || 'Unspecified'}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Current Status</h4>
                                    <StatusBadge status={viewingLead.status} />
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Assigned Lawyer</h4>
                                    <p className="text-[var(--text-primary)]">{viewingLead.profiles?.full_name || 'Unassigned'}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Last Updated</h4>
                                    <p className="text-[var(--text-primary)] flex items-center gap-2">
                                        <Clock size={14} className="text-[var(--accent-gold)]" />
                                        {new Date(viewingLead.updated_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-[var(--border-color)]">
                                <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-3 flex justify-between items-center">
                                    <span>Interaction History</span>
                                    <span className="text-[10px] bg-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded-full">{viewingLead.followups?.length || 0} Records</span>
                                </h4>

                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {(!viewingLead.followups || viewingLead.followups.length === 0) ? (
                                        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-sm leading-relaxed whitespace-pre-wrap text-center">
                                            <span className="text-[var(--text-secondary)] italic">No historical interactions recorded yet.</span>
                                        </div>
                                    ) : (
                                        [...(viewingLead.followups || [])]
                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                            .map((followup: any) => (
                                                <div key={followup.id} className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-[var(--accent-glow)] flex items-center justify-center text-[10px] text-[var(--accent-gold)] border border-[rgba(212,175,55,0.3)]">
                                                                {(followup.profiles?.full_name || 'U').substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <span className="text-xs font-medium text-[var(--text-primary)]">
                                                                {followup.profiles?.full_name || 'System / Unknown'}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] text-[var(--text-secondary)]">
                                                                {new Date(followup.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-[var(--accent-gold)] mt-0.5 uppercase">
                                                                {followup.status_at_time}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {followup.summary_text ? (
                                                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                                                            {followup.summary_text}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm text-[rgba(255,255,255,0.3)] italic mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                                                            Status updated. No summary provided.
                                                        </p>
                                                    )}
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-[var(--border-color)] bg-[rgba(0,0,0,0.2)] flex justify-end">
                            <button onClick={() => setViewingLead(null)} className="btn-primary">
                                Close File
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function StatusBadge({ status }: { status: string }) {
    let colorClass = '';
    switch (status) {
        case 'New': colorClass = 'bg-[rgba(59,130,246,0.1)] text-blue-400 border-blue-500/20'; break;
        case 'Details Collected': colorClass = 'bg-[rgba(245,158,11,0.1)] text-amber-400 border-amber-500/20'; break;
        case 'Documents Pending': colorClass = 'bg-[rgba(217,70,239,0.1)] text-fuchsia-400 border-fuchsia-500/20'; break;
        case 'Confirmed': colorClass = 'bg-[rgba(16,185,129,0.1)] text-[var(--success-green)] border-[rgba(16,185,129,0.2)]'; break;
        default: colorClass = 'bg-gray-800 text-gray-400 border-gray-700';
    }

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass} whitespace-nowrap`}>
            {status}
        </span>
    );
}

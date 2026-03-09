'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Briefcase, Clock, Phone, AlertCircle, CheckCircle2, IndianRupee, FileText, X, MessageSquare } from 'lucide-react';
import ChatPanel from '@/components/ChatPanel';
import ModalPortal from '@/components/ModalPortal';

export default function AssociateDashboard() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, due: 0, pending: 0 });
    const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
    const [chatLead, setChatLead] = useState<any | null>(null);

    // Case Details Modal State
    const [viewingLead, setViewingLead] = useState<any | null>(null);
    const [followups, setFollowups] = useState<any[]>([]);
    const [loadingFollowups, setLoadingFollowups] = useState(false);

    useEffect(() => {
        async function fetchMyLeads() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .eq('id', user.id)
                .single();

            if (!profile) { setLoading(false); return; }

            setCurrentUser({ id: profile.id, name: profile.full_name });

            const { data } = await supabase
                .from('leads')
                .select(`
                    id,
                    client_name,
                    phone_number,
                    case_mode,
                    case_summary,
                    status,
                    updated_at,
                    associate_payment,
                    associate_advance_payment,
                    associate_remarks
                `)
                .eq('associate_id', profile.id)
                .order('updated_at', { ascending: false });

            if (data) {
                setLeads(data);
                let totalFee = 0, totalPaid = 0, activeCount = 0;
                data.forEach(l => {
                    totalFee += (l.associate_payment || 0);
                    totalPaid += (l.associate_advance_payment || 0);
                    if (l.status !== 'Closed') activeCount++;
                });
                setStats({ total: totalFee, due: totalFee - totalPaid, pending: activeCount });
            }
            setLoading(false);
        }
        fetchMyLeads();
    }, []);

    const openCaseDetails = async (lead: any) => {
        setViewingLead(lead);
        setLoadingFollowups(true);

        const { data } = await supabase
            .from('followups')
            .select('id, summary_text, status_at_time, created_at, profiles(full_name)')
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: false });

        setFollowups(data || []);
        setLoadingFollowups(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-gold)]"></div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8 animate-fade-in">
                <header>
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Associate Portal</h2>
                    <p className="text-[var(--text-secondary)] mt-1">Manage your assigned cases and track settlements.</p>
                </header>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 rounded-2xl border-l-4 border-[var(--accent-gold)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total Earnings</p>
                                <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1">₹{stats.total.toLocaleString()}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)]"><IndianRupee size={24} /></div>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-2xl border-l-4 border-[var(--danger-red)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Payment Due</p>
                                <h3 className="text-2xl font-black text-[var(--danger-red)] mt-1">₹{stats.due.toLocaleString()}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-[rgba(239,68,68,0.1)] text-[var(--danger-red)]"><AlertCircle size={24} /></div>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-2xl border-l-4 border-[var(--success-green)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Active Cases</p>
                                <h3 className="text-2xl font-black text-[var(--success-green)] mt-1">{stats.pending}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-[rgba(16,185,129,0.1)] text-[var(--success-green)]"><Briefcase size={24} /></div>
                        </div>
                    </div>
                </div>

                {/* Leads List */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <FileText size={20} className="text-[var(--accent-gold)]" />
                        Assigned Cases
                    </h3>

                    {leads.length === 0 ? (
                        <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-[var(--border-color)]">
                            <Briefcase size={48} className="mx-auto text-[var(--text-secondary)] opacity-20 mb-4" />
                            <p className="text-[var(--text-secondary)] font-medium">No cases assigned yet. Check back soon!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {leads.map((lead) => (
                                <div key={lead.id} className="glass-card p-6 rounded-2xl border border-[var(--border-color)] hover:border-[var(--accent-gold)] transition-all group">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold text-[var(--text-primary)]">{lead.client_name}</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] font-bold uppercase tracking-wider border border-[rgba(212,175,55,0.2)]">
                                                    {lead.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                                                <span className="flex items-center gap-1.5"><Phone size={14} className="text-[var(--accent-gold)]" /> {lead.phone_number}</span>
                                                <span className="flex items-center gap-1.5"><Clock size={14} /> Updated {new Date(lead.updated_at).toLocaleDateString()}</span>
                                                <span className="bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded border border-[rgba(255,255,255,0.1)]">
                                                    {lead.case_mode || 'Court Case'}
                                                </span>
                                            </div>
                                            {lead.associate_remarks && (
                                                <p className="text-sm text-[var(--text-secondary)] italic border-l-2 border-[var(--accent-gold)] pl-3 py-1">
                                                    &ldquo;{lead.associate_remarks}&rdquo;
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <div className="text-right sm:border-r border-[var(--border-color)] pr-4">
                                                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-tighter">Your Settlement</p>
                                                <p className="text-xl font-black text-[var(--text-primary)]">₹{Number(lead.associate_payment || 0).toLocaleString()}</p>
                                                <p className="text-xs text-[var(--success-green)] font-medium">₹{Number(lead.associate_advance_payment || 0).toLocaleString()} (Paid)</p>
                                            </div>

                                            <div className="text-center sm:text-left">
                                                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-tighter">Balance Due</p>
                                                <p className={`text-xl font-black ${Number(lead.associate_payment) - Number(lead.associate_advance_payment) > 0 ? 'text-[var(--danger-red)]' : 'text-[var(--success-green)]'}`}>
                                                    ₹{(Number(lead.associate_payment || 0) - Number(lead.associate_advance_payment || 0)).toLocaleString()}
                                                </p>
                                                {(Number(lead.associate_payment) - Number(lead.associate_advance_payment) === 0) && (
                                                    <span className="flex items-center gap-1 text-[10px] text-[var(--success-green)] font-bold uppercase"><CheckCircle2 size={10} /> Fully Settled</span>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => openCaseDetails(lead)}
                                                className="btn-secondary ml-4 px-6 h-10 text-xs font-bold uppercase tracking-widest whitespace-nowrap flex items-center gap-2"
                                            >
                                                <FileText size={14} />
                                                Case Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Case Details Modal */}
            {viewingLead && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="glass-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)] flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)] shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{viewingLead.client_name}</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{viewingLead.case_mode || 'Case'} · {viewingLead.status}</p>
                                </div>
                                <button onClick={() => setViewingLead(null)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
                                    <X size={20} className="text-[var(--text-secondary)]" />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-6 space-y-6">
                                {/* Case Summary */}
                                <div>
                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-2">Case Summary</h4>
                                    <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                                        {viewingLead.case_summary || 'No summary provided.'}
                                    </div>
                                </div>

                                {/* Associate Remarks from Admin */}
                                {viewingLead.associate_remarks && (
                                    <div>
                                        <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-2">Instructions from Admin</h4>
                                        <p className="text-sm italic text-[var(--accent-gold)] border-l-2 border-[var(--accent-gold)] pl-3 py-1">
                                            &ldquo;{viewingLead.associate_remarks}&rdquo;
                                        </p>
                                    </div>
                                )}

                                {/* Your Settlement Details */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-center">
                                        <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Total Fee</p>
                                        <p className="text-lg font-black text-[var(--text-primary)]">₹{Number(viewingLead.associate_payment || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.1)] text-center">
                                        <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Advance Paid</p>
                                        <p className="text-lg font-black text-[var(--success-green)]">₹{Number(viewingLead.associate_advance_payment || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.1)] text-center">
                                        <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Balance Due</p>
                                        <p className="text-lg font-black text-[var(--danger-red)]">₹{(Number(viewingLead.associate_payment || 0) - Number(viewingLead.associate_advance_payment || 0)).toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Followup History */}
                                <div>
                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-3 flex items-center justify-between">
                                        <span className="flex items-center gap-2"><MessageSquare size={14} /> Case Interaction History</span>
                                        <span className="text-[10px] bg-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded-full">{followups.length} Records</span>
                                    </h4>

                                    {loadingFollowups ? (
                                        <div className="flex justify-center py-6">
                                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-[var(--accent-gold)]"></div>
                                        </div>
                                    ) : followups.length === 0 ? (
                                        <p className="text-sm text-[var(--text-secondary)] italic text-center py-4">No interaction history recorded yet.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {followups.map((f: any) => (
                                                <div key={f.id} className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-[var(--accent-gold)] uppercase tracking-wider">{f.status_at_time}</span>
                                                        <span className="text-[10px] text-[var(--text-secondary)]">
                                                            {new Date(f.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-[var(--text-secondary)]">{f.summary_text || 'Status updated.'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-5 border-t border-[var(--border-color)] bg-[rgba(0,0,0,0.2)] shrink-0 flex justify-between items-center gap-3">
                                <button
                                    onClick={() => { setChatLead(viewingLead); }}
                                    className="btn-secondary flex items-center gap-2 px-5"
                                >
                                    <MessageSquare size={15} /> Chat with Admin
                                </button>
                                <button onClick={() => setViewingLead(null)} className="btn-primary px-8">Close</button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Chat Popup Modal */}
            {chatLead && currentUser && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                        <div className="glass-card w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col" style={{ height: '520px' }}>
                            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.3)] shrink-0">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <MessageSquare size={16} className="text-[var(--accent-gold)]" />
                                        <h3 className="text-base font-bold text-[var(--text-primary)]">Chat &mdash; {chatLead.client_name}</h3>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 ml-6">Chat with your admin about this case</p>
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
        </>
    );
}

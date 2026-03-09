'use client';

import { useEffect, useState, Suspense } from 'react';
import { Phone, MessageCircle, Calendar, Plus, X, Search, CheckCircle, MessageSquare, Briefcase, Gavel, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import ChatPanel from '@/components/ChatPanel';
import ModalPortal from '@/components/ModalPortal';
import CourtWorkspace from '@/components/CourtWorkspace';

function LawyerDashboardContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');

    const [activeModal, setActiveModal] = useState<number | null>(null);
    const [isMalayalam, setIsMalayalam] = useState(false);
    const [summaryText, setSummaryText] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('Details Collected');
    const [paymentData, setPaymentData] = useState({ total_payment: '', advance_payment: '', payment_id: '', remarks: '' });
    const [followUpDate, setFollowUpDate] = useState('');
    const [followUpTime, setFollowUpTime] = useState('');
    const [caseMode, setCaseMode] = useState('');
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Add Lead State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newLead, setNewLead] = useState({ client_name: '', phone_number: '', case_mode: '' });
    const [addingLead, setAddingLead] = useState(false);
    const [activeTab, setActiveTab] = useState<'Assigned' | 'Added' | 'FollowUp' | 'Confirmed' | 'Workspace'>('Assigned');
    const [viewingLeadIndex, setViewingLeadIndex] = useState<number | null>(null);
    const [chatLead, setChatLead] = useState<any | null>(null);

    useEffect(() => {
        if (tabParam && ['Assigned', 'Added', 'FollowUp', 'Confirmed', 'Workspace'].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [tabParam]);

    useEffect(() => {
        async function fetchMyLeads() {
            // 1. Get logged in user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUser(user);

            // 2. Fetch leads assigned to this user
            const { data, error } = await supabase
                .from('leads')
                .select(`
                    *, 
                    followups(id, status_at_time, summary_text, created_at, profiles(full_name)),
                    associate_profile:profiles!associate_id(full_name),
                    payments(total_payment, advance_payment, remarks)
                `)
                .eq('assigned_to', user.id)
                .order('updated_at', { ascending: false });

            if (data) setLeads(data);
            setLoading(false);
        }
        fetchMyLeads();
    }, []);

    const openActionModal = (index: number) => {
        setActiveModal(index);
        setSelectedStatus('Details Collected');
        setCaseMode(leads[index]?.case_mode || '');
        setPaymentData({ total_payment: '', advance_payment: '', payment_id: '', remarks: '' });
        setFollowUpDate('');
        setFollowUpTime('');
        setSummaryText('');
    };
    const closeModal = () => {
        setActiveModal(null);
        setSummaryText('');
        setIsMalayalam(false);
        setFollowUpDate('');
        setFollowUpTime('');
        setPaymentData({ total_payment: '', advance_payment: '', payment_id: '', remarks: '' });
    };

    const handleSaveInteraction = async () => {
        if (activeModal === null || !leads[activeModal]) return;
        setSaving(true);
        const lead = leads[activeModal];

        try {
            // 0. Prepare Next Follow-up Timestamp if provided
            let nextFollowupTimestamp = null;
            if (followUpDate) {
                const timeString = followUpTime || '09:00';
                nextFollowupTimestamp = new Date(`${followUpDate}T${timeString}`).toISOString();
            }

            // 1. Update the Lead Record
            const leadUpdatePayload: any = {
                status: selectedStatus,
                case_mode: caseMode,
                updated_at: new Date().toISOString()
            };

            // If they provided a summary, update it on the main lead as the 'latest summary'
            if (summaryText) {
                leadUpdatePayload.case_summary = summaryText;
            }
            // If they provided a follow up date, update the next_followup_date
            if (nextFollowupTimestamp) {
                leadUpdatePayload.next_followup_date = nextFollowupTimestamp;
                // Automatically adjust status if not set to confirmed
                if (selectedStatus !== 'Confirmed') {
                    leadUpdatePayload.status = 'Follow Up Scheduled';
                }
            }

            const { error: leadError } = await supabase
                .from('leads')
                .update(leadUpdatePayload)
                .eq('id', lead.id);

            if (leadError) throw leadError;

            // 2. Insert into Followups History Table
            if (summaryText || nextFollowupTimestamp) {
                const { error: followupError } = await supabase
                    .from('followups')
                    .insert([{
                        lead_id: lead.id,
                        lawyer_id: user.id,
                        status_at_time: leadUpdatePayload.status,
                        summary_text: summaryText,
                        next_followup_date: nextFollowupTimestamp
                    }]);

                if (followupError) {
                    // It might fail if they haven't run the SQL yet!
                    console.error('Failed to save to followups table. Has it been created?', followupError);
                }
            }

            // 3. If 'Confirmed', create a payment record
            if (selectedStatus === 'Confirmed' && paymentData.total_payment) {
                const { error: paymentError } = await supabase
                    .from('payments')
                    .insert([{
                        lead_id: lead.id,
                        total_payment: Number(paymentData.total_payment),
                        advance_payment: Number(paymentData.advance_payment),
                        payment_id: paymentData.payment_id,
                        remarks: paymentData.remarks
                    }]);

                if (paymentError) throw paymentError;
            }

            // Refresh leads
            const { data } = await supabase
                .from('leads')
                .select(`
                    *, 
                    followups(id, status_at_time, summary_text, created_at, profiles(full_name)),
                    associate_profile:profiles!associate_id(full_name),
                    payments(total_payment, advance_payment, remarks)
                `)
                .eq('assigned_to', user.id)
                .order('updated_at', { ascending: false });
            if (data) setLeads(data);

            closeModal();
        } catch (err) {
            console.error('Failed to save interaction', err);
            alert('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.id) return;
        setAddingLead(true);
        try {
            const { error } = await supabase.from('leads').insert([{
                client_name: newLead.client_name,
                phone_number: newLead.phone_number,
                case_mode: newLead.case_mode,
                assigned_to: user.id,
                status: 'New (Added by Lawyer)'
            }]);

            if (error) throw error;

            // Refresh leads
            const { data } = await supabase
                .from('leads')
                .select(`
                    *, 
                    followups(id, status_at_time, summary_text, created_at, profiles(full_name)),
                    associate_profile:profiles!associate_id(full_name),
                    payments(total_payment, advance_payment, remarks)
                `)
                .eq('assigned_to', user.id)
                .order('updated_at', { ascending: false });
            if (data) setLeads(data);

            setIsAddModalOpen(false);
            setNewLead({ client_name: '', phone_number: '', case_mode: '' });
        } catch (err) {
            console.error('Failed to add lead', err);
            alert('Failed to add lead. Please try again.');
        } finally {
            setAddingLead(false);
        }
    };

    const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setSummaryText(val);

        // If Malayalam mode is on and the user just typed a space, transliterate the last word
        if (isMalayalam && val.endsWith(' ')) {
            const words = val.split(' ');
            if (words.length > 1) {
                const lastWord = words[words.length - 2];
                // Only transliterate if it's english characters
                if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
                    try {
                        const res = await fetch(`https://inputtools.google.com/request?text=${lastWord}&itc=ml-t-i0-und&num=1`);
                        const data = await res.json();
                        if (data[0] === 'SUCCESS' && data[1][0][1] && data[1][0][1][0]) {
                            const malayalamWord = data[1][0][1][0];
                            const newWords = [...words];
                            newWords[newWords.length - 2] = malayalamWord;
                            setSummaryText(newWords.join(' '));
                        }
                    } catch (err) {
                        console.error('Transliteration failed', err);
                    }
                }
            }
        }
    };

    // Derived state for tabs based on user's request:
    // "assigmned lead show lead assinged from admin" (for now, assume all assigned are from admin unless status is specific, or just all non-followup/non-added if we had a flag. Since we don't have created_by, we'll treat 'New' or 'Assigned' as Assigned.)
    // "added leads shows added from lawyer pagr" (we can use a specific status 'New (Lawyer Added)' or we can just combine them for now if we can't distinguish. Actually, we can add a 'created_by' conceptually but we lack the column. Let's derive "FollowUp" as having followups or specific status. "Added" vs "Assigned": we can distinguish by checking if there's a certain flag. Wait, let's just make 'Added' a local concept or fallback. If we can't distinguish, we'll show all new in both or filter by a specific case_mode tag for now. Let's use 'added_by_lawyer' boolean. Since we can't alter DB easily right now without prompting, let's just use the `status` field: 'New (Added by Lawyer)'.

    const filteredLeads = leads.filter(lead => {
        const hasFollowups = lead.followups && lead.followups.length > 0;
        const isConfirmed = lead.status === 'Confirmed';
        const isApproved = lead.admin_approved === true;
        const isFollowUp = !isConfirmed && (hasFollowups || lead.status === 'Follow Up Scheduled' || lead.status === 'Details Collected');

        if (activeTab === 'Workspace') {
            return isConfirmed && isApproved;
        }

        if (activeTab === 'Confirmed') {
            return isConfirmed && !isApproved;
        }

        if (activeTab === 'FollowUp') {
            return isFollowUp && !isApproved;
        }

        if (activeTab === 'Added') {
            return !isConfirmed && !isFollowUp && lead.status === 'New (Added by Lawyer)' && !isApproved;
        }

        if (activeTab === 'Assigned') {
            return !isConfirmed && !isFollowUp && lead.status !== 'New (Added by Lawyer)' && !isApproved;
        }

        return true;
    });

    return (
        <div className="space-y-6 animate-fade-in relative pb-20">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">My Workspace</h2>
                    <p className="text-[var(--text-secondary)] mt-1 tracking-wide">Manage your assigned leads, additions, and follow-ups efficiently.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary flex items-center gap-2 self-start sm:self-auto py-2.5 shadow-lg shadow-[rgba(212,175,55,0.2)]">
                    <Plus size={18} />
                    <span className="font-semibold tracking-wide">Add New Lead</span>
                </button>
            </header>

            {/* Custom Tabs */}
            <div className="flex bg-[rgba(0,0,0,0.2)] p-1 rounded-xl mb-6 w-full max-w-2xl mx-auto border border-[var(--border-color)] overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('Assigned')}
                    className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === 'Assigned' ? 'bg-[rgba(212,175,55,0.15)] text-[var(--accent-gold)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Assigned Leads
                </button>
                <button
                    onClick={() => setActiveTab('Added')}
                    className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === 'Added' ? 'bg-[rgba(212,175,55,0.15)] text-[var(--accent-gold)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Added Leads
                </button>
                <button
                    onClick={() => setActiveTab('FollowUp')}
                    className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === 'FollowUp' ? 'bg-[rgba(212,175,55,0.15)] text-[var(--accent-gold)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Follow Ups
                </button>
                <button
                    onClick={() => setActiveTab('Confirmed')}
                    className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === 'Confirmed' ? 'bg-[rgba(212,175,55,0.15)] text-[var(--accent-gold)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Approval Pending
                </button>
                <button
                    onClick={() => setActiveTab('Workspace')}
                    className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === 'Workspace' ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Court Workspace
                </button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 stagger-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search my leads..."
                        className="input-glass pl-10 py-2 w-full"
                    />
                </div>
                <select className="input-glass py-2 sm:w-48 appearance-none">
                    <option>All Statuses</option>
                    <option>New Urgent</option>
                    <option>Follow Up Required</option>
                    <option>Documents Pending</option>
                </select>
            </div>

            {/* Leads Grid or Court Workspace */}
            {activeTab === 'Workspace' ? (
                <CourtWorkspace leads={filteredLeads} userId={user?.id || ''} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-2">
                    {loading ? (
                        <div className="col-span-full p-8 text-center text-[var(--accent-gold)] animate-pulse">Loading workspace...</div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="col-span-full p-12 text-center border border-dashed border-[var(--border-color)] rounded-2xl bg-[rgba(255,255,255,0.01)]">
                            <div className="w-16 h-16 bg-[rgba(255,255,255,0.03)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-color)]">
                                <CheckCircle size={24} className="text-[var(--text-secondary)]" />
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Leads Found</h3>
                            <p className="text-sm text-[var(--text-secondary)]">You don't have any leads in the '{activeTab}' category.</p>
                        </div>
                    ) : (
                        filteredLeads.map((lead, originalIndex) => {
                            // We need the true index from the original `leads` array for the modal logic to work correctly,
                            // since our modal logic uses `leads[activeModal]`.
                            const trueIndex = leads.findIndex(l => l.id === lead.id);

                            return (
                                <div
                                    key={lead.id}
                                    onClick={() => setViewingLeadIndex(trueIndex)}
                                    className={`glass-card rounded-xl p-5 relative group overflow-hidden flex flex-col h-full hover:border-[rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300 cursor-pointer ${lead.admin_approved ? 'border-[rgba(139,92,246,0.2)]' : ''}`}
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--danger-red)] opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--danger-red)]"></span>
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-semibold text-lg text-[var(--text-primary)]">{lead.client_name}</h3>
                                            <p className="text-sm font-mono text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                                                <Phone size={12} className="opacity-70" /> {lead.phone_number}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${lead.admin_approved
                                            ? 'bg-[rgba(139,92,246,0.1)] text-[#a78bfa] border-[rgba(139,92,246,0.2)]'
                                            : lead.status === 'Confirmed'
                                                ? 'bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] border-[rgba(212,175,55,0.2)]'
                                                : lead.status === 'New Urgent' || lead.status === 'New' || lead.status === 'New (Added by Lawyer)'
                                                    ? 'bg-[rgba(239,68,68,0.1)] text-[var(--danger-red)] border-[rgba(239,68,68,0.2)]'
                                                    : lead.status === 'Follow Up Scheduled'
                                                        ? 'bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] border-[rgba(212,175,55,0.2)]'
                                                        : 'bg-[rgba(59,130,246,0.1)] text-blue-400 border-blue-500/20'
                                            }`}>
                                            {lead.admin_approved ? 'Active Court Case' : lead.status === 'Confirmed' ? 'Approval Pending' : lead.status}
                                        </span>
                                    </div>

                                    <div className="bg-[rgba(0,0,0,0.2)] p-3 rounded-lg border border-[var(--border-color)] mb-6 flex-grow">
                                        <p className="text-sm text-[var(--text-secondary)] mb-2">
                                            <span className="font-semibold text-[var(--text-primary)]">Case Type:</span> {lead.case_mode || 'Unspecified'}
                                        </p>

                                        {lead.admin_approved && (
                                            <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)] space-y-2">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Briefcase size={12} className="text-[var(--accent-gold)]" />
                                                    <span className="text-[var(--text-secondary)]">Assigned Associate:</span>
                                                    <span className="font-semibold text-[var(--text-primary)]">
                                                        {(lead.associate_profile as any)?.full_name || 'None'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {lead.case_summary && !lead.admin_approved && (
                                            <p className="text-xs text-[var(--text-secondary)] italic border-l-2 border-[var(--accent-gold)] pl-2 line-clamp-3">
                                                "{lead.case_summary}"
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-auto">
                                        <a
                                            href={`tel:${lead.phone_number.replace(/\s+/g, '')}`}
                                            onClick={(e) => { e.stopPropagation(); openActionModal(trueIndex); }}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-[rgba(16,185,129,0.1)] text-[var(--success-green)] border border-[rgba(16,185,129,0.3)] rounded-lg hover:bg-[rgba(16,185,129,0.2)] transition-colors font-medium text-sm"
                                        >
                                            <Phone size={16} />
                                            Call Client
                                        </a>
                                        <a
                                            href={`https://wa.me/${lead.phone_number.replace(/[^0-9]/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => { e.stopPropagation(); openActionModal(trueIndex); }}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-[rgba(34,197,94,0.1)] text-[#25D366] border border-[rgba(34,197,94,0.3)] rounded-lg hover:bg-[rgba(34,197,94,0.2)] transition-colors font-medium text-sm"
                                        >
                                            <MessageCircle size={16} />
                                            WhatsApp
                                        </a>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        <button
                                            onClick={() => setViewingLeadIndex(trueIndex)}
                                            className="w-full py-2 text-xs text-[var(--text-primary)] border border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors font-medium"
                                        >
                                            View Full File
                                        </button>
                                        {lead.admin_approved ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setChatLead(lead); }}
                                                className="w-full py-2 text-xs bg-[rgba(139,92,246,0.1)] text-[#a78bfa] border border-[rgba(139,92,246,0.3)] rounded-lg hover:bg-[rgba(139,92,246,0.2)] transition-colors font-bold flex items-center justify-center gap-1.5"
                                            >
                                                <MessageSquare size={13} /> Open Chat
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openActionModal(trueIndex); }}
                                                className="w-full py-2 text-xs text-[var(--accent-gold)] border border-[rgba(212,175,55,0.3)] rounded-lg hover:bg-[rgba(212,175,55,0.1)] transition-colors font-medium"
                                            >
                                                Update Details
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* Post-Communication Modal */}
            {activeModal !== null && leads[activeModal] && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)] flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)]">
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Log Interaction</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Client: <span className="text-[var(--accent-gold)] font-medium">{leads[activeModal].client_name}</span></p>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
                                <X size={20} className="text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Update Status</label>
                                    <select
                                        className="input-glass w-full appearance-none"
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                    >
                                        <option value="Details Collected">Details Collected</option>
                                        <option value="Documents Pending">Documents Pending</option>
                                        <option value="Follow Up Scheduled">Follow Up Scheduled</option>
                                        <option value="Confirmed">Confirmed (Payment Received)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Case Mode</label>
                                    <input
                                        type="text"
                                        className="input-glass w-full"
                                        value={caseMode}
                                        onChange={(e) => setCaseMode(e.target.value)}
                                    />
                                </div>
                            </div>

                            {selectedStatus === 'Confirmed' && (
                                <div className="p-4 rounded-xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.2)] space-y-4 animate-fade-in">
                                    <h4 className="text-sm font-bold text-[var(--success-green)] uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <CheckCircle size={16} /> Payment Confirmation Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Payment (₹)</label>
                                            <input type="number" className="input-glass w-full" placeholder="e.g. 50000"
                                                value={paymentData.total_payment} onChange={(e) => setPaymentData({ ...paymentData, total_payment: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Advance Received (₹)</label>
                                            <input type="number" className="input-glass w-full text-[var(--success-green)] font-semibold" placeholder="e.g. 15000"
                                                value={paymentData.advance_payment} onChange={(e) => setPaymentData({ ...paymentData, advance_payment: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Payment ID / UTR No.</label>
                                            <input type="text" className="input-glass w-full font-mono text-sm" placeholder="e.g. TXN-123456"
                                                value={paymentData.payment_id} onChange={(e) => setPaymentData({ ...paymentData, payment_id: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Remarks</label>
                                            <input type="text" className="input-glass w-full" placeholder="e.g. Paid via NEFT, Balance next week"
                                                value={paymentData.remarks} onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                                <div className="flex justify-between items-end mb-1">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Case Summary</label>

                                    {/* Manglish Toggle */}
                                    <label className="flex items-center gap-2 cursor-pointer bg-[rgba(255,255,255,0.05)] px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={isMalayalam}
                                                onChange={(e) => setIsMalayalam(e.target.checked)}
                                            />
                                            <div className={`block w-8 h-4 rounded-full transition-colors ${isMalayalam ? 'bg-[var(--accent-gold)]' : 'bg-gray-600'}`}></div>
                                            <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${isMalayalam ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                        </div>
                                        <span className={`text-[10px] font-bold ${isMalayalam ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'}`}>
                                            Manglish ↔ മലയാളം (Auto)
                                        </span>
                                    </label>
                                </div>

                                <textarea
                                    className="input-glass w-full min-h-[120px] resize-none"
                                    placeholder={isMalayalam ? "Type Manglish & press space (e.g. ente veed -> എന്റെ വീട് )" : "Enter case discussion summary..."}
                                    value={summaryText}
                                    onChange={handleTextChange}
                                ></textarea>
                                {isMalayalam && <p className="text-[10px] text-[var(--accent-gold)] mt-1 animate-pulse">Live Google Transliteration active (Type a word and press Spacebar)</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-[var(--border-color)]">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                        <Calendar size={14} /> Next Follow-up Date
                                    </label>
                                    <input
                                        type="date"
                                        className="input-glass w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                                        value={followUpDate}
                                        onChange={(e) => setFollowUpDate(e.target.value)}
                                        onClick={(e) => {
                                            try { (e.target as any).showPicker(); } catch (err) { }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Time</label>
                                    <input
                                        type="time"
                                        className="input-glass w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                                        value={followUpTime}
                                        onChange={(e) => setFollowUpTime(e.target.value)}
                                        onClick={(e) => {
                                            try { (e.target as any).showPicker(); } catch (err) { }
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-[rgba(212,175,55,0.05)] p-3 rounded-lg border border-[rgba(212,175,55,0.2)]">
                                <CheckCircle size={16} className="text-[var(--accent-gold)] mt-0.5" />
                                <p className="text-xs text-[var(--text-secondary)]">
                                    You will receive a push notification reminder on your device 15 minutes prior to the scheduled follow-up time.
                                </p>
                            </div>
                        </div>

                        <div className="p-5 border-t border-[var(--border-color)] bg-[rgba(0,0,0,0.2)] flex justify-end gap-3">
                            <button onClick={closeModal} className="btn-secondary" disabled={saving}>Cancel</button>
                            <button onClick={handleSaveInteraction} className="btn-primary" disabled={saving}>
                                {saving ? "Saving..." : "Save Interaction"}
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Add New Lead Modal */}
            {
                isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="glass-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
                            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)]">
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Add New Lead</h3>
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
                )
            }

            {/* View Full File Modal */}
            {
                viewingLeadIndex !== null && leads[viewingLeadIndex] && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="glass-card w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)] flex flex-col max-h-[90vh]">
                            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)] sticky top-0 z-10 backdrop-blur-md">
                                <div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Lead File</h3>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1 tracking-wide flex items-center gap-2">
                                        <span className="text-[var(--accent-gold)] font-medium text-base">{leads[viewingLeadIndex].client_name}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border ${leads[viewingLeadIndex].status === 'Confirmed' || leads[viewingLeadIndex].is_confirmed
                                        ? 'bg-[rgba(16,185,129,0.1)] text-[var(--success-green)] border-[rgba(16,185,129,0.2)]'
                                        : leads[viewingLeadIndex].status === 'New Urgent' || leads[viewingLeadIndex].status === 'New' || leads[viewingLeadIndex].status === 'New (Added by Lawyer)'
                                            ? 'bg-[rgba(239,68,68,0.1)] text-[var(--danger-red)] border-[rgba(239,68,68,0.2)]'
                                            : leads[viewingLeadIndex].status === 'Follow Up Scheduled' || leads[viewingLeadIndex].status === 'Details Collected'
                                                ? 'bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] border-[rgba(212,175,55,0.2)]'
                                                : 'bg-[rgba(59,130,246,0.1)] text-blue-400 border-blue-500/20'
                                        }`}>
                                        {leads[viewingLeadIndex].status}
                                    </span>
                                    <button onClick={() => setViewingLeadIndex(null)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)]">
                                        <X size={20} className="text-[var(--text-secondary)]" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 pb-10">
                                {/* Detailed Information Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-4">
                                        <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)]">
                                            <p className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Contact Information</p>
                                            <div className="flex items-center gap-2 text-[var(--text-primary)] font-mono">
                                                <Phone size={14} className="text-[var(--accent-gold)]" />
                                                {leads[viewingLeadIndex].phone_number}
                                            </div>
                                        </div>
                                        <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)]">
                                            <p className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Latest Case Mode</p>
                                            <p className="text-[var(--text-primary)] font-medium">{leads[viewingLeadIndex].case_mode || 'Unspecified'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)]">
                                            <p className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Case Summary</p>
                                            <p className="text-[var(--text-primary)] text-sm leading-relaxed italic">
                                                "{leads[viewingLeadIndex].case_summary || 'No summary notes added.'}"
                                            </p>
                                        </div>
                                        <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)]">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Assigned Associate</p>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-[var(--text-primary)] font-medium">
                                                            {(leads[viewingLeadIndex].associate_profile as any)?.full_name || 'Not assigned'}
                                                        </p>
                                                        {leads[viewingLeadIndex].admin_approved && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setChatLead(leads[viewingLeadIndex]); }}
                                                                className="px-3 py-1 text-[10px] bg-[rgba(139,92,246,0.1)] text-[#a78bfa] border border-[rgba(139,92,246,0.3)] rounded-full hover:bg-[rgba(139,92,246,0.2)] transition-colors font-bold flex items-center gap-1.5"
                                                            >
                                                                <MessageSquare size={10} /> Chat
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <Briefcase size={20} className="text-[var(--accent-gold)] opacity-40" />
                                            </div>
                                        </div>
                                        {leads[viewingLeadIndex].associate_remarks && (
                                            <div className="bg-[rgba(212,175,55,0.03)] p-4 rounded-xl border border-[rgba(212,175,55,0.1)]">
                                                <p className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Admin Remarks</p>
                                                <p className="text-[var(--accent-gold)] text-sm italic font-medium">
                                                    "{leads[viewingLeadIndex].associate_remarks}"
                                                </p>
                                            </div>
                                        )}
                                        <div className="bg-[rgba(16,185,129,0.03)] p-4 rounded-xl border border-[rgba(16,185,129,0.1)]">
                                            <p className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-2 flex items-center gap-1.5">
                                                <CreditCard size={12} className="text-[var(--success-green)]" /> Client Payment Details
                                            </p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase">Total Fee</p>
                                                    <p className="text-sm font-bold text-[var(--text-primary)]">
                                                        ₹{(leads[viewingLeadIndex].payments?.[0]?.total_payment || 0).toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase">Advance Paid</p>
                                                    <p className="text-sm font-bold text-[var(--success-green)]">
                                                        ₹{(leads[viewingLeadIndex].payments?.[0]?.advance_payment || 0).toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)]">
                                                <p className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Created At</p>
                                                <p className="text-[var(--text-primary)] text-xs font-medium">
                                                    {new Date(leads[viewingLeadIndex].created_at || new Date()).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)]">
                                                <p className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-1">Last Updated</p>
                                                <p className="text-[var(--text-primary)] text-xs font-medium">
                                                    {new Date(leads[viewingLeadIndex].updated_at || new Date()).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-[var(--border-color)]">
                                    <h4 className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-3 flex justify-between items-center">
                                        <span>Interaction Timeline</span>
                                        <span className="text-[10px] bg-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded-full">{leads[viewingLeadIndex].followups?.length || 0} Events</span>
                                    </h4>

                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar relative">
                                        {(!leads[viewingLeadIndex].followups || leads[viewingLeadIndex].followups.length === 0) ? (
                                            <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-sm leading-relaxed whitespace-pre-wrap text-center">
                                                <span className="text-[var(--text-secondary)] italic">No historical interactions recorded yet.</span>
                                            </div>
                                        ) : (
                                            <div className="relative pl-3 border-l-2 border-[rgba(212,175,55,0.2)] ml-2 space-y-6 pb-2">
                                                {[...(leads[viewingLeadIndex].followups || [])]
                                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                    .map((followup: any) => (
                                                        <div key={followup.id} className="relative">
                                                            {/* Timeline Dot */}
                                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[var(--background-dark)] border-2 border-[var(--accent-gold)] z-10 shadow-[0_0_10px_rgba(212,175,55,0.5)]"></div>

                                                            <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold text-[var(--accent-gold)] uppercase tracking-wider mb-1">
                                                                            {followup.status_at_time}
                                                                        </span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs font-medium text-[var(--text-primary)]">
                                                                                {followup.profiles?.full_name || 'System'}
                                                                            </span>
                                                                            <span className="text-[10px] text-[var(--text-secondary)] bg-[rgba(255,255,255,0.05)] px-1.5 rounded-md">
                                                                                {new Date(followup.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {followup.summary_text ? (
                                                                    <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap mt-3 bg-[rgba(0,0,0,0.3)] p-3 rounded-lg border-l-2 border-[rgba(212,175,55,0.3)] font-serif leading-relaxed">
                                                                        {followup.summary_text}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-[rgba(255,255,255,0.3)] italic mt-2">
                                                                        Status updated without summary notes.
                                                                    </p>
                                                                )}
                                                                {followup.next_followup_date && (
                                                                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] px-2 py-1 rounded inline-flex">
                                                                        <Calendar size={10} className="text-blue-400" />
                                                                        <span>Scheduled for: <span className="text-blue-300 font-medium">{new Date(followup.next_followup_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Chat Popup */}
            {
                chatLead && user && (
                    <ModalPortal>
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                            <div className="glass-card w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col" style={{ height: '520px' }}>
                                <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.3)] shrink-0">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <MessageSquare size={16} className="text-[var(--accent-gold)]" />
                                            <h3 className="text-base font-bold text-[var(--text-primary)]">Workspace Chat — {chatLead.client_name}</h3>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 ml-6 italic">
                                            {chatLead.associate_id ? 'Chat with assigned Associate' : 'Chat with Administrator'}
                                        </p>
                                    </div>
                                    <button onClick={() => setChatLead(null)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
                                        <X size={20} className="text-[var(--text-secondary)]" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <ChatPanel
                                        leadId={chatLead.id}
                                        currentUserId={user.id}
                                        currentUserName={user.full_name || 'Lawyer'}
                                    />
                                </div>
                            </div>
                        </div>
                    </ModalPortal>
                )
            }
        </div >
    );
}

export default function LawyerDashboard() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-[var(--accent-gold)]">Loading dashboard...</div>}>
            <LawyerDashboardContent />
        </Suspense>
    );
}



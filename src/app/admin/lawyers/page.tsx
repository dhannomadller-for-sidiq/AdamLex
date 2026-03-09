'use client';

import { useEffect, useState } from 'react';
import { UserPlus, MoreVertical, Mail, Phone, Activity, X, Copy, Check, Edit2, Loader2, Briefcase, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminLawyersPage() {
    const [lawyers, setLawyers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        enrollment_no: '',
        designation: '',
        username: '',
        password: ''
    });

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingLawyerId, setEditingLawyerId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState({
        full_name: '',
        phone_number: '',
        enrollment_no: '',
        designation: '',
        username: '',
        password: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const fetchLawyers = async () => {
        setLoading(true);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*, lawyers(*)')
            .eq('role', 'lawyer');

        if (profiles) {
            // Flatten the nested lawyer data
            const flattenedProfiles = profiles.map((p: any) => ({
                ...p,
                ...(p.lawyers?.[0] || {})
            }));

            // Get active leads count per lawyer
            const lawyersWithStats = await Promise.all(flattenedProfiles.map(async (profile: any) => {
                const { count: activeCount } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('assigned_to', profile.id)
                    .neq('status', 'Confirmed');

                const { count: closedCount } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('assigned_to', profile.id)
                    .eq('status', 'Confirmed');

                const { count: pendingCount } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('assigned_to', profile.id)
                    .eq('status', 'Follow Up Scheduled');

                return {
                    ...profile,
                    activeLeads: activeCount || 0,
                    pendingFollowups: pendingCount || 0,
                    closedMonth: closedCount || 0
                };
            }));
            setLawyers(lawyersWithStats);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLawyers();
    }, []);

    const handleCreateLawyer = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg('');

        try {
            // We use the email field for Supabase Auth as the primary identifier, 
            // so we'll construct a mock email from the username if they only provided a username.
            // A better practice is to actually require an email, but we'll adapt to the user's request:
            const authEmail = `${formData.username.replace(/\s+/g, '').toLowerCase()}@lawfirm.local`;

            const res = await fetch('/api/admin/create-lawyer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: authEmail,
                    password: formData.password,
                    full_name: formData.full_name,
                    phone_number: formData.phone_number,
                    enrollment_no: formData.enrollment_no,
                    designation: formData.designation,
                    username: formData.username
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to create lawyer');

            // Success
            setIsAddModalOpen(false);
            setFormData({ full_name: '', phone_number: '', enrollment_no: '', designation: '', username: '', password: '' });
            fetchLawyers(); // Refresh the list

        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (lawyer: any) => {
        setEditingLawyerId(lawyer.id);
        setEditFormData({
            full_name: lawyer.full_name || '',
            phone_number: lawyer.phone_number || '',
            enrollment_no: lawyer.enrollment_no || '',
            designation: lawyer.designation || '',
            username: lawyer.username || '',
            password: '' // Optional for edit
        });
        setErrorMsg('');
        setIsEditModalOpen(true);
    };

    const handleUpdateLawyer = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetch('/api/admin/edit-lawyer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingLawyerId,
                    ...editFormData
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update lawyer');

            setIsEditModalOpen(false);
            fetchLawyers(); // Refresh the list
        } catch (err: any) {
            setErrorMsg(err.message);
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
                            Legal Team Directory
                            <div className="absolute -bottom-2 left-0 w-1/3 h-1 bg-gradient-to-r from-[var(--accent-gold)] to-transparent rounded-full"></div>
                        </h2>
                        <p className="text-[var(--text-secondary)] mt-3">Manage and monitor your team of professional lawyers.</p>
                    </div>

                    <button
                        onClick={() => {
                            setFormData({ full_name: '', phone_number: '', enrollment_no: '', designation: '', username: '', password: '' });
                            setErrorMsg('');
                            setIsAddModalOpen(true);
                        }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <UserPlus size={18} />
                        Add Lawyer
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-1">
                    {loading ? (
                        <div className="col-span-full p-8 text-center text-[var(--accent-gold)] animate-pulse">
                            <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                            Loading team roster...
                        </div>
                    ) : lawyers.length === 0 ? (
                        <div className="col-span-full p-8 text-center text-[var(--text-secondary)]">No lawyers registered yet.</div>
                    ) : lawyers.map((lawyer) => (
                        <div key={lawyer.id} className="glass-card rounded-xl p-6 relative group overflow-hidden border border-[var(--border-color)] hover:border-[rgba(212,175,55,0.3)] transition-all">
                            <button
                                onClick={() => openEditModal(lawyer)}
                                className="absolute top-4 right-4 p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:bg-[rgba(212,175,55,0.1)] rounded-full transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>

                            <div className="flex items-start gap-4 mb-6 pt-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--accent-gold)] to-[#b45309] flex items-center justify-center text-[#090c15] font-bold text-xl shadow-lg">
                                    {lawyer.full_name ? lawyer.full_name.substring(0, 2).toUpperCase() : 'LW'}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-[var(--text-primary)]">{lawyer.full_name || 'Unnamed'}</h3>
                                    <p className="text-xs text-[var(--accent-gold)] font-medium uppercase tracking-wider">{lawyer.designation || 'Senior Associate'}</p>
                                    {lawyer.enrollment_no && <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Enr: {lawyer.enrollment_no}</p>}
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                                    <Phone size={14} className="text-[var(--accent-gold)]" />
                                    <span>{lawyer.phone_number || 'No contact info'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                                    <Mail size={14} className="text-[var(--accent-gold)]" />
                                    <span>{lawyer.username}@firm.com</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-t border-[var(--border-color)] pt-4">
                                <div className="text-center">
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase">Active</p>
                                    <p className="font-bold text-[var(--text-primary)]">{lawyer.activeLeads}</p>
                                </div>
                                <div className="text-center border-x border-[var(--border-color)]">
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase">Pending</p>
                                    <p className="font-bold text-[var(--text-primary)]">{lawyer.pendingFollowups}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase">Closed</p>
                                    <p className="font-bold text-[var(--success-green)]">{lawyer.closedMonth}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
                        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Add New Lawyer</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full">
                                <X size={20} className="text-[var(--text-secondary)]" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateLawyer}>
                            <div className="p-6 space-y-4">
                                {errorMsg && (
                                    <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--danger-red)] text-sm">
                                        {errorMsg}
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Full Name *</label>
                                        <input type="text" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="input-glass w-full py-2" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Phone Number *</label>
                                        <input type="tel" required value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} className="input-glass w-full py-2" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Enrollment No.</label>
                                        <input type="text" value={formData.enrollment_no} onChange={e => setFormData({ ...formData, enrollment_no: e.target.value })} className="input-glass w-full py-2" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Designation</label>
                                        <input type="text" value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} className="input-glass w-full py-2" />
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[var(--border-color)] space-y-4">
                                    <h4 className="text-[10px] font-bold text-[var(--accent-gold)] uppercase border-b border-[var(--border-color)] pb-2 text-left">Login Credentials</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1 text-left">
                                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Username *</label>
                                            <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="input-glass w-full py-2" />
                                        </div>
                                        <div className="space-y-1 text-left">
                                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Password *</label>
                                            <input type="password" required minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="input-glass w-full py-2" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 border-t border-[var(--border-color)] bg-[rgba(0,0,0,0.2)] flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? "Creating..." : "Confirm & Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
                        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Edit2 size={20} className="text-[var(--accent-gold)]" />
                                Edit Lawyer
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full">
                                <X size={20} className="text-[var(--text-secondary)]" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateLawyer}>
                            <div className="p-6 space-y-4">
                                {errorMsg && (
                                    <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--danger-red)] text-sm">
                                        {errorMsg}
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4 text-left">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Full Name *</label>
                                        <input type="text" required value={editFormData.full_name} onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })} className="input-glass w-full py-2" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Phone Number *</label>
                                        <input type="tel" required value={editFormData.phone_number} onChange={e => setEditFormData({ ...editFormData, phone_number: e.target.value })} className="input-glass w-full py-2" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Enrollment No.</label>
                                        <input type="text" value={editFormData.enrollment_no} onChange={e => setEditFormData({ ...editFormData, enrollment_no: e.target.value })} className="input-glass w-full py-2" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Designation</label>
                                        <input type="text" value={editFormData.designation} onChange={e => setEditFormData({ ...editFormData, designation: e.target.value })} className="input-glass w-full py-2" />
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[var(--border-color)] space-y-4">
                                    <h4 className="text-[10px] font-bold text-[var(--accent-gold)] uppercase border-b border-[var(--border-color)] pb-2 flex justify-between">
                                        <span>Credentials</span>
                                        <span className="text-[8px] normal-case font-normal text-[var(--text-secondary)]">Leave password blank to keep current</span>
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-left">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Username *</label>
                                            <input type="text" required value={editFormData.username} onChange={e => setEditFormData({ ...editFormData, username: e.target.value })} className="input-glass w-full py-2" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">New Password</label>
                                            <input type="password" minLength={6} value={editFormData.password} onChange={e => setEditFormData({ ...editFormData, password: e.target.value })} className="input-glass w-full py-2" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 border-t border-[var(--border-color)] bg-[rgba(0,0,0,0.2)] flex justify-end gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

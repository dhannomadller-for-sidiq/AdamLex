'use client';

import { useEffect, useState } from 'react';
import { UserPlus, MoreVertical, Mail, Phone, Activity, X, Copy, Check, Edit2 } from 'lucide-react';
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
        const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'lawyer');

        if (profiles) {
            // Get active leads count per lawyer
            const lawyersWithStats = await Promise.all(profiles.map(async (profile: any) => {
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
        <div className="space-y-6 animate-fade-in">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] relative inline-block">
                        Lawyer Roster
                        <div className="absolute -bottom-2 left-0 w-1/3 h-1 bg-gradient-to-r from-[var(--accent-gold)] to-transparent rounded-full"></div>
                    </h2>
                    <p className="text-[var(--text-secondary)] mt-3">Manage your legal team's credentials, active leads, and performance.</p>
                </div>

                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary flex items-center gap-2">
                    <UserPlus size={18} />
                    Add Lawyer
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-1">
                {loading ? (
                    <div className="col-span-full p-8 text-center text-[var(--accent-gold)] animate-pulse">Loading roster...</div>
                ) : lawyers.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-[var(--text-secondary)]">No lawyers registered yet. Please invite them!</div>
                ) : lawyers.map((lawyer, i) => (
                    <div key={i} className="glass-card rounded-xl p-6 relative group overflow-hidden">
                        {/* Edit Button */}
                        <button
                            onClick={() => openEditModal(lawyer)}
                            className="absolute top-4 right-4 p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:bg-[rgba(212,175,55,0.1)] rounded-full transition-colors"
                            title="Edit Lawyer"
                        >
                            <Edit2 size={16} />
                        </button>

                        <div className="flex items-start gap-4 mb-6 mt-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-gold)] to-[#b45309] flex items-center justify-center text-[#090c15] font-bold text-2xl shadow-lg border border-[rgba(212,175,55,0.5)]">
                                {lawyer.full_name ? lawyer.full_name.substring(0, 2).toUpperCase() : 'LW'}
                            </div>
                            <div className="pt-1 pr-6">
                                <h3 className="font-semibold text-lg text-[var(--text-primary)]">{lawyer.full_name || 'Unnamed'}</h3>
                                <p className="text-sm text-[var(--accent-gold)] font-medium">{lawyer.designation || 'Legal Associate'}</p>
                                {lawyer.enrollment_no && <p className="text-xs text-[var(--text-secondary)] mt-0.5">Enr: {lawyer.enrollment_no}</p>}
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                                <Phone size={16} className="text-[var(--accent-gold)]" />
                                <span>{lawyer.phone_number || 'No phone added'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                                <UserPlus size={16} className="text-[var(--accent-gold)]" />
                                <span>User: {lawyer.username || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 border-t border-[var(--border-color)] pt-4">
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-secondary)] uppercase">Active</p>
                                <p className="font-semibold text-lg">{lawyer.activeLeads}</p>
                            </div>
                            <div className="text-center border-l border-[var(--border-color)]">
                                <p className="text-xs text-[var(--text-secondary)] uppercase">Pending</p>
                                <p className="font-semibold text-lg hover:text-[var(--accent-gold)]">{lawyer.pendingFollowups}</p>
                            </div>
                            <div className="text-center border-l border-[var(--border-color)]">
                                <p className="text-xs text-[var(--text-secondary)] uppercase">Closed</p>
                                <p className="font-semibold text-lg text-[var(--success-green)]">{lawyer.closedMonth}</p>
                            </div>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 h-1 bg-[var(--accent-gold)] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                    </div>
                ))}
            </div>

            {/* Add Lawyer Creation Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
                        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <UserPlus size={20} className="text-[var(--accent-gold)]" />
                                Add New Lawyer
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
                                <X size={20} className="text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateLawyer}>
                            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                                {errorMsg && (
                                    <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--danger-red)] text-sm font-medium">
                                        {errorMsg}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Full Name *</label>
                                        <input
                                            type="text" required
                                            value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            className="input-glass w-full" placeholder="e.g. Priya Rajan"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Phone Number *</label>
                                        <input
                                            type="tel" required
                                            value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                            className="input-glass w-full" placeholder="+91 98765 43210"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Enrollment No.</label>
                                        <input
                                            type="text"
                                            value={formData.enrollment_no} onChange={(e) => setFormData({ ...formData, enrollment_no: e.target.value })}
                                            className="input-glass w-full" placeholder="e.g. K/1234/2021"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Position / Designation</label>
                                        <input
                                            type="text"
                                            value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                            className="input-glass w-full" placeholder="e.g. Senior Associate"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[var(--border-color)] space-y-4">
                                    <h4 className="text-sm font-medium text-[var(--accent-gold)] border-b border-[var(--border-color)] pb-2">Login Credentials</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Username *</label>
                                            <input
                                                type="text" required
                                                value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                className="input-glass w-full" placeholder="e.g. priya.r"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Password *</label>
                                            <input
                                                type="password" required minLength={6}
                                                value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="input-glass w-full" placeholder="Minimum 6 characters"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-[var(--border-color)] bg-[rgba(0,0,0,0.2)] flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? "Creating Profile..." : "Confirm & Create Lawyer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Lawyer Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
                        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Edit2 size={20} className="text-[var(--accent-gold)]" />
                                Edit Lawyer Profile
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
                                <X size={20} className="text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateLawyer}>
                            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                                {errorMsg && (
                                    <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--danger-red)] text-sm font-medium">
                                        {errorMsg}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Full Name *</label>
                                        <input
                                            type="text" required
                                            value={editFormData.full_name} onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                            className="input-glass w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Phone Number *</label>
                                        <input
                                            type="tel" required
                                            value={editFormData.phone_number} onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                                            className="input-glass w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Enrollment No.</label>
                                        <input
                                            type="text"
                                            value={editFormData.enrollment_no} onChange={(e) => setEditFormData({ ...editFormData, enrollment_no: e.target.value })}
                                            className="input-glass w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Position / Designation</label>
                                        <input
                                            type="text"
                                            value={editFormData.designation} onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                                            className="input-glass w-full"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[var(--border-color)] space-y-4">
                                    <h4 className="text-sm font-medium text-[var(--accent-gold)] border-b border-[var(--border-color)] pb-2 flex justify-between">
                                        <span>Update Login Credentials</span>
                                        <span className="text-xs text-[var(--text-secondary)] font-normal">Leave password blank to keep current</span>
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Username *</label>
                                            <input
                                                type="text" required
                                                value={editFormData.username} onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                                className="input-glass w-full"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">New Password</label>
                                            <input
                                                type="password" minLength={6}
                                                value={editFormData.password} onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                                className="input-glass w-full" placeholder="Enter new password to change"
                                            />
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
        </div>
    );
}

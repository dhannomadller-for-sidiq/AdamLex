'use client';

import { useEffect, useState } from 'react';
import { UserPlus, X, Phone, MapPin, Award, User, MessageCircle, Edit2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminAssociatesPage() {
    const [associates, setAssociates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        location: '',
        specialization: '',
        username: '',
        password: ''
    });

    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchAssociates = async () => {
        setLoading(true);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*, associates(*)')
            .eq('role', 'associate');

        if (profiles) {
            const flattened = profiles.map((p: any) => ({
                ...p,
                ...(p.associates?.[0] || {})
            }));
            setAssociates(flattened);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAssociates();
    }, []);

    const handleCreateAssociate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const authEmail = `${formData.username.replace(/\s+/g, '').toLowerCase()}@associate.local`;

            const res = await fetch('/api/admin/create-associate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: authEmail,
                    ...formData
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create associate');

            // Success - Open WhatsApp
            const message = `Hello ${formData.full_name}, your associate account has been created.\n\nUsername: ${formData.username}\nPassword: ${formData.password}\nLogin at: ${window.location.origin}/login`;
            const waLink = `https://wa.me/${formData.phone_number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
            window.open(waLink, '_blank');

            setIsAddModalOpen(false);
            setFormData({ full_name: '', phone_number: '', location: '', specialization: '', username: '', password: '' });
            fetchAssociates();
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateAssociate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetch('/api/admin/edit-associate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingId,
                    ...formData
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update associate');

            setIsEditModalOpen(false);
            fetchAssociates();
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (assoc: any) => {
        setEditingId(assoc.id);
        setFormData({
            full_name: assoc.full_name || '',
            phone_number: assoc.phone_number || '',
            location: assoc.location || '',
            specialization: assoc.specialization || '',
            username: assoc.username || '',
            password: ''
        });
        setIsEditModalOpen(true);
    };

    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] relative inline-block">
                            Associate Roster
                            <div className="absolute -bottom-2 left-0 w-1/3 h-1 bg-gradient-to-r from-[var(--accent-gold)] to-transparent rounded-full"></div>
                        </h2>
                        <p className="text-[var(--text-secondary)] mt-3">Manage external associates and their specialization areas.</p>
                    </div>

                    <button onClick={() => setIsAddModalOpen(true)} className="btn-primary flex items-center gap-2">
                        <UserPlus size={18} />
                        Add Associate
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-1">
                    {loading ? (
                        <div className="col-span-full p-8 text-center text-[var(--accent-gold)] animate-pulse">
                            <Loader2 className="animate-spin mx-auto mb-2" />
                            Loading associates...
                        </div>
                    ) : associates.length === 0 ? (
                        <div className="col-span-full p-8 text-center text-[var(--text-secondary)]">No associates found.</div>
                    ) : associates.map((assoc, i) => (
                        <div key={assoc.id} className="glass-card rounded-xl p-6 relative group overflow-hidden border border-[var(--border-color)] hover:border-[rgba(212,175,55,0.3)] transition-all">
                            <button onClick={() => openEditModal(assoc)} className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)]">
                                <Edit2 size={16} />
                            </button>

                            <div className="flex items-start gap-4 mb-6 pt-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--accent-gold)] to-[#b45309] flex items-center justify-center text-[#090c15] font-bold text-xl">
                                    {assoc.full_name ? assoc.full_name.substring(0, 2).toUpperCase() : 'AS'}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-[var(--text-primary)]">{assoc.full_name}</h3>
                                    <p className="text-xs text-[var(--accent-gold)] font-medium uppercase tracking-wider">{assoc.specialization || 'General Associate'}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-4 text-sm">
                                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                    <Phone size={14} className="text-[var(--accent-gold)]" />
                                    <span>{assoc.phone_number}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                    <MapPin size={14} className="text-[var(--accent-gold)]" />
                                    <span>{assoc.location || 'Not Specified'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                    <User size={14} className="text-[var(--accent-gold)]" />
                                    <span>@{assoc.username}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[var(--border-color)] flex justify-between items-center text-xs">
                                <span className="text-[var(--text-secondary)]">ID: ...{assoc.id.slice(-6)}</span>
                                <button
                                    onClick={() => {
                                        const msg = `Hi ${assoc.full_name}, just checking in regarding the leads.`;
                                        window.open(`https://wa.me/${assoc.phone_number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                    }}
                                    className="flex items-center gap-1.5 text-[var(--accent-gold)] font-medium hover:underline"
                                >
                                    <MessageCircle size={14} /> WhatsApp
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal for Add/Edit Placeholder */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
                        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[rgba(0,0,0,0.2)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                {isAddModalOpen ? <UserPlus size={20} className="text-[var(--accent-gold)]" /> : <Edit2 size={20} className="text-[var(--accent-gold)]" />}
                                {isAddModalOpen ? "Add New Associate" : "Edit Associate"}
                            </h3>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
                                <X size={20} className="text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <form onSubmit={isAddModalOpen ? handleCreateAssociate : handleUpdateAssociate}>
                            <div className="p-6 space-y-4">
                                {errorMsg && (
                                    <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--danger-red)] text-sm font-medium">
                                        {errorMsg}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Name *</label>
                                        <input type="text" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="input-glass w-full py-2" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Phone *</label>
                                        <input type="tel" required value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} className="input-glass w-full py-2" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Location</label>
                                        <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="input-glass w-full py-2" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Specialization</label>
                                        <input type="text" value={formData.specialization} onChange={e => setFormData({ ...formData, specialization: e.target.value })} className="input-glass w-full py-2" placeholder="e.g. Criminal Law" />
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[var(--border-color)] space-y-4">
                                    <h4 className="text-[10px] font-bold text-[var(--accent-gold)] uppercase border-b border-[var(--border-color)] pb-2 flex justify-between">
                                        <span>Login Credentials</span>
                                        {!isAddModalOpen && <span className="text-[8px] normal-case font-normal text-[var(--text-secondary)]">Leave password blank to keep current</span>}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Username *</label>
                                            <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="input-glass w-full py-2" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{isAddModalOpen ? 'Password *' : 'New Password'}</label>
                                            <input type="password" required={isAddModalOpen} minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="input-glass w-full py-2" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-[var(--border-color)] bg-[rgba(0,0,0,0.2)] flex justify-end gap-3">
                                <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                                <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                                    {isAddModalOpen ? (isSubmitting ? "Creating..." : "Confirm & Create") : (isSubmitting ? "Saving..." : "Save Changes")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

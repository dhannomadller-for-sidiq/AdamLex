'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Scale, LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // Determine login email based on username input
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
            const loginEmail = isEmail ? identifier.toLowerCase() : `${identifier.replace(/\s+/g, '').toLowerCase()}@firm.com`;

            // Handle genuine login
            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password,
            });

            if (error) throw error;

            // Check role in profiles
            const { data: profileData } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            const userRole = profileData?.role || 'lawyer';

            if (userRole === 'admin') {
                router.push('/admin');
            } else {
                router.push('/lawyer');
            }
        } catch (err: any) {
            setMessage({ text: err.message || 'Authentication failed', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 rounded-2xl animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[var(--accent-gold)] opacity-30 rounded-tl-2xl m-2"></div>
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[var(--accent-gold)] opacity-30 rounded-br-2xl m-2"></div>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-[rgba(212,175,55,0.1)] mb-4">
                        <Scale size={40} className="text-[var(--accent-gold)]" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Adam<span className="gold-gradient-text">Lex</span></h1>
                    <p className="text-[var(--text-secondary)] text-sm uppercase tracking-widest font-semibold">Premium Legal CRM</p>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-lg text-sm text-center border ${message.type === 'error'
                        ? 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)] text-[var(--danger-red)]'
                        : 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)] text-[var(--success-green)]'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-2 stagger-1 flex flex-col pt-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider ml-1">Username or Email</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="input-glass"
                            placeholder="e.g. AdamLex or AdamLex@firm.com"
                            required
                        />
                    </div>

                    <div className="space-y-2 stagger-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-glass"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-3 stagger-3 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-t-transparent border-[var(--bg-main)] rounded-full animate-spin"></span>
                        ) : (
                            <><LogIn size={20} /> Secure Login</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

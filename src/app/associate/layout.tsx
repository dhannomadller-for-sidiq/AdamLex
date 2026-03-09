'use client';

import { LogOut, LayoutDashboard, Briefcase, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AssociateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [userProfile, setUserProfile] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        async function loadUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (data) {
                    if (data.role !== 'associate') {
                        // Redirect if not associate
                        router.push('/login');
                        return;
                    }
                    setUserProfile(data);
                }
            } else {
                router.push('/login');
            }
        }
        loadUser();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    return (
        <div className="flex flex-col min-h-screen bg-[var(--bg-main)]">
            {/* Top Navbar */}
            <nav className="glass-panel sticky top-0 z-50 px-6 py-4 border-b border-[var(--border-color)] bg-[#090c15]/90 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/associate">
                        <h1 className="text-2xl font-bold tracking-tight">
                            <span className="gold-gradient-text flex items-center gap-2">
                                <Briefcase size={24} />
                                AdamLex <span className="text-[10px] bg-[rgba(212,175,55,0.1)] px-2 py-0.5 rounded-full uppercase tracking-widest text-[var(--accent-gold)]">Associate</span>
                            </span>
                        </h1>
                    </Link>

                    <div className="flex items-center gap-6">
                        <Link href="/associate" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">
                            <LayoutDashboard size={18} />
                            <span className="font-medium text-sm hidden md:inline">My Assignments</span>
                        </Link>

                        <div className="h-6 w-px bg-[var(--border-color)] mx-2"></div>

                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                                    {userProfile?.full_name || 'Loading...'}
                                </p>
                                <p className="text-xs text-[var(--accent-gold)] leading-tight">
                                    {userProfile?.specialization || 'Associate Partner'}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1f2937] to-[#111827] border border-[rgba(212,175,55,0.4)] flex items-center justify-center text-[var(--accent-gold)] font-bold">
                                {userProfile?.full_name ? userProfile.full_name.substring(0, 2).toUpperCase() : <UserCircle size={20} />}
                            </div>
                        </div>

                        <button onClick={handleLogout} className="text-[var(--danger-red)] hover:text-red-400 p-2 rounded-full hover:bg-[rgba(239,68,68,0.1)] transition-colors">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    );
}

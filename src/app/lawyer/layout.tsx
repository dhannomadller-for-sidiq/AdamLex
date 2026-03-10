'use client';

import { LogOut, Scale, CalendarDays, ListTodo, Gavel } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import GlobalSearch from '@/components/GlobalSearch';

export default function LawyerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function loadUser() {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    router.push('/login');
                    return;
                }

                const { data, error: profileError } = await supabase.from('profiles').select('*, lawyers(designation)').eq('id', user.id).single();
                if (profileError || !data || (data.role !== 'lawyer' && data.role !== 'admin')) {
                    router.push('/login');
                    return;
                }
                setUserProfile(data);
                setIsLoading(false);
            } catch (err) {
                console.error('Error loading user:', err);
                router.push('/login');
            }
        }
        loadUser();
    }, [router]);

    // Logout function
    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    if (isLoading || !userProfile) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[rgba(212,175,55,0.2)] border-t-[var(--accent-gold)] rounded-full animate-spin"></div>
                    <p className="text-[var(--accent-gold)] font-medium tracking-widest uppercase text-sm">Verifying Access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-main)]">
            {/* Top Navbar */}
            <nav className="glass-panel sticky top-0 z-50 px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-[var(--border-color)] bg-[#090c15]/90 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
                    <Link href="/lawyer" className="shrink-0">
                        <h1 className="text-2xl font-bold tracking-tight">
                            <span className="gold-gradient-text flex items-center gap-2">
                                <Scale size={24} />
                                AdamLex
                            </span>
                        </h1>
                    </Link>

                    <div className="hidden md:flex flex-1 max-w-md">
                        <GlobalSearch />
                    </div>

                    <div className="flex items-center gap-6">
                        <Link href="/lawyer?tab=Assigned" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">
                            <ListTodo size={18} />
                            <span className="font-medium text-sm hidden md:inline">My Active Leads</span>
                        </Link>
                        <Link href="/lawyer?tab=FollowUp" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">
                            <CalendarDays size={18} />
                            <span className="font-medium text-sm hidden md:inline">Follow-up Schedule</span>
                        </Link>
                        <Link href="/lawyer?tab=Workspace" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[#a78bfa] transition-colors">
                            <Gavel size={18} />
                            <span className="font-medium text-sm hidden md:inline">Court Workspace</span>
                        </Link>

                        <div className="h-6 w-px bg-[var(--border-color)] mx-2"></div>

                        {/* Dynamic User Profile Header */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold leading-tight text-[var(--text-primary)]">
                                    {userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Juris Lawyer'}
                                </p>
                                <p className="text-xs text-[var(--accent-gold)] leading-tight">
                                    {userProfile?.designation || 'Lawyer'}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1f2937] to-[#111827] border border-[rgba(212,175,55,0.4)] flex items-center justify-center text-[var(--accent-gold)] font-bold shadow-[0_0_15px_rgba(212,175,55,0.15)] overflow-hidden">
                                {userProfile?.full_name ? userProfile.full_name.substring(0, 2).toUpperCase() : 'LW'}
                            </div>
                        </div>

                        <button onClick={handleLogout} className="text-[var(--danger-red)] hover:text-red-400 transition-colors p-2 rounded-full hover:bg-[rgba(239,68,68,0.1)]">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    );
}

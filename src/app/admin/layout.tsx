'use client';

import { Users, BarChart3, Settings, LogOut, Briefcase, FileText, Menu, X, Gavel, Clock, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [adminProfile, setAdminProfile] = useState<any>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Close menu when route changes on mobile
    const pathname = usePathname();
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        async function loadAdmin() {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    console.error('Auth check failed:', authError);
                    router.push('/login');
                    return;
                }

                const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (profileError || !data || data.role !== 'admin') {
                    console.error('Access denied: User is not an admin or profile missing');
                    router.push('/login');
                    return;
                }

                setAdminProfile(data);
                setIsLoading(false); // Only set loading to false if we successfully verified
            } catch (err) {
                console.error('Unexpected error in loadAdmin:', err);
                router.push('/login');
            }
        }
        loadAdmin();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    if (isLoading || !adminProfile) {
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
        <div className="flex h-screen overflow-hidden bg-[var(--bg-main)]">

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`w-64 glass-panel border-r border-[var(--border-color)] flex flex-col h-full z-50 transition-transform duration-300 absolute md:static ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}>
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                    <div>
                        <Link href="/admin">
                            <h1 className="text-2xl font-bold tracking-tight">
                                <span className="gold-gradient-text flex items-center gap-2">
                                    <Briefcase size={24} />
                                    JurisAdmin
                                </span>
                            </h1>
                        </Link>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 ml-8 uppercase tracking-widest">Control Panel</p>
                    </div>
                    <button
                        className="md:hidden text-[var(--text-secondary)] p-1 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    <NavItem href="/admin" icon={<BarChart3 size={20} />} label="Dashboard Overview" />
                    <NavItem href="/admin/leads" icon={<FileText size={20} />} label="All Leads" />
                    <NavItem href="/admin/confirmed" icon={<Clock size={20} />} label="Approval Pending" />
                    <NavItem href="/admin/workspace" icon={<Briefcase size={20} />} label="Active Workspace" />
                    <NavItem href="/admin/payments" icon={<CreditCard size={20} />} label="Payments" />
                    <NavItem href="/admin/lawyers" icon={<Users size={20} />} label="Lawyer Roster" />
                    <NavItem href="/admin/associates" icon={<Users size={20} />} label="Associate Roster" />
                </nav>

                <div className="p-4 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[var(--border-color)] mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-gold)] to-[#b45309] flex items-center justify-center text-[#090c15] font-bold">
                            {adminProfile?.full_name ? adminProfile.full_name.substring(0, 2).toUpperCase() : 'AD'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold truncate capitalize">{adminProfile?.full_name || adminProfile?.email?.split('@')[0] || 'Juris Admin'}</p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">{adminProfile?.email || 'System Administrator'}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="flex items-center justify-center gap-3 text-[var(--danger-red)] hover:bg-[rgba(239,68,68,0.1)] p-3 rounded-lg transition-colors w-full">
                        <LogOut size={20} />
                        <span className="font-medium text-sm">Secure Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative z-0 flex flex-col h-full w-full">
                {/* Mobile Header Toolbar */}
                <div className="md:hidden glass-panel border-b border-[var(--border-color)] p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center sticky top-0 z-30 bg-[#090c15]/90 backdrop-blur-xl">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-[var(--accent-gold)] bg-[rgba(212,175,55,0.1)] rounded-lg border border-[rgba(212,175,55,0.2)]"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="ml-4 font-bold text-lg gold-gradient-text tracking-wide">JurisAdmin</span>
                </div>

                <div className="p-4 sm:p-8 flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavItem({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    const pathname = usePathname();
    const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group relative overflow-hidden ${active
                ? 'bg-[var(--accent-glow)] text-[var(--accent-gold)] border border-[rgba(212,175,55,0.3)]'
                : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]'
                }`}
        >
            {active && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-gold)]" />
            )}
            <div className={`${active ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--accent-gold)] transition-colors'}`}>
                {icon}
            </div>
            <span className="font-medium text-sm">{label}</span>
        </Link>
    );
}

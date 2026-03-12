'use client';

import { useEffect, useState } from 'react';
import { Users, Phone, CheckCircle, Clock, TrendingUp, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({ activeLeads: 0, pendingFollowups: 0, confirmedCases: 0, totalLawyers: 0, dbSize: 'Loading...' });
    const [lawyers, setLawyers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            // 1. Fetch Global Stats
            const { count: activeCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).neq('status', 'Confirmed');
            const { count: followUpCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Follow Up Scheduled');
            const { count: confirmedCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Confirmed');

            setStats({
                activeLeads: activeCount || 0,
                pendingFollowups: followUpCount || 0,
                confirmedCases: confirmedCount || 0,
                totalLawyers: 0 // Will populate below
            });

            // 2. Fetch Lawyers and attach their stats
            const { data: profiles } = await supabase.from('profiles').select('id, full_name, role').eq('role', 'lawyer');

            if (profiles) {
                // Update total lawyers stat
                setStats(s => ({ ...s, totalLawyers: profiles.length }));

                // Run aggregation for each lawyer
                const lawyerStats = await Promise.all(profiles.map(async (lawyer) => {
                    const { count: active } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', lawyer.id).neq('status', 'Confirmed');
                    const { count: confirmed } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', lawyer.id).eq('status', 'Confirmed');

                    return {
                        id: lawyer.id,
                        name: lawyer.full_name,
                        activeLeads: active || 0,
                        confirmed: confirmed || 0,
                    };
                }));

                setLawyers(lawyerStats);
            }

            // 3. Fetch Database Storage Stat
            fetch('/api/admin/system-stats')
                .then(res => res.json())
                .then(data => {
                    if (data.size) setStats(s => ({ ...s, dbSize: data.size }));
                })
                .catch(err => console.error("Failed to fetch DB stats:", err));

            setLoading(false);
        }

        fetchDashboardData();
    }, []);

    if (loading) return <div className="p-8 text-center text-[var(--accent-gold)] mt-20 animate-pulse">Loading Live Data...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex items-end justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Dashboard Overview</h2>
                    <p className="text-[var(--text-secondary)] mt-1">Real-time metrics and lawyer performance.</p>
                </div>
                <div className="text-sm font-medium text-[var(--accent-gold)] px-4 py-2 rounded-lg bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)]">
                    Live System Active
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard
                    title="Total Active Leads"
                    value={stats.activeLeads}
                    trend="Live Count"
                    icon={<Users size={24} />}
                    delay="stagger-1"
                />
                <StatCard
                    title="Total Lawyers"
                    value={stats.totalLawyers}
                    trend="Active Roster"
                    icon={<Users size={24} />}
                    delay="stagger-2"
                />
                <StatCard
                    title="Pending Follow-ups"
                    value={stats.pendingFollowups}
                    trend="Requires attention"
                    icon={<Clock size={24} />}
                    delay="stagger-3"
                    alert={stats.pendingFollowups > 0}
                />
                <StatCard
                    title="Confirmed Cases"
                    value={stats.confirmedCases}
                    trend="All Time"
                    icon={<CheckCircle size={24} />}
                    delay="stagger-4"
                />
                <StatCard
                    title="Database Storage"
                    value={stats.dbSize}
                    trend="System Core"
                    icon={<Database size={24} />}
                    delay="stagger-5"
                />
            </div>

            {/* Lawyer Performance Table */}
            <div className="glass-card rounded-xl overflow-hidden mt-8 stagger-2">
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <TrendingUp size={20} className="text-[var(--accent-gold)]" />
                        Lawyer Performance
                    </h3>
                    <Link href="/admin/lawyers" className="text-sm text-[var(--accent-gold)] hover:underline">View Full Roster</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[rgba(0,0,0,0.2)] text-[var(--text-secondary)] text-sm uppercase tracking-wider">
                                <th className="p-4 font-medium">Lawyer Name</th>
                                <th className="p-4 font-medium">Active Leads</th>
                                <th className="p-4 font-medium">Confirmed (All Time)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {lawyers.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-sm text-[var(--text-secondary)]">No lawyers found.</td></tr>
                            ) : (
                                lawyers.map((lawyer, i) => (
                                    <tr key={lawyer.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                                        <td className="p-4 font-medium flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--accent-glow)] text-[var(--accent-gold)] flex items-center justify-center font-bold text-xs border border-[rgba(212,175,55,0.3)]">
                                                {lawyer.name ? lawyer.name.substring(0, 2).toUpperCase() : 'L'}
                                            </div>
                                            {lawyer.name || 'Unnamed Lawyer'}
                                        </td>
                                        <td className="p-4 text-[var(--text-secondary)]">{lawyer.activeLeads}</td>
                                        <td className="p-4 font-medium text-[var(--success-green)]">{lawyer.confirmed}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, trend, icon, delay, alert = false }: any) {
    return (
        <div className={`glass-card p-6 rounded-xl relative overflow-hidden group ${delay}`}>
            <div className="absolute -right-4 -top-4 text-[var(--bg-surface-elevated)] opacity-30 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                <div className="w-24 h-24">{icon}</div>
            </div>
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-[var(--text-secondary)] text-sm font-medium uppercase tracking-wider mb-2">{title}</p>
                    <p className="text-4xl font-bold mb-2 text-glow">{value}</p>
                    <p className={`text-xs font-semibold ${alert ? 'text-[var(--danger-red)]' : 'text-[var(--success-green)]'}`}>{trend}</p>
                </div>
                <div className="p-3 bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] rounded-lg border border-[rgba(212,175,55,0.2)]">
                    {icon}
                </div>
            </div>
        </div>
    );
}

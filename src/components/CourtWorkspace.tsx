'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Gavel, ChevronDown, ChevronUp,
    Calendar, AlertCircle,
    Bell, Loader2, RefreshCcw, Clock
} from 'lucide-react';
import { useCourtNotifications } from '@/hooks/useCourtNotifications';
import CaseProgressView from '@/components/CaseProgressView';

interface CourtWorkspaceProps {
    leads: any[];
    userId: string;
}

export default function CourtWorkspace({ leads, userId }: CourtWorkspaceProps) {
    const [courtCases, setCourtCases] = useState<Record<string, any>>({});
    const [hearings, setHearings] = useState<Record<string, any[]>>({});
    const [expandedCase, setExpandedCase] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const { requestPermissionAndCheck } = useCourtNotifications(userId);

    const fetchData = useCallback(async () => {
        if (!leads.length) { setLoading(false); return; }
        setLoading(true);

        const leadIds = leads.map(l => l.id);

        const [casesRes, hearingsRes] = await Promise.all([
            supabase.from('court_cases').select('*').in('lead_id', leadIds),
            supabase.from('court_hearings').select('*').in('lead_id', leadIds).order('hearing_date', { ascending: false }),
        ]);

        const casesMap: Record<string, any> = {};
        (casesRes.data || []).forEach(c => { casesMap[c.lead_id] = c; });

        const hearingsMap: Record<string, any[]> = {};
        (hearingsRes.data || []).forEach(h => {
            if (!hearingsMap[h.lead_id]) hearingsMap[h.lead_id] = [];
            hearingsMap[h.lead_id].push(h);
        });

        setCourtCases(casesMap);
        setHearings(hearingsMap);
        setLoading(false);
    }, [leads]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getNextHearing = (leadId: string) => {
        const leadHearings = hearings[leadId] || [];
        const upcoming = leadHearings.filter(h => h.next_hearing_date).sort((a, b) =>
            new Date(b.hearing_date).getTime() - new Date(a.hearing_date).getTime()
        );
        return upcoming[0]?.next_hearing_date || null;
    };

    const getHearingUrgency = (dateStr: string | null) => {
        if (!dateStr) return 'none';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const d = new Date(dateStr);
        const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
        if (diff < 0) return 'overdue';
        if (diff === 0) return 'today';
        if (diff === 1) return 'tomorrow';
        if (diff <= 3) return 'soon';
        return 'upcoming';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={28} className="animate-spin text-[var(--accent-gold)]" />
            </div>
        );
    }

    if (!leads.length) {
        return (
            <div className="p-12 text-center border border-dashed border-[var(--border-color)] rounded-2xl bg-[rgba(255,255,255,0.01)]">
                <Gavel size={36} className="mx-auto mb-4 text-[var(--text-secondary)]" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Active Court Cases</h3>
                <p className="text-sm text-[var(--text-secondary)]">Confirmed & admin-approved cases will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.3)] flex items-center justify-center">
                        <Gavel size={20} className="text-[#a78bfa]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)]">Court Workspace</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-[11px] text-[var(--text-secondary)]">{leads.length} active case{leads.length !== 1 ? 's' : ''}</p>
                            {leads.some(l => courtCases[l.id]?.last_synced_at) && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                                    <Clock size={8} />
                                    Synced: {new Date(Math.max(...leads.map(l => new Date(courtCases[l.id]?.last_synced_at || 0).getTime()))).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={requestPermissionAndCheck}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[rgba(139,92,246,0.1)] text-[#a78bfa] border border-[rgba(139,92,246,0.3)] hover:bg-[rgba(139,92,246,0.2)] transition-all"
                    >
                        <Bell size={13} /> Check Reminders
                    </button>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-white transition-all"
                    >
                        <RefreshCcw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* Next Hearing Section - Showing only Tomorrow's hearings */}
            {leads.some(l => getHearingUrgency(getNextHearing(l.id)) === 'tomorrow') && (
                <div id="next-hearings" className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Calendar size={14} className="text-[var(--accent-gold)]" />
                        <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Tomorrow's Hearings</h4>
                    </div>
                    {leads.filter(l => getHearingUrgency(getNextHearing(l.id)) === 'tomorrow').map(lead => (
                        <LeadCard
                            key={`upcoming-${lead.id}`}
                            lead={lead}
                            courtCase={courtCases[lead.id]}
                            nextHearing={getNextHearing(lead.id)}
                            urgency={getHearingUrgency(getNextHearing(lead.id))}
                            isExpanded={expandedCase === lead.id}
                            onToggle={() => setExpandedCase(expandedCase === lead.id ? null : lead.id)}
                            userId={userId}
                        />
                    ))}
                    <div className="h-4" />
                </div>
            )}

            <div className="flex items-center gap-2 px-1">
                <Gavel size={14} className="text-[var(--text-secondary)]" />
                <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">All Active Cases</h4>
            </div>

            {leads.map(lead => (
                <LeadCard
                    key={`all-${lead.id}`}
                    lead={lead}
                    courtCase={courtCases[lead.id]}
                    nextHearing={getNextHearing(lead.id)}
                    urgency={getHearingUrgency(getNextHearing(lead.id))}
                    isExpanded={expandedCase === lead.id}
                    onToggle={() => setExpandedCase(expandedCase === lead.id ? null : lead.id)}
                    userId={userId}
                />
            ))}
        </div>
    );
}

interface LeadCardProps {
    lead: any;
    courtCase: any;
    nextHearing: string | null;
    urgency: string;
    isExpanded: boolean;
    onToggle: () => void;
    userId: string;
}

function LeadCard({
    lead, courtCase, nextHearing, urgency,
    isExpanded, onToggle, userId
}: LeadCardProps) {
    const urgencyStyle = (u: string) => {
        if (u === 'overdue') return 'text-[var(--danger-red)] bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]';
        if (u === 'today') return 'text-[var(--danger-red)] bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] animate-pulse';
        if (u === 'tomorrow') return 'text-yellow-400 bg-[rgba(234,179,8,0.1)] border-[rgba(234,179,8,0.2)]';
        if (u === 'soon') return 'text-[var(--accent-gold)] bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.2)]';
        return 'text-[var(--text-secondary)] bg-[rgba(55,65,81,0.2)] border-[var(--border-color)]';
    };

    return (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[rgba(17,24,39,0.5)] overflow-hidden">
            <div
                className="p-5 flex items-center gap-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                onClick={onToggle}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-[var(--text-primary)] truncate">{lead.client_name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] border border-[rgba(212,175,55,0.2)] uppercase font-bold tracking-wider shrink-0">
                            {lead.case_mode || 'General'}
                        </span>
                    </div>
                    {courtCase ? (
                        <p className="text-xs text-[var(--text-secondary)] font-mono">
                            {courtCase.case_number ? `Case: ${courtCase.case_number}` : 'No Case Number'}
                            {courtCase.court_hall ? ` · Hall: ${courtCase.court_hall}` : ''}
                        </p>
                    ) : (
                        <p className="text-xs text-yellow-500 flex items-center gap-1"><AlertCircle size={11} /> Not registered in court yet</p>
                    )}
                </div>

                {nextHearing && (
                    <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 shrink-0 ${urgencyStyle(urgency)}`}>
                        <Calendar size={12} />
                        {urgency === 'today' ? 'TODAY' : urgency === 'tomorrow' ? 'Tomorrow' : new Date(nextHearing).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                )}

                {isExpanded ? <ChevronUp size={18} className="text-[var(--text-secondary)] shrink-0" /> : <ChevronDown size={18} className="text-[var(--text-secondary)] shrink-0" />}
            </div>

            {isExpanded && (
                <div className="border-t border-[var(--border-color)] p-6 animate-fade-in bg-[rgba(0,0,0,0.1)]">
                    <CaseProgressView leadId={lead.id} userId={userId} readOnly={false} />
                </div>
            )}
        </div>
    );
}

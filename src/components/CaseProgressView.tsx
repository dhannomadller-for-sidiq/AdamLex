'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Gavel, Plus, Check, Calendar, FileText, Clock, AlertCircle, CheckCircle2,
    Bell, Loader2, RefreshCcw, Info
} from 'lucide-react';

const COURT_STAGES = [
    'Vakalatnama Filed',
    'Case Filed in Court',
    'CNR / Case Number Allotted',
    'Notice Issued to Opposite Party',
    'Written Statement Filed',
    'Framing of Issues',
    'Evidence Stage',
    'Arguments',
    'Judgment Reserved',
    'Judgment Pronounced',
    'Case Closed / Appeal',
];

const STAGE_COLORS: Record<string, string> = {
    Done: 'bg-[rgba(16,185,129,0.15)] text-[var(--success-green)] border-[rgba(16,185,129,0.3)]',
    Pending: 'bg-[rgba(55,65,81,0.3)] text-[var(--text-secondary)] border-[var(--border-color)]',
    Adjourned: 'bg-[rgba(239,68,68,0.1)] text-[var(--danger-red)] border-[rgba(239,68,68,0.2)]',
    Skipped: 'bg-[rgba(107,114,128,0.1)] text-[var(--text-secondary)] border-[var(--border-color)]',
};

const HEARING_RESULTS = ['Adjourned', 'Order Passed', 'Partial Hearing', 'Final Hearing', 'Ex-Parte', 'Other'];

interface CaseProgressViewProps {
    leadId: string;
    userId: string;
    readOnly?: boolean;
}

export default function CaseProgressView({ leadId, userId, readOnly = false }: CaseProgressViewProps) {
    const [courtCase, setCourtCase] = useState<any>(null);
    const [stages, setStages] = useState<any[]>([]);
    const [hearings, setHearings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Forms
    const [showHearingForm, setShowHearingForm] = useState(false);
    const [showStageForm, setShowStageForm] = useState(false);
    const [showCaseForm, setShowCaseForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [hearingForm, setHearingForm] = useState({
        hearing_date: '', what_happened: '', result: 'Adjourned', next_hearing_date: '', next_hearing_notes: ''
    });
    const [stageForm, setStageForm] = useState({
        stage_number: 1, status: 'Done', notes: '', stage_date: ''
    });
    const [caseForm, setCaseForm] = useState({
        cnr_number: '', court_name: '', case_type: '', filing_date: '', notes: ''
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [caseRes, stagesRes, hearingsRes] = await Promise.all([
                supabase.from('court_cases').select('*').eq('lead_id', leadId).single(),
                supabase.from('court_stages').select('*').eq('lead_id', leadId).order('stage_number'),
                supabase.from('court_hearings').select('*').eq('lead_id', leadId).order('hearing_date', { ascending: false }),
            ]);

            setCourtCase(caseRes.data);
            setStages(stagesRes.data || []);
            setHearings(hearingsRes.data || []);
        } catch (err) {
            console.error('Error fetching case progress:', err);
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getStageStatus = (stageNumber: number) => {
        return stages.find(s => s.stage_number === stageNumber) || null;
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

    const urgencyStyle = (u: string) => {
        if (u === 'overdue') return 'text-[var(--danger-red)] bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]';
        if (u === 'today') return 'text-[var(--danger-red)] bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] animate-pulse';
        if (u === 'tomorrow') return 'text-yellow-400 bg-[rgba(234,179,8,0.1)] border-[rgba(234,179,8,0.2)]';
        if (u === 'soon') return 'text-[var(--accent-gold)] bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.2)]';
        return 'text-[var(--text-secondary)] bg-[rgba(55,65,81,0.2)] border-[var(--border-color)]';
    };

    const handleRegisterCase = async () => {
        setSubmitting(true);
        try {
            const { data, error } = await supabase.from('court_cases').insert([{
                lead_id: leadId,
                cnr_number: caseForm.cnr_number || null,
                court_name: caseForm.court_name || null,
                case_type: caseForm.case_type || null,
                filing_date: caseForm.filing_date || null,
                notes: caseForm.notes,
                current_stage: 1,
            }]).select().single();
            if (error) throw error;
            setCourtCase(data);
            setShowCaseForm(false);
        } catch (e: any) {
            alert('Failed to initiate tracking: ' + e.message);
        } finally { setSubmitting(false); }
    };

    const handleUpdateCaseDetails = async () => {
        if (!courtCase) return;
        setSubmitting(true);
        try {
            const { data, error } = await supabase.from('court_cases').update({
                cnr_number: caseForm.cnr_number,
                court_name: caseForm.court_name,
                case_type: caseForm.case_type,
                filing_date: caseForm.filing_date || null,
                notes: caseForm.notes,
            }).eq('id', courtCase.id).select().single();
            if (error) throw error;
            setCourtCase(data);
            setShowCaseForm(false);
        } catch (e: any) {
            alert('Failed to update case details: ' + e.message);
        } finally { setSubmitting(false); }
    };

    const handleAddHearing = async () => {
        if (!courtCase) return;
        setSubmitting(true);
        try {
            const { data, error } = await supabase.from('court_hearings').insert([{
                court_case_id: courtCase.id,
                lead_id: leadId,
                hearing_date: hearingForm.hearing_date,
                what_happened: hearingForm.what_happened,
                result: hearingForm.result,
                next_hearing_date: hearingForm.next_hearing_date || null,
                next_hearing_notes: hearingForm.next_hearing_notes,
                recorded_by: userId,
            }]).select().single();
            if (error) throw error;
            setHearings(prev => [data, ...prev]);
            setShowHearingForm(false);
            setHearingForm({ hearing_date: '', what_happened: '', result: 'Adjourned', next_hearing_date: '', next_hearing_notes: '' });
        } catch (e: any) {
            alert('Failed to add hearing: ' + e.message);
        } finally { setSubmitting(false); }
    };

    const handleUpdateStage = async () => {
        if (!courtCase) return;
        setSubmitting(true);
        try {
            const existing = getStageStatus(stageForm.stage_number);
            if (existing) {
                const { error } = await supabase.from('court_stages').update({
                    status: stageForm.status,
                    notes: stageForm.notes,
                    stage_date: stageForm.stage_date || null,
                    updated_at: new Date().toISOString(),
                }).eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('court_stages').insert([{
                    court_case_id: courtCase.id,
                    lead_id: leadId,
                    stage_number: stageForm.stage_number,
                    stage_name: COURT_STAGES[stageForm.stage_number - 1],
                    status: stageForm.status,
                    notes: stageForm.notes,
                    stage_date: stageForm.stage_date || null,
                    updated_by: userId,
                }]);
                if (error) throw error;
            }
            await fetchData();
            setShowStageForm(false);
        } catch (e: any) {
            alert('Failed to update stage: ' + e.message);
        } finally { setSubmitting(false); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 size={24} className="animate-spin text-[var(--accent-gold)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Case Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] flex items-center justify-center">
                        <Gavel size={20} className="text-[#a78bfa]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[var(--text-primary)]">
                                Court Case Tracker
                            </h4>
                            {!courtCase ? (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 uppercase font-bold tracking-wider">Not Started</span>
                            ) : (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-bold tracking-wider">Active Tracking</span>
                            )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Document legal procedure stages and hearing logs.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {courtCase && !readOnly && (
                        <button onClick={() => {
                            setCaseForm({
                                cnr_number: courtCase.cnr_number || '',
                                court_name: courtCase.court_name || '',
                                case_type: courtCase.case_type || '',
                                filing_date: courtCase.filing_date || '',
                                notes: courtCase.notes || ''
                            });
                            setShowCaseForm(true);
                        }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-white transition-all">
                            <FileText size={13} /> Edit Case Details
                        </button>
                    )}
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-white transition-all">
                        <RefreshCcw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* Case Initiation (if not yet started) */}
            {!courtCase && !readOnly && (
                <div className="p-6 rounded-2xl border border-dashed border-yellow-500/30 bg-[rgba(234,179,8,0.02)] text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                        <Clock size={24} className="text-yellow-500" />
                    </div>
                    <h5 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-1">Initiate Court Tracking</h5>
                    <p className="text-xs text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">Start tracking Vakalatnama and early filings even before CNR allocation. You can add case details later.</p>
                    <button onClick={handleRegisterCase} disabled={submitting} className="mx-auto px-8 py-3 bg-yellow-500 text-black font-bold rounded-xl text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10">
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Confirm & Start Tracking
                    </button>
                </div>
            )}

            {/* Case Form Modal-ish (for editing or manual register) */}
            {showCaseForm && !readOnly && (
                <div className="p-6 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.2)] space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-2">
                        <h5 className="text-xs font-bold text-[var(--accent-gold)] uppercase tracking-widest">{courtCase ? 'Update Case Details' : 'Register Case Details'}</h5>
                        <button onClick={() => setShowCaseForm(false)} className="text-[var(--text-secondary)] hover:text-white"><Plus size={16} className="rotate-45" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">CNR Number (Stage 3+)</label>
                            <input className="input-glass w-full py-2 text-sm font-mono" placeholder="KL0101001234..." value={caseForm.cnr_number} onChange={e => setCaseForm(f => ({ ...f, cnr_number: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">Court Name</label>
                            <input className="input-glass w-full py-2 text-sm" placeholder="e.g. Ernakulam District Court" value={caseForm.court_name} onChange={e => setCaseForm(f => ({ ...f, court_name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">Case Type</label>
                            <input className="input-glass w-full py-2 text-sm" placeholder="Civil / Criminal / Writ" value={caseForm.case_type} onChange={e => setCaseForm(f => ({ ...f, case_type: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">Filing Date</label>
                            <input type="date" className="input-glass w-full py-2 text-sm" value={caseForm.filing_date} onChange={e => setCaseForm(f => ({ ...f, filing_date: e.target.value }))} />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                        <button onClick={courtCase ? handleUpdateCaseDetails : handleRegisterCase} disabled={submitting} className="flex-1 py-2.5 bg-[var(--accent-gold)] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2">
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            {courtCase ? 'Save Changes' : 'Register Details'}
                        </button>
                        <button onClick={() => setShowCaseForm(false)} className="px-6 py-2.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-white">Cancel</button>
                    </div>
                </div>
            )}

            {/* Case Info Display */}
            {courtCase && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'CNR Number', value: courtCase.cnr_number || '—', mono: true },
                        { label: 'Court', value: courtCase.court_name || '—' },
                        { label: 'Case Type', value: courtCase.case_type || '—' },
                        { label: 'Filing Date', value: courtCase.filing_date ? new Date(courtCase.filing_date).toLocaleDateString('en-IN') : '—' },
                    ].map(item => (
                        <div key={item.label} className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                            <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-widest mb-1">{item.label}</p>
                            <p className={`text-sm font-bold text-[var(--text-primary)] ${item.mono ? 'font-mono text-[11px]' : ''}`}>{item.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Progress Visualization */}
            {courtCase && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT: Stages */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
                                <FileText size={12} /> Procedure Stages
                            </h5>
                            {!readOnly && (
                                <button onClick={() => setShowStageForm(!showStageForm)} className="text-[10px] px-2 py-1 rounded-lg bg-[rgba(139,92,246,0.1)] text-[#a78bfa] border border-[rgba(139,92,246,0.3)] hover:bg-[rgba(139,92,246,0.2)]">
                                    Update Stage
                                </button>
                            )}
                        </div>

                        {showStageForm && !readOnly && (
                            <div className="p-4 rounded-xl border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.05)] space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#a78bfa] uppercase mb-1">Stage</label>
                                        <select className="input-glass w-full py-2.5 text-xs" value={stageForm.stage_number} onChange={e => setStageForm(f => ({ ...f, stage_number: Number(e.target.value) }))}>
                                            {COURT_STAGES.map((s, i) => <option key={i} value={i + 1}>{i + 1}. {s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#a78bfa] uppercase mb-1">Status</label>
                                        <select className="input-glass w-full py-2.5 text-xs" value={stageForm.status} onChange={e => setStageForm(f => ({ ...f, status: e.target.value }))}>
                                            {['Pending', 'Done', 'Adjourned', 'Skipped'].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#a78bfa] uppercase mb-1">Date</label>
                                        <input type="date" className="input-glass w-full py-2.5 text-xs" value={stageForm.stage_date} onChange={e => setStageForm(f => ({ ...f, stage_date: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#a78bfa] uppercase mb-1">Notes</label>
                                        <input className="input-glass w-full py-2.5 text-xs" placeholder="Notes..." value={stageForm.notes} onChange={e => setStageForm(f => ({ ...f, notes: e.target.value }))} />
                                    </div>
                                </div>
                                <button onClick={handleUpdateStage} disabled={submitting} className="w-full py-2 bg-[#8b5cf6] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Update
                                </button>
                            </div>
                        )}

                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                            {COURT_STAGES.map((stageName, i) => {
                                const stageNum = i + 1;
                                const stageData = getStageStatus(stageNum);
                                const status = stageData?.status || 'Pending';
                                return (
                                    <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs transition-colors ${STAGE_COLORS[status]}`}>
                                        <div className="w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0" style={{ borderColor: 'currentColor' }}>
                                            {status === 'Done' ? <CheckCircle2 size={14} /> : stageNum}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold">{stageName}</p>
                                            {stageData?.notes && <p className="text-[10px] opacity-70 mt-0.5">{stageData.notes}</p>}
                                        </div>
                                        {stageData?.stage_date && <span className="text-[10px] font-mono opacity-80 whitespace-nowrap">{new Date(stageData.stage_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT: Hearings */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
                                <Calendar size={12} /> Hearing Log
                            </h5>
                            {!readOnly && (
                                <button onClick={() => setShowHearingForm(!showHearingForm)} className="text-[10px] px-2 py-1 rounded-lg bg-[rgba(212,175,55,0.1)] text-[var(--accent-gold)] border border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.2)]">
                                    Add Hearing
                                </button>
                            )}
                        </div>

                        {showHearingForm && !readOnly && (
                            <div className="p-4 rounded-xl border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.05)] space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-bold text-[var(--accent-gold)] uppercase mb-1">Hearing Date</label>
                                        <input type="date" className="input-glass w-full py-2.5 text-xs" value={hearingForm.hearing_date} onChange={e => setHearingForm(f => ({ ...f, hearing_date: e.target.value }))} required />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[var(--accent-gold)] uppercase mb-1">Result</label>
                                        <select className="input-glass w-full py-2.5 text-xs" value={hearingForm.result} onChange={e => setHearingForm(f => ({ ...f, result: e.target.value }))}>
                                            {HEARING_RESULTS.map(r => <option key={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[9px] font-bold text-[var(--accent-gold)] uppercase mb-1">What Happened</label>
                                        <input className="input-glass w-full py-2.5 text-xs" placeholder="Brief notes..." value={hearingForm.what_happened} onChange={e => setHearingForm(f => ({ ...f, what_happened: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[var(--accent-gold)] uppercase mb-1 flex items-center gap-1">Next Hearing</label>
                                        <input type="date" className="input-glass w-full py-2.5 text-xs" value={hearingForm.next_hearing_date} onChange={e => setHearingForm(f => ({ ...f, next_hearing_date: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[var(--accent-gold)] uppercase mb-1">Purpose</label>
                                        <input className="input-glass w-full py-2.5 text-xs" placeholder="Notes..." value={hearingForm.next_hearing_notes} onChange={e => setHearingForm(f => ({ ...f, next_hearing_notes: e.target.value }))} />
                                    </div>
                                </div>
                                <button onClick={handleAddHearing} disabled={submitting || !hearingForm.hearing_date} className="w-full py-2 bg-[var(--accent-gold)] text-black font-bold rounded-lg text-xs flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Hearing
                                </button>
                            </div>
                        )}

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                            {hearings.length === 0 ? (
                                <div className="text-center py-10 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--text-secondary)]">
                                    <Clock size={24} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-xs">No hearings recorded yet.</p>
                                </div>
                            ) : (
                                hearings.map(h => {
                                    const nextU = getHearingUrgency(h.next_hearing_date);
                                    return (
                                        <div key={h.id} className="p-4 rounded-xl border border-[var(--border-color)] bg-[rgba(255,255,255,0.01)] space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-[var(--text-primary)]">
                                                    {new Date(h.hearing_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${h.result === 'Final Hearing' || h.result === 'Order Passed' ? 'bg-[rgba(16,185,129,0.1)] text-[var(--success-green)] border border-[rgba(16,185,129,0.2)]' : 'bg-[rgba(239,68,68,0.1)] text-[var(--danger-red)] border border-[rgba(239,68,68,0.2)]'}`}>
                                                    {h.result}
                                                </span>
                                            </div>
                                            {h.what_happened && <p className="text-xs text-[var(--text-secondary)] italic">"{h.what_happened}"</p>}
                                            {h.next_hearing_date && (
                                                <div className={`flex items-center gap-2 p-2 rounded-lg border text-[10px] font-bold ${urgencyStyle(nextU)}`}>
                                                    <Calendar size={12} />
                                                    Next: {new Date(h.next_hearing_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    {h.next_hearing_notes && <span className="opacity-70 font-normal">({h.next_hearing_notes})</span>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

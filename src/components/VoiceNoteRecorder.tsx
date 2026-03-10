'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, Pause, Loader2, CheckCircle2, Volume2, Headset } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface VoiceNoteRecorderProps {
    onUploadComplete: (url: string) => void;
    onReset: () => void;
    onUploading?: (status: boolean) => void;
}

export default function VoiceNoteRecorder({ onUploadComplete, onReset, onUploading }: VoiceNoteRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAttached, setIsAttached] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                setIsRecording(false);
                if (timerRef.current) clearInterval(timerRef.current);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error starting recording:', err);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const discardRecording = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        setIsAttached(false);
        onReset();
    };

    const handleAttach = async () => {
        if (!audioBlob) return;
        setIsUploading(true);
        if (onUploading) onUploading(true);
        try {
            const fileName = `voice-note-${Date.now()}.webm`;
            const { data, error } = await supabase.storage
                .from('voice-notes')
                .upload(fileName, audioBlob);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('voice-notes')
                .getPublicUrl(fileName);

            onUploadComplete(publicUrl);
            setIsAttached(true);
        } catch (err: any) {
            console.error('Upload error:', err);
            if (err.message?.includes('Bucket not found') || err.status === 400) {
                alert('CRITICAL: Supabase Storage bucket "voice-notes" was not found. Please create a bucket named "voice-notes" in your Supabase dashboard and set it to public.');
            } else {
                alert('Failed to upload voice note: ' + err.message);
            }
        } finally {
            setIsUploading(false);
            if (onUploading) onUploading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[var(--border-color)] overflow-hidden">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <Headset size={14} className="text-[var(--text-secondary)]" />
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                        {isAttached ? 'Voice Note Attached' : isRecording ? 'Recording Audio' : 'Add Voice Note'}
                    </span>
                </div>
                {recordingTime > 0 && (
                    <span className="text-[10px] font-mono font-bold text-[var(--accent-gold)] bg-[rgba(212,175,55,0.1)] px-2 py-0.5 rounded-full">{formatTime(recordingTime)}</span>
                )}
            </div>

            {isAttached ? (
                <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.2)] animate-in zoom-in duration-300">
                    <CheckCircle2 size={18} className="text-[var(--success-green)]" />
                    <span className="text-sm font-medium text-[var(--success-green)]">Audio response attached.</span>
                    <button onClick={discardRecording} className="ml-auto text-xs text-[var(--text-secondary)] hover:text-[var(--danger-red)] transition-colors underline underline-offset-4">Change</button>
                </div>
            ) : (
                <>
                    {!isRecording && !audioBlob && (
                        <button
                            onClick={startRecording}
                            className="flex items-center justify-center gap-2 py-4 px-4 rounded-xl bg-[rgba(212,175,55,0.05)] text-[var(--accent-gold)] border border-[var(--border-color)] hover:bg-[rgba(212,175,55,0.1)] hover:border-[rgba(212,175,55,0.3)] transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-[rgba(212,175,55,0.1)] flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Mic size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">Record Update</p>
                                <p className="text-[10px] text-[var(--text-secondary)]">Faster than typing notes</p>
                            </div>
                        </button>
                    )}

                    {isRecording && (
                        <div className="flex items-center gap-4 py-2 px-4 rounded-xl bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.2)] animate-pulse">
                            <span className="text-xs font-bold text-red-500 flex-1">Recording...</span>
                            <button
                                onClick={stopRecording}
                                className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-red-500/20"
                            >
                                <Square size={16} fill="currentColor" />
                            </button>
                        </div>
                    )}

                    {audioBlob && !isUploading && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[var(--border-color)]">
                                <button
                                    onClick={() => {
                                        if (isPlaying) audioPlayerRef.current?.pause();
                                        else audioPlayerRef.current?.play();
                                        setIsPlaying(!isPlaying);
                                    }}
                                    className="w-10 h-10 flex items-center justify-center text-[var(--accent-gold)] hover:bg-[rgba(212,175,55,0.1)] rounded-full transition-all"
                                >
                                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                                </button>
                                <div className="flex-1 space-y-1">
                                    <div className="h-1 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                                        <div className="h-full bg-[var(--accent-gold)] w-0 transition-all duration-100 ease-linear" id="audio-progress" />
                                    </div>
                                    <div className="flex justify-between text-[8px] font-mono text-[var(--text-secondary)] uppercase">
                                        <span>Preview Note</span>
                                        <span>{formatTime(recordingTime)}</span>
                                    </div>
                                </div>
                                <audio
                                    ref={audioPlayerRef}
                                    src={audioUrl || ''}
                                    onEnded={() => setIsPlaying(false)}
                                    onTimeUpdate={(e) => {
                                        const el = e.currentTarget;
                                        const progress = (el.currentTime / el.duration) * 100;
                                        const bar = document.getElementById('audio-progress');
                                        if (bar) bar.style.width = `${progress}%`;
                                    }}
                                    className="hidden"
                                />
                                <button onClick={discardRecording} className="p-2 text-[var(--text-secondary)] hover:text-[var(--danger-red)] rounded-full transition-all">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <button
                                onClick={handleAttach}
                                className="w-full py-2.5 bg-[#d4af37] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#d4af37]/10"
                            >
                                <Volume2 size={14} /> Attach Voice Note to Activity
                            </button>
                        </div>
                    )}

                    {isUploading && (
                        <div className="flex flex-col items-center justify-center py-6 gap-3 text-[var(--text-secondary)] glass-panel rounded-xl">
                            <Loader2 size={24} className="animate-spin text-[var(--accent-gold)]" />
                            <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent-gold)]">Syncing to Cloud...</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

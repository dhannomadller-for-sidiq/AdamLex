'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, MessageSquare } from 'lucide-react';

interface ChatPanelProps {
    leadId: string;
    currentUserId: string;
    currentUserName: string;
}

export default function ChatPanel({ leadId, currentUserId, currentUserName }: ChatPanelProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('lead_chats')
            .select('id, message, created_at, sender_id, profiles(full_name)')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: true });
        if (data) setMessages(data);
    };

    useEffect(() => {
        fetchMessages();

        // Subscribe to new messages in real-time
        const channel = supabase
            .channel(`lead-chat-${leadId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'lead_chats',
                filter: `lead_id=eq.${leadId}`
            }, () => {
                fetchMessages();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [leadId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        setSending(true);

        const { error } = await supabase.from('lead_chats').insert({
            lead_id: leadId,
            sender_id: currentUserId,
            message: newMessage.trim()
        });

        if (!error) setNewMessage('');
        setSending(false);
    };

    return (
        <div className="flex flex-col h-full bg-[rgba(0,0,0,0.2)] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2 shrink-0">
                <MessageSquare size={14} className="text-[var(--accent-gold)]" />
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Internal Chat</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 ? (
                    <p className="text-center text-xs text-[var(--text-secondary)] italic mt-8">No messages yet. Start the conversation!</p>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId;
                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-[var(--text-secondary)] mb-1 px-1">
                                    {(msg.profiles as any)?.full_name || 'Unknown'} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${isMe
                                    ? 'bg-[rgba(212,175,55,0.2)] text-[var(--text-primary)] rounded-br-none border border-[rgba(212,175,55,0.3)]'
                                    : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] rounded-bl-none border border-[rgba(255,255,255,0.07)]'
                                    }`}>
                                    {msg.message}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 border-t border-[rgba(255,255,255,0.05)] flex gap-2 shrink-0">
                <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="input-glass flex-1 py-2 px-3 text-sm h-9"
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="btn-primary h-9 w-9 flex items-center justify-center p-0 shrink-0 disabled:opacity-40"
                >
                    <Send size={14} />
                </button>
            </form>
        </div>
    );
}

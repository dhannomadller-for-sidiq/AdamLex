'use client';

import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useCourtNotifications(userId: string | null) {
    const registerServiceWorker = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) return;

        try {
            await navigator.serviceWorker.register('/sw.js');
        } catch (e) {
            console.warn('SW registration failed:', e);
        }
    }, []);

    const requestPermissionAndCheck = useCallback(async () => {
        if (!userId) return;
        if (!('Notification' in window)) return;

        // Request permission
        let permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }
        if (permission !== 'granted') return;

        // Check for upcoming hearings (today or tomorrow)
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const { data: hearings } = await supabase
            .from('court_hearings')
            .select('next_hearing_date, court_case_id, court_cases!inner(lead_id, leads!inner(client_name, assigned_to))')
            .gte('next_hearing_date', todayStr)
            .lte('next_hearing_date', tomorrowStr);

        if (!hearings || hearings.length === 0) return;

        hearings.forEach((h: any) => {
            const clientName = h.court_cases?.leads?.client_name || 'Client';
            const hearingDate = new Date(h.next_hearing_date);
            const isToday = h.next_hearing_date === todayStr;

            new Notification(isToday ? '🔴 Court Hearing TODAY' : '🟡 Court Hearing Tomorrow', {
                body: `${clientName} — ${hearingDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
                icon: '/favicon.ico',
                tag: `hearing-${h.court_case_id}`,
                requireInteraction: true,
            });
        });
    }, [userId]);

    useEffect(() => {
        registerServiceWorker();
    }, [registerServiceWorker]);

    useEffect(() => {
        if (userId) {
            // Small delay so the page loads first
            const timer = setTimeout(() => requestPermissionAndCheck(), 2000);
            return () => clearTimeout(timer);
        }
    }, [userId, requestPermissionAndCheck]);

    return { requestPermissionAndCheck };
}

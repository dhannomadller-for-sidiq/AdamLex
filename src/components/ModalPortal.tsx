'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into document.body via a React Portal.
 * SSR-safe: only mounts on the client side.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const [el] = useState(() => {
        if (typeof document !== 'undefined') {
            return document.createElement('div');
        }
        return null;
    });

    useEffect(() => {
        if (!el) return;
        document.body.appendChild(el);
        setMounted(true);
        return () => {
            document.body.removeChild(el);
        };
    }, [el]);

    if (!mounted || !el) return null;
    return createPortal(children, el);
}

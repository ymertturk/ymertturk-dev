import { useEffect, useRef } from 'react';

/**
 * Custom hook to add scroll-triggered reveal animations.
 * Adds 'visible' class when element enters viewport.
 * Uses MutationObserver to detect new .reveal children (e.g. after language switch).
 */
export function useScrollReveal() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        function observeAll() {
            const revealElements = el!.querySelectorAll('.reveal:not(.visible)');
            revealElements.forEach(child => observer.observe(child));
        }

        observeAll();

        // Watch for DOM changes (e.g. language switch causing re-render)
        const mutationObserver = new MutationObserver(() => {
            observeAll();
        });
        mutationObserver.observe(el, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            mutationObserver.disconnect();
        };
    }, []);

    return ref;
}

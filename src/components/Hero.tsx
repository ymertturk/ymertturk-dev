import { useEffect, useRef, useState, useCallback } from 'react';
import { useI18n } from '../i18n';

export function Hero() {
    const { t } = useI18n();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [displayText, setDisplayText] = useState('');
    const [roleIndex, setRoleIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    // Reset typewriter when language changes
    useEffect(() => {
        setDisplayText('');
        setRoleIndex(0);
        setIsDeleting(false);
    }, [t]);

    // Typewriter effect
    useEffect(() => {
        const currentRole = t.roles[roleIndex];
        let timeout: ReturnType<typeof setTimeout>;

        if (!isDeleting) {
            if (displayText.length < currentRole.length) {
                timeout = setTimeout(
                    () => setDisplayText(currentRole.slice(0, displayText.length + 1)),
                    80
                );
            } else {
                timeout = setTimeout(() => setIsDeleting(true), 2000);
            }
        } else {
            if (displayText.length > 0) {
                timeout = setTimeout(
                    () => setDisplayText(displayText.slice(0, -1)),
                    40
                );
            } else {
                setIsDeleting(false);
                setRoleIndex((roleIndex + 1) % t.roles.length);
            }
        }

        return () => clearTimeout(timeout);
    }, [displayText, isDeleting, roleIndex, t.roles]);

    // Particle animation
    const animateParticles = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            opacity: number;
        }

        const isMobile = window.innerWidth < 768;
        const particleCount = isMobile ? 30 : 80;
        const connectionDistance = isMobile ? 100 : 150;

        const particles: Particle[] = Array.from({ length: particleCount }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.5 + 0.1,
        }));

        let animationId: number;

        function draw() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(108, 99, 255, ${p.opacity})`;
                ctx.fill();

                for (let j = i + 1; j < particles.length; j++) {
                    const dx = p.x - particles[j].x;
                    const dy = p.y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(108, 99, 255, ${0.05 * (1 - dist / connectionDistance)})`;
                        ctx.stroke();
                    }
                }
            });

            animationId = requestAnimationFrame(draw);
        }

        draw();
        return () => cancelAnimationFrame(animationId);
    }, []);

    useEffect(() => {
        const cleanup = animateParticles();
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        return () => {
            cleanup?.();
            window.removeEventListener('resize', handleResize);
        };
    }, [animateParticles]);

    const scrollToAbout = () => {
        document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section className="hero" id="hero">
            <canvas ref={canvasRef} className="hero-canvas" />
            <div className="hero-glow hero-glow-1" />
            <div className="hero-glow hero-glow-2" />

            <div className="hero-content">
                <p className="hero-greeting">{t.greeting}</p>
                <h1 className="hero-name">
                    Yusuf Mert <span className="gradient-text">Türk</span>
                </h1>
                <div className="hero-typewriter">
                    {displayText}<span className="cursor" />
                </div>
                <div className="hero-cta">
                    <a href="#projects" className="btn btn-primary" onClick={e => { e.preventDefault(); document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' }); }}>
                        {t.ctaProjects}
                    </a>
                    <a href="#contact" className="btn btn-outline" onClick={e => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}>
                        {t.ctaContact}
                    </a>
                </div>
            </div>

            <div className="hero-scroll" onClick={scrollToAbout} style={{ cursor: 'pointer' }}>
                <div className="hero-scroll-icon" />
            </div>
        </section>
    );
}

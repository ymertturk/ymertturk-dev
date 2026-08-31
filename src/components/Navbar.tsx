import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';

export function Navbar() {
    const { lang, setLang, t } = useI18n();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const NAV_ITEMS = [
        { label: t.navAbout, href: '#about' },
        { label: t.navProjects, href: '#projects' },
        { label: t.navContact, href: '#contact' },
    ];

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        setMenuOpen(false);
        const el = document.querySelector(href);
        el?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <a href="#" className="nav-logo">
                mert<span>.dev</span>
            </a>

            <div className="nav-right">
                <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
                    {NAV_ITEMS.map(item => (
                        <li key={item.href}>
                            <a href={item.href} onClick={e => handleClick(e, item.href)}>
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>

                <div className="lang-toggle">
                    <button
                        className={`lang-btn${lang === 'tr' ? ' lang-btn--active' : ''}`}
                        onClick={() => setLang('tr')}
                    >
                        TR
                    </button>
                    <button
                        className={`lang-btn${lang === 'en' ? ' lang-btn--active' : ''}`}
                        onClick={() => setLang('en')}
                    >
                        EN
                    </button>
                </div>

                <button
                    className="nav-toggle"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>
        </nav>
    );
}

import { useScrollReveal } from '../hooks/useScrollReveal';
import { useI18n } from '../i18n';

export function Contact() {
    const { t } = useI18n();
    const sectionRef = useScrollReveal();

    const CONTACTS = [
        {
            icon: '📧',
            label: 'Email',
            value: 'operation@babilticaret.com',
            href: 'mailto:operation@babilticaret.com',
        },
        {
            icon: '📞',
            label: t.contactPhone,
            value: '+90 545 470 9233',
            href: 'tel:+905454709233',
        },
        {
            icon: '🌐',
            label: 'Website',
            value: 'babilticaret.com',
            href: 'https://www.babilticaret.com',
        },
        {
            icon: '💼',
            label: t.contactCompany,
            value: t.contactCompanyValue,
            href: 'https://www.babilticaret.com',
        },
    ];

    return (
        <section className="contact section" id="contact" ref={sectionRef}>
            <div className="reveal">
                <h2 className="section-title">
                    {t.contactTitle}<span className="gradient-text">.</span>
                </h2>
                <p className="section-subtitle" style={{ margin: '0 auto var(--space-md)' }}>
                    {t.contactSubtitle}
                </p>
            </div>

            <div className="contact-links">
                {CONTACTS.map((contact, i) => (
                    <a
                        key={contact.label}
                        href={contact.href}
                        target={contact.href.startsWith('http') ? '_blank' : undefined}
                        rel={contact.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className={`contact-card reveal reveal-delay-${i + 1}`}
                    >
                        <div className="contact-card-icon">{contact.icon}</div>
                        <div className="contact-card-info">
                            <div className="contact-card-label">{contact.label}</div>
                            <div className="contact-card-value">{contact.value}</div>
                        </div>
                    </a>
                ))}
            </div>
        </section>
    );
}

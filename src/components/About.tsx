import { useScrollReveal } from '../hooks/useScrollReveal';
import { useI18n } from '../i18n';

const SKILLS_BASE = [
    { icon: '⚛️', name: 'React' },
    { icon: '📘', name: 'TypeScript' },
    { icon: '🟨', name: 'JavaScript' },
    { icon: '🐍', name: 'Python' },
    { icon: '🟢', name: 'Node.js' },
    { icon: '🗄️', name: 'SQL' },
    { icon: '🎨', name: 'CSS/SASS' },
    { icon: '📱', name: 'React Native' },
    { icon: '🤖', nameKey: 'automation' as const },
    { icon: '🐙', name: 'Git' },
    { icon: '🐳', name: 'Docker' },
    { icon: '☁️', name: 'Cloud' },
];

export function About() {
    const { t } = useI18n();
    const sectionRef = useScrollReveal();

    const skills = SKILLS_BASE.map(s =>
        'nameKey' in s && s.nameKey === 'automation'
            ? { icon: s.icon, name: t.skillAutomation }
            : { icon: s.icon, name: s.name! }
    );

    return (
        <section className="about section" id="about" ref={sectionRef}>
            <div className="reveal">
                <h2 className="section-title">
                    {t.aboutTitle}<span className="gradient-text">.</span>
                </h2>
                <p className="section-subtitle">
                    {t.aboutSubtitle}
                </p>
            </div>

            <div className="about-grid">
                <div className="about-info reveal reveal-delay-1">
                    <h3>{t.aboutHeading}</h3>
                    <p>{t.aboutP1}</p>
                    <p>{t.aboutP2}</p>
                    <p>{t.aboutP3}</p>
                    <p>{t.aboutP4}</p>
                    <p className="about-signature">{t.aboutSignature}</p>
                    <p className="about-tagline"><em>{t.aboutTagline}</em></p>

                    <div className="about-stats">
                        <div className="stat-item">
                            <div className="stat-number">5+</div>
                            <div className="stat-label">{t.statProjects}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number">10+</div>
                            <div className="stat-label">{t.statTech}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number">∞</div>
                            <div className="stat-label">{t.statPassion}</div>
                        </div>
                    </div>
                </div>

                <div className="skills-grid reveal reveal-delay-2">
                    {skills.map(skill => (
                        <div key={skill.name} className="skill-card">
                            <div className="skill-icon">{skill.icon}</div>
                            <div className="skill-name">{skill.name}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

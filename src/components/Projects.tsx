import { useScrollReveal } from '../hooks/useScrollReveal';
import { useI18n } from '../i18n';

export function Projects() {
    const { t } = useI18n();
    const sectionRef = useScrollReveal();

    return (
        <section className="section" id="projects" ref={sectionRef}>
            <div className="reveal">
                <h2 className="section-title">
                    {t.projectsTitle}<span className="gradient-text">.</span>
                </h2>
                <p className="section-subtitle">
                    {t.projectsSubtitle}
                </p>
            </div>

            <div className="projects-grid">
                {t.projects.map((project, i) => (
                    <div key={project.title} className={`project-card reveal reveal-delay-${Math.min(i + 1, 5)}`}>
                        <div className="project-header">
                            <span className="project-icon">{project.icon}</span>
                            {project.link && (
                                <div className="project-links">
                                    <a href={project.link} target="_blank" rel="noopener noreferrer" className="project-link">
                                        🔗
                                    </a>
                                </div>
                            )}
                        </div>
                        <div className="project-body">
                            <h3 className="project-title">{project.title}</h3>
                            <p className="project-desc">{project.description}</p>
                            <div className="project-tech">
                                {project.tech.map(techItem => (
                                    <span key={techItem} className="tech-tag">{techItem}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

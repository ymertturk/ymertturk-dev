import { useI18n } from '../i18n';

export function Footer() {
    const { t } = useI18n();
    const year = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-content">
                <span className="footer-text">
                    © {year} Yusuf Mert Türk. {t.footerRights}
                </span>
                <span className="footer-brand">
                    {t.footerMadeBy}{' '}
                    <a href="https://www.babilticaret.com" target="_blank" rel="noopener noreferrer">
                        BabilSoft
                    </a>
                </span>
            </div>
        </footer>
    );
}

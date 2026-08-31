import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'tr' | 'en';

interface Locale {
    // Navbar
    navAbout: string;
    navProjects: string;
    navContact: string;

    // Hero
    greeting: string;
    roles: string[];
    ctaProjects: string;
    ctaContact: string;

    // About
    aboutTitle: string;
    aboutSubtitle: string;
    aboutHeading: string;
    aboutP1: string;
    aboutP2: string;
    aboutP3: string;
    aboutP4: string;
    aboutSignature: string;
    aboutTagline: string;
    statProjects: string;
    statTech: string;
    statPassion: string;

    // Skills
    skillAutomation: string;

    // Projects
    projectsTitle: string;
    projectsSubtitle: string;
    projects: {
        icon: string;
        title: string;
        description: string;
        tech: string[];
        link?: string;
    }[];

    // Contact
    contactTitle: string;
    contactSubtitle: string;
    contactPhone: string;
    contactCompany: string;
    contactCompanyValue: string;

    // Footer
    footerRights: string;
    footerMadeBy: string;
}

const tr: Locale = {
    navAbout: 'Hakkımda',
    navProjects: 'Projeler',
    navContact: 'İletişim',

    greeting: '< Merhaba, ben />',
    roles: [
        'Full Stack Developer',
        'Mobil Uygulama Geliştirici',
        'Otomasyon Uzmanı',
        'React & TypeScript',
        'Python Developer',
    ],
    ctaProjects: '🚀 Projelerim',
    ctaContact: '📬 İletişim',

    aboutTitle: 'Hakkımda',
    aboutSubtitle: 'Modern teknolojilerle etkileyici dijital deneyimler oluşturuyorum.',
    aboutHeading: 'ymertturk.dev',
    aboutP1: 'Farklı alanlarda geliştirdiğim fikirleri, araçları ve deneysel projeleri paylaştığım kişisel bir çalışma alanı.',
    aboutP2: 'Buradaki içerikler tek bir konuya bağlı değil. Bazen spor teknolojileri, bazen veri işleme, bazen de sadece "bunu böyle yapmak daha doğru olurdu" dediğim küçük sistemler.',
    aboutP3: 'Bu siteyi bir vitrin gibi değil, çalışan bir alan gibi düşünebilirsin: yazıyorum, deniyorum, deploy ediyorum ve bırakıyorum.',
    aboutP4: 'Bazıları ürüne dönüşür, bazıları sadece bir fikir olarak kalır. Hepsi gerçek problemlerden çıkar.',
    aboutSignature: '— Yusuf Mert Türk',
    aboutTagline: 'Everything here has been deployed at least once.',
    statProjects: 'Proje',
    statTech: 'Teknoloji',
    statPassion: 'Tutku',

    skillAutomation: 'Otomasyon',

    projectsTitle: 'Projelerim',
    projectsSubtitle: 'Üzerinde çalıştığım bazı projeler ve çözümler.',
    projects: [
        {
            icon: '📦',
            title: 'Amazon FBA Stok & Satış Takip',
            description: 'FBA koli ve kutu takibi, gerçek zamanlı satış entegrasyonu, iade takibi ve 24/7 canlı bulut veritabanı senkronizasyonlu stok yönetim platformu.',
            tech: ['JavaScript', 'HTML5', 'Chart.js', 'Netlify Functions', 'Cloud DB'],
        },
        {
            icon: '⚖️',
            title: 'Tedarikçi Fiyat Karşılaştırma',
            description: 'Yurtdışı tedarikçi tekliflerini gümrük vergileri (GTIP), nakliye maliyetleri ve döviz kurları ile kar-zarar odaklı kıyaslayan karar destek sistemi.',
            tech: ['React', 'TypeScript', 'TailwindCSS', 'Vite', 'Excel/PDF Parsing'],
        },
        {
            icon: '🧠',
            title: 'MindNexus İkinci Beyin',
            description: 'Sesli komut ayrıştırıcı, fiziksel defter OCR okuyucu, 2D nöral zihin haritası ve otonom arka plan kod ajanı destekli mobil uyumlu düşünce ağı.',
            tech: ['Web Speech API', 'OCR Engine', 'Force Physics', 'AI Agent Bridge'],
        },
        {
            icon: '🏃',
            title: 'WA Puan Hesaplayıcı',
            description: 'Dünya Atletizm 2025 puanlama tablolarına dayanan denklem tabanlı puan hesaplama sistemi. 160+ yarışma, erkek/kadın, açık hava/salon desteği.',
            tech: ['React', 'TypeScript', 'Vite', 'CSS'],
        },
        {
            icon: '🛒',
            title: 'Sopyo Otomasyon',
            description: 'E-ticaret platformlarında ürün yönetimi ve fiyat güncelleme otomasyonu. Trendyol, Hepsiburada, N11 ve PTTAVM entegrasyonları.',
            tech: ['Python', 'Playwright', 'Automation', 'Selenium'],
        },
        {
            icon: '⚽',
            title: 'Hakem Takip Sistemi',
            description: 'Atletizm hakemlerinin davet takibi, yarış yönetimi ve Telegram bot bildirim sistemi. Kapsamlı veri analizi ve raporlama.',
            tech: ['Python', 'Flask', 'SQLite', 'Telegram Bot'],
        },
        {
            icon: '📊',
            title: 'BabilSoft Platform',
            description: 'Babil Ticaret bünyesinde geliştirilen kapsamlı iş yönetim platformu. Stok takibi, müşteri yönetimi ve raporlama araçları.',
            tech: ['React', 'Node.js', 'PostgreSQL', 'REST API'],
        },
        {
            icon: '🎥',
            title: 'Video Üretim Sistemi',
            description: 'Yapay zeka destekli otomatik video üretim pipeline\'ı. Görüntü işleme, watermark ekleme ve 9:16 format desteği.',
            tech: ['Python', 'FFmpeg', 'AI/ML', 'Imagen'],
        },
        {
            icon: '🌐',
            title: 'ymertturk.dev',
            description: 'Kişisel portföy websitesi. Modern tasarım, animasyonlar, particle background ve responsive yapı.',
            tech: ['React', 'TypeScript', 'CSS', 'Vite'],
        },
    ],

    contactTitle: 'İletişim',
    contactSubtitle: 'Bir projeniz mi var? Birlikte çalışalım.',
    contactPhone: 'Telefon',
    contactCompany: 'Şirket',
    contactCompanyValue: 'BabilSoft — Bir Babil Ticaret kuruluşudur',

    footerRights: 'Tüm hakları saklıdır.',
    footerMadeBy: 'tarafından ❤️ ile yapıldı.',
};

const en: Locale = {
    navAbout: 'About',
    navProjects: 'Projects',
    navContact: 'Contact',

    greeting: '< Hello, I\'m />',
    roles: [
        'Full Stack Developer',
        'Mobile App Developer',
        'Automation Engineer',
        'React & TypeScript',
        'Python Developer',
    ],
    ctaProjects: '🚀 Projects',
    ctaContact: '📬 Contact',

    aboutTitle: 'About',
    aboutSubtitle: 'Building impactful digital experiences with modern technologies.',
    aboutHeading: 'ymertturk.dev',
    aboutP1: 'A personal workspace where I share ideas, tools, and experimental projects from various fields.',
    aboutP2: 'The content here isn\'t tied to a single topic. Sometimes sports technology, sometimes data processing, sometimes just small systems where I thought "this could be done better."',
    aboutP3: 'Think of this site not as a showcase, but as a working space: I write, experiment, deploy, and move on.',
    aboutP4: 'Some turn into products, some remain just ideas. All of them stem from real problems.',
    aboutSignature: '— Yusuf Mert Türk',
    aboutTagline: 'Everything here has been deployed at least once.',
    statProjects: 'Projects',
    statTech: 'Technologies',
    statPassion: 'Passion',

    skillAutomation: 'Automation',

    projectsTitle: 'Projects',
    projectsSubtitle: 'Some of the projects and solutions I\'ve worked on.',
    projects: [
        {
            icon: '📦',
            title: 'Amazon FBA Inventory & Sales Tracker',
            description: 'FBA box tracking, live sales integration, return management, and 24/7 cloud database synced inventory platform.',
            tech: ['JavaScript', 'HTML5', 'Chart.js', 'Netlify Functions', 'Cloud DB'],
        },
        {
            icon: '⚖️',
            title: 'Supplier Price Comparison Engine',
            description: 'Decision support system evaluating overseas supplier quotes with customs duties (HS/GTIP), shipping costs, and currency conversion.',
            tech: ['React', 'TypeScript', 'TailwindCSS', 'Vite', 'Excel/PDF Parsing'],
        },
        {
            icon: '🧠',
            title: 'MindNexus Second Brain',
            description: 'Mobile-responsive neural mind map with voice dictation parser, physical notebook OCR reader, and autonomous background AI agent bridge.',
            tech: ['Web Speech API', 'OCR Engine', 'Force Physics', 'AI Agent Bridge'],
        },
        {
            icon: '🏃',
            title: 'WA Points Calculator',
            description: 'Equation-based scoring system based on World Athletics 2025 tables. Support for 160+ events, male/female, outdoor/indoor.',
            tech: ['React', 'TypeScript', 'Vite', 'CSS'],
        },
        {
            icon: '🛒',
            title: 'Sopyo Automation',
            description: 'Product management and price update automation across e-commerce platforms. Trendyol, Hepsiburada, N11, and PTTAVM integrations.',
            tech: ['Python', 'Playwright', 'Automation', 'Selenium'],
        },
        {
            icon: '⚽',
            title: 'Referee Tracker',
            description: 'Athletics referee invitation tracking, race management, and Telegram bot notification system. Comprehensive data analysis and reporting.',
            tech: ['Python', 'Flask', 'SQLite', 'Telegram Bot'],
        },
        {
            icon: '📊',
            title: 'BabilSoft Platform',
            description: 'Comprehensive business management platform developed under Babil Ticaret. Inventory tracking, customer management, and reporting tools.',
            tech: ['React', 'Node.js', 'PostgreSQL', 'REST API'],
        },
        {
            icon: '🎥',
            title: 'Video Production System',
            description: 'AI-powered automatic video production pipeline. Image processing, watermarking, and 9:16 format support.',
            tech: ['Python', 'FFmpeg', 'AI/ML', 'Imagen'],
        },
        {
            icon: '🌐',
            title: 'ymertturk.dev',
            description: 'Personal portfolio website. Modern design, animations, particle background, and responsive layout.',
            tech: ['React', 'TypeScript', 'CSS', 'Vite'],
        },
    ],

    contactTitle: 'Contact',
    contactSubtitle: 'Have a project? Let\'s work together.',
    contactPhone: 'Phone',
    contactCompany: 'Company',
    contactCompanyValue: 'BabilSoft — A Babil Ticaret company',

    footerRights: 'All rights reserved.',
    footerMadeBy: 'Made with ❤️ by',
};

const locales: Record<Lang, Locale> = { tr, en };

interface I18nContextType {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: Locale;
}

const I18nContext = createContext<I18nContextType>({
    lang: 'tr',
    setLang: () => { },
    t: tr,
});

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Lang>('tr');
    const t = locales[lang];
    return (
        <I18nContext.Provider value={{ lang, setLang, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    return useContext(I18nContext);
}

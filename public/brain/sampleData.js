/**
 * MindNexus Sample Data
 * Preset notes representing a real personal knowledge network.
 */

const INITIAL_NODES = [
    {
        id: "node-1",
        title: "Minimalist Çalışma Alanı Tasarımı",
        content: "Ergonomik ahşap masa, 4K ekran, loş ortam aydınlatması ve kablo gizleme düzenekleri.",
        source: "instagram",
        sourceUrl: "https://instagram.com/p/sample1",
        tags: ["tasarım", "çalışma-alanı", "minimalizm"],
        date: "2026-08-15",
        status: "active", // active | expired
        expiryDate: "2026-12-31",
        image: "https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&w=600&q=80",
        color: "#E1306C"
    },
    {
        id: "node-2",
        title: "Verimlilik İçin Zaman Bloklama (Time Blocking)",
        content: "Günü 90 dakikalık odaklanma bloklarına bölmek derin çalışma (Deep Work) verimini %40 artırıyor.",
        source: "twitter",
        sourceUrl: "https://x.com/user/status/123456",
        tags: ["verimlilik", "zaman-yönetimi", "focus"],
        date: "2026-08-20",
        status: "active",
        expiryDate: "2026-11-01",
        color: "#1DA1F2"
    },
    {
        id: "node-3",
        title: "Yapay Zeka & Nöral Ağlar Defter Notu",
        content: "Fiziksel defterden: Graph Neural Networks (GNN) ile bilgi grafikleri üzerinden anlamsal ilişki çıkarma formülleri.",
        source: "physical",
        sourceUrl: "",
        tags: ["yapay-zeka", "bilgi-grafiği", "fiziksel-not"],
        date: "2026-08-10",
        status: "active",
        expiryDate: "",
        image: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80",
        color: "#9b51e0"
    },
    {
        id: "node-4",
        title: "Haftalık Market & Beslenme Listesi",
        content: "Avokado, Yulaf, Badem Sütü, Somon, Brokoli. Glutensiz diyet planı.",
        source: "phone",
        sourceUrl: "",
        tags: ["beslenme", "sağlık", "market"],
        date: "2026-07-01",
        status: "expired", // Expired note!
        expiryDate: "2026-07-07",
        color: "#f2994a"
    },
    {
        id: "node-5",
        title: "Yeni SaaS Projesi Fikir Taslağı",
        content: "Kişisel bilgi yönetimini görselleştiren İkinci Beyin (Second Brain) tuvali uygulaması. D3/Canvas interaktif düğümler.",
        source: "phone",
        sourceUrl: "",
        tags: ["proje", "saas", "zaman-yönetimi", "yapay-zeka"],
        date: "2026-08-28",
        status: "active",
        expiryDate: "2027-01-01",
        color: "#f2994a"
    },
    {
        id: "node-6",
        title: "Japonya Seyahat Rotası & İpuçları",
        content: "Tokyo - Kyoto - Osaka tren bileti indirimleri, Suica kart kullanımı ve gezilecek tapınaklar listesi.",
        source: "instagram",
        sourceUrl: "https://instagram.com/p/japan_travel",
        tags: ["seyahat", "japonya", "tatil"],
        date: "2026-05-10",
        status: "expired",
        expiryDate: "2026-06-01",
        image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80",
        color: "#E1306C"
    },
    {
        id: "node-7",
        title: "UI/UX Renk Paleti & Tipografi İlhamı",
        content: "Koyu temada neon turkuaz ve mor geçişleri, Inter font ailesi ve glassmorphism kart tasarımları.",
        source: "twitter",
        sourceUrl: "https://x.com/design_daily/status/987654",
        tags: ["tasarım", "ui-ux", "minimalizm"],
        date: "2026-08-25",
        status: "active",
        expiryDate: "2026-12-15",
        color: "#1DA1F2"
    },
    {
        id: "node-8",
        title: "Kahve Demleme Reçetesi (V60)",
        content: "15g kahve, 250ml 92°C su. 45 sn ön demleme, 3 kademeli su döküşü. Toplam 2:30 dk.",
        source: "physical",
        sourceUrl: "",
        tags: ["kahve", "beslenme", "fiziksel-not"],
        date: "2026-08-01",
        status: "active",
        expiryDate: "",
        color: "#9b51e0"
    }
];

const INITIAL_LINKS = [
    { source: "node-1", target: "node-7", label: "Tasarım Dili", strength: 0.9 },
    { source: "node-2", target: "node-5", label: "Verimlilik Projesi", strength: 0.8 },
    { source: "node-3", target: "node-5", label: "Algoritma Temeli", strength: 0.95 },
    { source: "node-7", target: "node-5", label: "Arayüz İlhamı", strength: 0.85 },
    { source: "node-4", target: "node-8", label: "Günlük Rutin", strength: 0.5 },
    { source: "node-1", target: "node-2", label: "Odaklanma Ortamı", strength: 0.7 }
];

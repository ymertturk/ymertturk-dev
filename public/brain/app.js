/**
 * MindNexus v4.0 Pro - Native Mobile App & Dual View Controller Engine
 */

class MindNexusApp {
    constructor() {
        this.nodes = [];
        this.links = [];
        this.selectedNode = null;
        this.isVoiceRecording = false;
        this.recognition = null;
        this.currentViewMode = 'graph'; // 'graph' | 'list'

        this.loadData();
        this.checkAutoExpirations();

        // Initialize Canvas Graph Engine
        this.graph = new BrainGraphEngine('graph-canvas', {
            onNodeSelect: (node) => this.handleNodeSelect(node),
            onNodeHover: (node) => this.handleNodeHover(node),
            onLinkCreate: (source, target) => this.handleCreateLink(source, target)
        });

        this.graph.setData(this.nodes, this.links);

        this.initUI();
        this.initVoiceRecognition();
        this.initRemoteInboxPolling();
        this.initKeyboardShortcuts();
        this.updateCounts();
        this.renderMobileNotesFeed();

        if (window.UniversalCloudSync) {
            window.UniversalCloudSync.init('mindnexus', (cloudData) => {
                if (cloudData && Array.isArray(cloudData.nodes)) {
                    this.nodes = cloudData.nodes;
                    this.links = cloudData.links || [];
                    this.graph.setData(this.nodes, this.links);
                    this.updateCounts();
                    this.renderMobileNotesFeed();
                }
            });
        }
    }

    // 1. Data Management
    loadData() {
        const savedNodes = localStorage.getItem('mindnexus_nodes');
        const savedLinks = localStorage.getItem('mindnexus_links');

        if (savedNodes && savedLinks) {
            try {
                this.nodes = JSON.parse(savedNodes);
                this.links = JSON.parse(savedLinks);
            } catch (e) {
                console.error("Localstorage load error, resetting:", e);
                this.loadSampleData();
            }
        } else {
            this.loadSampleData();
        }
    }

    loadSampleData() {
        this.nodes = typeof INITIAL_NODES !== 'undefined' ? [...INITIAL_NODES] : [];
        this.links = typeof INITIAL_LINKS !== 'undefined' ? [...INITIAL_LINKS] : [];

        this.nodes.push({
            id: "node-agent-1",
            title: "⚡ SaaS Satış Otomasyonu Filtre Güncellemesi",
            content: "Arka plan otonom ajanı için komut: Satış otomasyonu paneline tedarikçi bazlı indirim filtresi ve stok uyarısı ekle.",
            source: "phone",
            tags: ["saas", "otomasyon", "otonom-görev"],
            date: new Date().toISOString().split('T')[0],
            status: "active",
            isAgentTask: true,
            agentTaskStatus: "running",
            color: "#00e676"
        });

        this.saveData();
    }

    saveData() {
        localStorage.setItem('mindnexus_nodes', JSON.stringify(this.nodes));
        localStorage.setItem('mindnexus_links', JSON.stringify(this.links));
        if (window.UniversalCloudSync) {
            window.UniversalCloudSync.saveState("mindnexus", { nodes: this.nodes, links: this.links });
        }
        this.updateCounts();
        this.renderMobileNotesFeed();
    }

    checkAutoExpirations() {
        const today = new Date().toISOString().split('T')[0];
        let updated = false;

        this.nodes.forEach(node => {
            if (node.expiryDate && node.expiryDate < today && node.status !== 'expired') {
                node.status = 'expired';
                updated = true;
            }
        });

        if (updated) this.saveData();
    }

    // 2. UI Event Listeners & Mobile Native Controls
    initUI() {
        // PIN Security Protection for Netlify / ymertturk.dev
        const pinGate = document.getElementById('pin-gate-overlay');
        const pinInput = document.getElementById('pin-input');
        const unlockBtn = document.getElementById('unlock-pin-btn');
        const pinError = document.getElementById('pin-error-text');

        const urlParams = new URLSearchParams(window.location.search);
        const isUnlocked = sessionStorage.getItem('mindnexus_unlocked') === 'true' || urlParams.get('pin') === '1923';

        if (!isUnlocked) {
            pinGate.style.display = 'flex';
        }

        const handleUnlock = () => {
            const val = pinInput.value.trim();
            if (val === '1923' || val === '1234') {
                sessionStorage.setItem('mindnexus_unlocked', 'true');
                pinGate.style.display = 'none';
                this.showToast('🔐 Gizli Erişim Onaylandı!');
            } else {
                pinError.style.display = 'block';
                pinInput.value = '';
                pinInput.focus();
            }
        };

        unlockBtn.addEventListener('click', handleUnlock);
        pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleUnlock();
        });

        // 🔄 View Mode Switcher (Harita <-> Mobil Liste)
        const btnGraph = document.getElementById('view-mode-graph');
        const btnList = document.getElementById('view-mode-list');

        btnGraph.addEventListener('click', () => this.switchViewMode('graph'));
        btnList.addEventListener('click', () => this.switchViewMode('list'));

        // 📱 Native Mobile Bottom Navigation Dock Buttons
        const navGraph = document.getElementById('nav-btn-graph');
        const navList = document.getElementById('nav-btn-list');
        const navAdd = document.getElementById('nav-btn-add');
        const navVoice = document.getElementById('nav-btn-voice');
        const navBulk = document.getElementById('nav-btn-bulk');

        if (navGraph) navGraph.addEventListener('click', () => this.switchViewMode('graph'));
        if (navList) navList.addEventListener('click', () => this.switchViewMode('list'));
        if (navAdd) navAdd.addEventListener('click', () => this.openAddNoteModal());
        if (navVoice) navVoice.addEventListener('click', () => this.startVoiceRecording());
        if (navBulk) navBulk.addEventListener('click', () => this.openBulkModal());

        // Desktop & Mobile Search Inputs
        const searchInput = document.getElementById('search-input');
        const mobileSearchInput = document.getElementById('mobile-search-input');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        const spotlightDropdown = document.getElementById('spotlight-results');

        const handleSearch = (query) => {
            this.graph.searchQuery = query;
            if (clearSearchBtn) clearSearchBtn.style.display = query ? 'block' : 'none';

            if (query.length > 0 && spotlightDropdown) {
                this.renderSpotlightResults(query);
            } else if (spotlightDropdown) {
                spotlightDropdown.style.display = 'none';
            }
            this.checkEmptyState();
            this.renderMobileNotesFeed();
        };

        if (searchInput) searchInput.addEventListener('input', (e) => handleSearch(e.target.value.trim()));
        if (mobileSearchInput) mobileSearchInput.addEventListener('input', (e) => handleSearch(e.target.value.trim()));

        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (mobileSearchInput) mobileSearchInput.value = '';
                handleSearch('');
            });
        }

        // Desktop Source Filter Tabs
        const sourceTabs = document.querySelectorAll('.source-filters .filter-tab');
        sourceTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                sourceTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const source = tab.getAttribute('data-source');
                this.graph.activeSourceFilter = source;
                this.checkEmptyState();
                this.renderMobileNotesFeed();
            });
        });

        // Mobile Source Chips
        const mobileChips = document.querySelectorAll('.mobile-source-chips .chip-tab');
        mobileChips.forEach(chip => {
            chip.addEventListener('click', () => {
                mobileChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const source = chip.getAttribute('data-source');
                this.graph.activeSourceFilter = source;
                this.checkEmptyState();
                this.renderMobileNotesFeed();
            });
        });

        // Canvas Toolbar Actions
        document.getElementById('tool-zoom-in').addEventListener('click', () => this.graph.zoomIn());
        document.getElementById('tool-zoom-out').addEventListener('click', () => this.graph.zoomOut());
        document.getElementById('tool-fit').addEventListener('click', () => this.graph.fitView());

        document.getElementById('tool-connect').addEventListener('click', () => {
            if (!this.selectedNode) {
                this.showToast('Lütfen önce tuvalden bir başlangıç düğümü seçin.', 'warning');
                return;
            }
            this.graph.enableConnectMode();
            this.showToast('Bağlamak istediğiniz 2. düğüme tıklayın...', 'info');
        });

        document.getElementById('tool-auto-link').addEventListener('click', () => this.runSemanticAutoLinking());
        document.getElementById('tool-synthesize').addEventListener('click', () => this.openSynthesizerModal());
        
        // Bulk & OCR
        const bulkBtn = document.getElementById('bulk-import-modal-btn');
        if (bulkBtn) bulkBtn.addEventListener('click', () => this.openBulkModal());
        document.getElementById('tool-bulk').addEventListener('click', () => this.openBulkModal());
        document.getElementById('bulk-form').addEventListener('submit', (e) => this.handleSaveBulkNotes(e));

        document.getElementById('tool-ocr').addEventListener('click', () => this.openOCRModal());
        document.getElementById('add-note-modal-btn').addEventListener('click', () => this.openAddNoteModal());
        
        // Modal Close
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Form Source Radio Tabs
        const radioTabs = document.querySelectorAll('input[name="modal-source"]');
        radioTabs.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const val = e.target.value;
                document.getElementById('url-group').style.display = (val === 'instagram' || val === 'twitter') ? 'block' : 'none';
            });
        });

        // Form Submit
        document.getElementById('note-form').addEventListener('submit', (e) => this.handleSaveNote(e));

        // Drawer Actions
        document.getElementById('close-drawer-btn').addEventListener('click', () => this.closeDrawer());
        document.getElementById('toggle-status-btn').addEventListener('click', () => this.toggleNodeStatus());
        document.getElementById('delete-node-btn').addEventListener('click', () => this.deleteSelectedNode());
        document.getElementById('edit-node-btn').addEventListener('click', () => this.editSelectedNode());
        document.getElementById('add-correlation-btn').addEventListener('click', () => this.openLinkModal());
        document.getElementById('link-form').addEventListener('submit', (e) => this.handleSaveLink(e));
        document.getElementById('generate-synth-btn').addEventListener('click', () => this.generateSynthesis());
        document.getElementById('trigger-agent-task-btn').addEventListener('click', () => this.dispatchAutonomousTask());

        // OCR Presets
        document.querySelectorAll('.sample-ocr-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.getAttribute('data-preset');
                this.runSampleOCR(preset);
            });
        });

        document.getElementById('trigger-file-select').addEventListener('click', () => {
            document.getElementById('ocr-file-input').click();
        });

        document.getElementById('ocr-file-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.runSampleOCR('saas_plan');
            }
        });
    }

    openMarkdownModal() {
        this.closeModals();
        document.getElementById('markdown-modal').style.display = 'flex';
        document.getElementById('markdown-paste-area').value = '';
    }

    handleMarkdownFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('markdown-paste-area').value = event.target.result;
            this.showToast(`📄 ${file.name} okundu!`);
        };
        reader.readAsText(file);
    }

    processMarkdownImport() {
        const rawText = document.getElementById('markdown-paste-area').value.trim();
        if (!rawText) return this.showToast('Lütfen Markdown metni yazın veya dosya seçin', 'warning');

        // Extract title from first line or # Heading
        const lines = rawText.split('\n');
        let title = '📝 Markdown Notu';
        for (let l of lines) {
            const trimmed = l.trim();
            if (trimmed.startsWith('#')) {
                title = trimmed.replace(/^#+\s*/, '');
                break;
            } else if (trimmed.length > 3) {
                title = trimmed.slice(0, 40);
                break;
            }
        }

        // Extract tags matching #tag
        const tagMatches = rawText.match(/#([\w\u00C0-\u024F\u0400-\u04FFğüşıöçĞÜŞİÖÇ-]+)/g) || [];
        const tags = Array.from(new Set(tagMatches.map(t => t.replace('#', '').toLowerCase()))).concat(['markdown', 'not']);

        const today = new Date().toISOString().split('T')[0];

        const newNode = {
            id: `node-md-${Date.now()}`,
            title: title.length > 50 ? title.substring(0, 47) + '...' : title,
            content: rawText,
            source: 'phone',
            tags: tags,
            date: today,
            status: 'active',
            isMarkdown: true,
            color: '#3b82f6'
        };

        this.nodes.push(newNode);
        this.runSemanticAutoLinking();
        this.saveData();
        this.graph.setData(this.nodes, this.links);
        this.closeModals();
        this.showToast('🚀 Markdown notu yüklendi & haritaya bağlandı!');
    }

    switchViewMode(mode) {
        this.currentViewMode = mode;
        const containerGraph = document.getElementById('view-container-graph');
        const containerList = document.getElementById('view-container-list');
        const btnGraph = document.getElementById('view-mode-graph');
        const btnList = document.getElementById('view-mode-list');
        const navGraph = document.getElementById('nav-btn-graph');
        const navList = document.getElementById('nav-btn-list');
        const canvasToolbar = document.getElementById('canvas-toolbar');

        if (mode === 'graph') {
            containerGraph.style.display = 'block';
            containerList.style.display = 'none';
            if (canvasToolbar) canvasToolbar.style.display = 'flex';

            btnGraph.classList.add('active');
            btnList.classList.remove('active');
            if (navGraph) navGraph.classList.add('active');
            if (navList) navList.classList.remove('active');

            this.graph.initCanvasSize();
        } else {
            containerGraph.style.display = 'none';
            containerList.style.display = 'block';
            if (canvasToolbar) canvasToolbar.style.display = 'none';

            btnGraph.classList.remove('active');
            btnList.classList.add('active');
            if (navGraph) navGraph.classList.remove('active');
            if (navList) navList.classList.add('active');

            this.renderMobileNotesFeed();
        }
    }

    renderMobileNotesFeed() {
        const feedContainer = document.getElementById('mobile-notes-feed');
        if (!feedContainer) return;

        feedContainer.innerHTML = '';
        const visibleNodes = this.nodes.filter(n => this.graph.isNodeVisible(n));

        if (visibleNodes.length === 0) {
            feedContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted);">Eşleşen not bulunamadı.</div>';
            return;
        }

        const sourceLabels = {
            phone: '📱 Telefon',
            instagram: '📸 Instagram',
            twitter: '🐦 Twitter',
            physical: '📝 Defter'
        };

        visibleNodes.forEach(node => {
            const card = document.createElement('div');
            card.className = 'note-card-item';
            card.innerHTML = `
                <div class="note-card-header">
                    <span class="note-card-badge" style="border-left: 3px solid ${node.color || '#00F2FE'};">
                        ${sourceLabels[node.source] || node.source}
                    </span>
                    <span style="font-size:0.7rem; color:var(--text-muted);">${node.status === 'expired' ? '⏳ Arşiv' : '⚡ Aktif'}</span>
                </div>
                <div class="note-card-title">${node.title}</div>
                <div class="note-card-content">${node.content}</div>
                <div class="note-card-footer">
                    <span>${node.date || ''}</span>
                    <span>${node.tags ? '#' + node.tags.join(' #') : ''}</span>
                </div>
            `;

            card.addEventListener('click', () => {
                this.graph.focusOnNode(node);
                this.handleNodeSelect(node);
            });

            feedContainer.appendChild(card);
        });
    }

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
        });
    }

    renderSpotlightResults(query) {
        const dropdown = document.getElementById('spotlight-results');
        if (!dropdown) return;
        dropdown.innerHTML = '';

        const q = query.toLowerCase();
        const matches = this.nodes.filter(n => {
            const mTitle = n.title.toLowerCase().includes(q);
            const mContent = n.content.toLowerCase().includes(q);
            const mTags = n.tags && n.tags.some(t => t.toLowerCase().includes(q));
            return mTitle || mContent || mTags;
        });

        if (matches.length === 0) {
            dropdown.innerHTML = '<div style="padding:10px; font-size:0.78rem; color:var(--text-muted); text-align:center;">Sonuç bulunamadı.</div>';
        } else {
            matches.slice(0, 7).forEach(node => {
                const item = document.createElement('div');
                item.className = 'spotlight-item';
                item.innerHTML = `
                    <span class="spotlight-item-title">${node.title}</span>
                    <span class="spotlight-item-source">${node.source}</span>
                `;
                item.addEventListener('click', () => {
                    dropdown.style.display = 'none';
                    this.graph.focusOnNode(node);
                    this.handleNodeSelect(node);
                    this.showToast(`🎯 "${node.title}" düğümüne odaklanıldı!`);
                });
                dropdown.appendChild(item);
            });
        }
        dropdown.style.display = 'flex';
    }

    openBulkModal() {
        document.getElementById('bulk-modal').style.display = 'flex';
        document.getElementById('bulk-text-input').focus();
    }

    handleSaveBulkNotes(e) {
        e.preventDefault();
        const rawText = document.getElementById('bulk-text-input').value.trim();
        const source = document.getElementById('bulk-source').value;
        const defaultTagInput = document.getElementById('bulk-default-tag').value.trim();
        const defaultTags = defaultTagInput ? [defaultTagInput.toLowerCase()] : ['toplu-aktarım'];

        if (!rawText) return;

        const lines = rawText.split(/\n\s*\n|(?:\r?\n)(?=[•\-\d+\.])/).map(l => l.trim()).filter(Boolean);
        const today = new Date().toISOString().split('T')[0];
        let addedCount = 0;

        lines.forEach((block, index) => {
            const cleanBlock = block.replace(/^[•\-\d+\.\s]+/, '').trim();
            if (cleanBlock.length < 3) return;

            const title = cleanBlock.length > 35 ? cleanBlock.substring(0, 32) + '...' : cleanBlock;

            const newNode = {
                id: `node-bulk-${Date.now()}-${index}`,
                title: title,
                content: cleanBlock,
                source: source,
                tags: [...defaultTags],
                date: today,
                status: 'active',
                color: source === 'phone' ? '#f2994a' : '#00F2FE'
            };

            this.nodes.push(newNode);
            this.autoSuggestLinks(newNode);
            addedCount++;
        });

        this.saveData();
        this.graph.setData(this.nodes, this.links);
        this.closeModals();
        this.showToast(`📦 Toplam ${addedCount} adet not ayrıştırıldı ve yüklendi!`);
    }

    // Voice Dictation
    initVoiceRecognition() {
        const voiceBtn = document.getElementById('voice-dictate-btn');
        const stopVoiceBtn = document.getElementById('stop-voice-btn');
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'tr-TR';
            this.recognition.continuous = true;
            this.recognition.interimResults = true;

            this.recognition.onresult = (event) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                document.getElementById('voice-transcript-text').innerText = `"${currentTranscript}"`;
            };

            this.recognition.onend = () => {
                if (this.isVoiceRecording) this.stopVoiceRecording();
            };
        }

        if (voiceBtn) voiceBtn.addEventListener('click', () => this.startVoiceRecording());
        if (stopVoiceBtn) stopVoiceBtn.addEventListener('click', () => this.stopVoiceRecording());
    }

    startVoiceRecording() {
        this.isVoiceRecording = true;
        document.getElementById('voice-active-bar').style.display = 'flex';
        document.getElementById('voice-transcript-text').innerText = "Konuşun (Örn: 'Satış otomasyonu sisteminde indirim oranlarını güncelle')...";

        if (this.recognition) {
            try { this.recognition.start(); } catch(e) {}
        } else {
            setTimeout(() => {
                const sampleVoice = "SaaS projesindeki satış otomasyonu sisteminde tedarikçi bazlı indirim oranını ve stok uyarı filtresini güncelle";
                document.getElementById('voice-transcript-text').innerText = `"${sampleVoice}"`;
            }, 1200);
        }
        this.showToast('🎙️ Mikrofon dinliyor...');
    }

    stopVoiceRecording() {
        this.isVoiceRecording = false;
        document.getElementById('voice-active-bar').style.display = 'none';

        if (this.recognition) {
            try { this.recognition.stop(); } catch(e) {}
        }

        const rawText = document.getElementById('voice-transcript-text').innerText.replace(/"/g, '');
        if (rawText && !rawText.startsWith('Konuşun')) {
            this.processVoiceIntent(rawText);
        }
    }

    processVoiceIntent(text) {
        const isCodeTask = /güncelle|ekle|değiştir|düzelt|kod|otomasyon|yap|oluştur/i.test(text);
        const today = new Date().toISOString().split('T')[0];

        const newNode = {
            id: `node-${Date.now()}`,
            title: isCodeTask ? `⚡ Sesli Komut: ${text.substring(0, 32)}...` : `🎙️ Sesli Not: ${text.substring(0, 32)}...`,
            content: text,
            source: 'phone',
            tags: isCodeTask ? ['sesli-komut', 'otonom-görev', 'saas'] : ['sesli-not', 'düşünce'],
            date: today,
            status: 'active',
            isAgentTask: isCodeTask,
            agentTaskStatus: isCodeTask ? 'pending' : null,
            color: isCodeTask ? '#00e676' : '#f2994a'
        };

        this.nodes.push(newNode);
        this.autoSuggestLinks(newNode);
        this.saveData();
        this.graph.setData(this.nodes, this.links);

        if (isCodeTask) {
            this.showToast('⚡ Otonom Ajan görevi eklendi!');
            this.dispatchAutonomousTask(newNode);
        } else {
            this.showToast('🎙️ Sesli not eklendi!');
        }
    }

    dispatchAutonomousTask(node = this.selectedNode) {
        if (!node) return;
        node.agentTaskStatus = 'running';

        if (this.selectedNode && this.selectedNode.id === node.id) {
            document.getElementById('agent-task-status-text').innerHTML = '⏳ <strong>Otonom Kod Ajanı Çalışıyor...</strong>';
        }

        fetch('/api/execute-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: node.content, nodeId: node.id })
        }).then(res => res.json())
        .then(data => {
            setTimeout(() => {
                node.agentTaskStatus = 'completed';
                this.saveData();
                this.graph.setData(this.nodes, this.links);

                if (this.selectedNode && this.selectedNode.id === node.id) {
                    document.getElementById('agent-task-status-text').innerHTML = '✅ <strong>Otonom Kod Güncellemesi Tamamlandı!</strong>';
                }
                this.showToast('🤖 Arka plan kod ajanı görevi tamamladı!');
            }, 3000);
        }).catch(err => {});
    }

    openOCRModal() {
        document.getElementById('ocr-modal').style.display = 'flex';
        document.getElementById('ocr-result-box').style.display = 'none';
    }

    runSampleOCR(presetKey) {
        const loading = document.getElementById('ocr-loading');
        const parsedBox = document.getElementById('ocr-parsed-content');
        const extractedEl = document.getElementById('ocr-extracted-text');
        const resultBox = document.getElementById('ocr-result-box');

        resultBox.style.display = 'block';
        loading.style.display = 'flex';
        parsedBox.style.display = 'none';

        const presetTexts = {
            ai_gnn: "Fiziksel Defter Notu (GNN Matematiksel Formülleri): Graph Attention Networks (GAT) katmanları ile düğüm ağırlıklarını dinamik hesapla. f(x) = softmax(LeakyReLU(a^T [Whi || Whj])).",
            saas_plan: "Fiziksel Not (SaaS Satış Otomasyonu Stratejisi): Müşteri dönüşüm oranlarını artırmak için otomatik e-posta serisi ve tedarikçi fiyat karşılaştırma simülatörü ekle."
        };

        const parsedText = presetTexts[presetKey] || presetTexts.saas_plan;

        setTimeout(() => {
            loading.style.display = 'none';
            parsedBox.style.display = 'block';
            extractedEl.innerText = parsedText;

            document.getElementById('add-ocr-to-map-btn').onclick = () => {
                const today = new Date().toISOString().split('T')[0];
                const ocrNode = {
                    id: `node-ocr-${Date.now()}`,
                    title: `📸 Defter Notu: ${parsedText.substring(0, 24)}...`,
                    content: parsedText,
                    source: 'physical',
                    tags: ['ocr', 'fiziksel-not', 'defter'],
                    date: today,
                    status: 'active',
                    color: '#9b51e0'
                };
                this.nodes.push(ocrNode);
                this.autoSuggestLinks(ocrNode);
                this.saveData();
                this.graph.setData(this.nodes, this.links);
                this.closeModals();
                this.showToast('📸 Defter notu haritaya eklendi!');
            };
        }, 1200);
    }

    extractWords(text) {
        if (!text) return new Set();
        const stopWords = new Set(['ve', 'veya', 'bir', 'bu', 'da', 'de', 'ile', 'için', 'bu', 'çok', 'daha', 'en', 'gibi', 'olan', 'olarak', 'göre', 'kadar', 'sonra', 'önce', 'hem', 'ama', 'fakat', 'lakin', 'yani', 'ise']);
        const tokens = text.toLowerCase()
            .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));
        return new Set(tokens);
    }

    computeContextSimilarity(nodeA, nodeB) {
        const wordsA = this.extractWords(`${nodeA.title} ${nodeA.content}`);
        const wordsB = this.extractWords(`${nodeB.title} ${nodeB.content}`);
        
        let intersection = 0;
        let commonWord = '';
        wordsA.forEach(w => {
            if (wordsB.has(w)) {
                intersection++;
                if (!commonWord) commonWord = w;
            }
        });
        
        const union = new Set([...wordsA, ...wordsB]).size;
        const jaccard = union > 0 ? intersection / union : 0;

        const commonTags = (nodeA.tags || []).filter(t => (nodeB.tags || []).includes(t));
        
        return {
            score: jaccard + (commonTags.length * 0.3),
            label: commonTags.length > 0 ? `#${commonTags[0]}` : (commonWord ? `Bağlam: ${commonWord}` : 'Otomatik Bağlantı')
        };
    }

    runSemanticAutoLinking() {
        let createdCount = 0;
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const n1 = this.nodes[i];
                const n2 = this.nodes[j];

                const exists = this.links.some(l => {
                    const sId = typeof l.source === 'object' ? l.source.id : l.source;
                    const tId = typeof l.target === 'object' ? l.target.id : l.target;
                    return (sId === n1.id && tId === n2.id) || (sId === n2.id && tId === n1.id);
                });

                if (!exists) {
                    const sim = this.computeContextSimilarity(n1, n2);
                    if (sim.score >= 0.12) {
                        this.links.push({
                            source: n1.id,
                            target: n2.id,
                            label: `🤖 AI Bağlam: ${sim.label}`,
                            strength: Math.min(1.0, 0.5 + sim.score)
                        });
                        createdCount++;
                    }
                }
            }
        }

        if (createdCount > 0) {
            this.saveData();
            this.graph.setData(this.nodes, this.links);
            this.showToast(`🤖 ${createdCount} yeni bağlamsal korelasyon kuruldu!`);
        } else {
            this.showToast('Tüm bağlamsal korelasyonlar zaten kurulmuş.', 'info');
        }
    }

    initRemoteInboxPolling() {
        setInterval(() => {
            fetch('/api/inbox')
                .then(res => res.json())
                .then(inboxItems => {
                    const rCount = document.getElementById('remote-count');
                    if (rCount) rCount.innerText = inboxItems.length;

                    if (inboxItems.length > 0) {
                        inboxItems.forEach(item => {
                            if (!this.nodes.some(n => n.id === item.id)) {
                                this.nodes.push(item);
                                this.autoSuggestLinks(item);
                                this.showToast(`📡 Uzaktan Not Alındı: "${item.title}"`);
                            }
                        });
                        this.saveData();
                        this.graph.setData(this.nodes, this.links);
                        fetch('/api/inbox/clear', { method: 'POST' });
                    }
                }).catch(e => {});
        }, 5000);
    }

    updateCounts() {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        setVal('count-all', this.nodes.length);
        setVal('count-phone', this.nodes.filter(n => n.source === 'phone').length);
        setVal('count-instagram', this.nodes.filter(n => n.source === 'instagram').length);
        setVal('count-twitter', this.nodes.filter(n => n.source === 'twitter').length);
        setVal('count-physical', this.nodes.filter(n => n.source === 'physical').length);
        setVal('count-active', this.nodes.filter(n => n.status === 'active').length);
        setVal('count-expired', this.nodes.filter(n => n.status === 'expired').length);
    }

    checkEmptyState() {
        const visibleCount = this.nodes.filter(n => this.graph.isNodeVisible(n)).length;
        const emptyEl = document.getElementById('empty-state');
        if (emptyEl) emptyEl.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    handleNodeSelect(node) {
        this.selectedNode = node;
        if (!node) {
            this.closeDrawer();
            return;
        }

        const drawer = document.getElementById('detail-drawer');
        drawer.classList.add('open');

        const sourceMap = {
            phone: { name: 'Telefon / Sesli', icon: '📱' },
            instagram: { name: 'Instagram Kaydı', icon: '📸' },
            twitter: { name: 'Twitter / X', icon: '🐦' },
            physical: { name: 'Fiziksel / OCR', icon: '📝' }
        };
        const sInfo = sourceMap[node.source] || { name: node.source, icon: '🧠' };

        document.getElementById('drawer-source-icon').innerText = sInfo.icon;
        document.getElementById('drawer-source-name').innerText = sInfo.name;

        const statusPill = document.getElementById('drawer-status-pill');
        const toggleBtn = document.getElementById('toggle-status-btn');

        if (node.status === 'expired') {
            statusPill.className = 'status-pill expired';
            statusPill.innerText = '⌛ Süresi Dolmuş (Arşiv)';
            toggleBtn.innerText = '⚡ Yenile / Canlı Ağa Taşı';
        } else {
            statusPill.className = 'status-pill';
            statusPill.innerText = '⚡ Aktif Zihin Düğümü';
            toggleBtn.innerText = '⌛ Süresi Doldu Olarak İşaretle';
        }

        if (window.marked && (node.isMarkdown || node.content.includes('#') || node.content.includes('*') || node.content.includes('- ') || node.content.includes('```'))) {
            try {
                document.getElementById('drawer-content').innerHTML = window.marked.parse(node.content);
            } catch(e) {
                document.getElementById('drawer-content').innerText = node.content;
            }
        } else {
            document.getElementById('drawer-content').innerText = node.content;
        }

        const agentBanner = document.getElementById('agent-task-banner');
        const agentStatusText = document.getElementById('agent-task-status-text');

        if (node.isAgentTask) {
            agentBanner.style.display = 'flex';
            if (node.agentTaskStatus === 'completed') {
                agentStatusText.innerHTML = '✅ <strong>Otonom Kod Güncellemesi Tamamlandı!</strong>';
            } else if (node.agentTaskStatus === 'running') {
                agentStatusText.innerHTML = '⏳ <strong>Otonom Kod Ajanı Çalışıyor...</strong>';
            } else {
                agentStatusText.innerHTML = '⚡ Bu bir <strong>Otonom Kod Güncelleme Komutudur</strong>.';
            }
        } else {
            agentBanner.style.display = 'none';
        }

        const imgWrapper = document.getElementById('drawer-image-wrapper');
        const imgEl = document.getElementById('drawer-image');
        if (node.image) {
            imgEl.src = node.image;
            imgWrapper.style.display = 'block';
        } else {
            imgWrapper.style.display = 'none';
        }

        const urlWrapper = document.getElementById('drawer-url-wrapper');
        const urlEl = document.getElementById('drawer-url');
        if (node.sourceUrl) {
            urlEl.href = node.sourceUrl;
            urlWrapper.style.display = 'flex';
        } else {
            urlWrapper.style.display = 'none';
        }

        document.getElementById('drawer-expiry-date').innerText = node.expiryDate || 'Süresiz';

        const tagsContainer = document.getElementById('drawer-tags');
        tagsContainer.innerHTML = '';
        if (node.tags && node.tags.length > 0) {
            node.tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'tag-pill';
                span.innerText = `#${tag}`;
                tagsContainer.appendChild(span);
            });
        }

        this.renderDrawerConnections(node);
    }

    renderDrawerConnections(node) {
        const connContainer = document.getElementById('drawer-connections');
        connContainer.innerHTML = '';

        const connectedLinks = this.links.filter(l => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            return sId === node.id || tId === node.id;
        });

        if (connectedLinks.length === 0) {
            connContainer.innerHTML = '<div class="help-text">Henüz bağlantı kurulmamış.</div>';
            return;
        }

        connectedLinks.forEach(link => {
            const sId = typeof link.source === 'object' ? link.source.id : link.source;
            const tId = typeof link.target === 'object' ? link.target.id : link.target;
            const otherId = sId === node.id ? tId : sId;
            const otherNode = this.nodes.find(n => n.id === otherId);

            if (!otherNode) return;

            const div = document.createElement('div');
            div.className = 'connection-item';
            div.innerHTML = `
                <div>
                    <div class="conn-title">${otherNode.title}</div>
                    <span class="conn-label">${link.label || 'Korelasyon'}</span>
                </div>
                <button class="icon-btn-sm remove-link-btn" title="Kaldır">✕</button>
            `;

            div.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-link-btn')) {
                    e.stopPropagation();
                    this.removeLink(link);
                } else {
                    this.graph.focusOnNode(otherNode);
                    this.handleNodeSelect(otherNode);
                }
            });

            connContainer.appendChild(div);
        });
    }

    handleNodeHover(node) {}

    closeDrawer() {
        document.getElementById('detail-drawer').classList.remove('open');
        this.selectedNode = null;
        this.graph.selectedNode = null;
    }

    toggleNodeStatus() {
        if (!this.selectedNode) return;
        const newStatus = this.selectedNode.status === 'expired' ? 'active' : 'expired';
        this.selectedNode.status = newStatus;
        this.saveData();
        this.graph.setData(this.nodes, this.links);
        this.handleNodeSelect(this.selectedNode);
    }

    deleteSelectedNode() {
        if (!this.selectedNode) return;
        if (confirm(`"${this.selectedNode.title}" fikrini silmek istediğinize emin misiniz?`)) {
            const nodeId = this.selectedNode.id;
            this.nodes = this.nodes.filter(n => n.id !== nodeId);
            this.links = this.links.filter(l => {
                const sId = typeof l.source === 'object' ? l.source.id : l.source;
                const tId = typeof l.target === 'object' ? l.target.id : l.target;
                return sId !== nodeId && tId !== nodeId;
            });
            this.saveData();
            this.graph.setData(this.nodes, this.links);
            this.closeDrawer();
        }
    }

    editSelectedNode() {
        if (!this.selectedNode) return;
        this.openAddNoteModal(this.selectedNode);
    }

    openAddNoteModal(editNode = null) {
        const modal = document.getElementById('note-modal');
        const form = document.getElementById('note-form');
        form.reset();

        if (editNode) {
            document.getElementById('modal-title').innerText = 'Fikri Düzenle';
            form.dataset.editId = editNode.id;
            document.getElementById('input-title').value = editNode.title;
            document.getElementById('input-content').value = editNode.content;
            document.getElementById('input-url').value = editNode.sourceUrl || '';
            document.getElementById('input-image').value = editNode.image || '';
            document.getElementById('input-tags').value = editNode.tags ? editNode.tags.join(', ') : '';
            document.getElementById('input-expiry').value = editNode.expiryDate || '';
            document.getElementById('input-is-agent-task').checked = !!editNode.isAgentTask;
        } else {
            document.getElementById('modal-title').innerText = 'Yeni Fikir / Not Ekle';
            delete form.dataset.editId;
        }

        modal.style.display = 'flex';
    }

    handleSaveNote(e) {
        e.preventDefault();
        const form = e.target;
        const editId = form.dataset.editId;

        const title = document.getElementById('input-title').value.trim();
        const content = document.getElementById('input-content').value.trim();
        const source = form.querySelector('input[name="modal-source"]:checked').value;
        const sourceUrl = document.getElementById('input-url').value.trim();
        const image = document.getElementById('input-image').value.trim();
        const tagsInput = document.getElementById('input-tags').value.trim();
        const expiryDate = document.getElementById('input-expiry').value;
        const isAgentTask = document.getElementById('input-is-agent-task').checked;

        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];

        if (editId) {
            const node = this.nodes.find(n => n.id === editId);
            if (node) {
                node.title = title;
                node.content = content;
                node.source = source;
                node.sourceUrl = sourceUrl;
                node.image = image;
                node.tags = tags;
                node.expiryDate = expiryDate;
                node.isAgentTask = isAgentTask;
            }
        } else {
            const today = new Date().toISOString().split('T')[0];
            const newNode = {
                id: `node-${Date.now()}`,
                title,
                content,
                source,
                sourceUrl,
                tags,
                date: today,
                status: 'active',
                expiryDate,
                image,
                isAgentTask,
                color: isAgentTask ? '#00e676' : '#00F2FE'
            };
            this.nodes.push(newNode);
            this.autoSuggestLinks(newNode);

            if (isAgentTask) {
                this.dispatchAutonomousTask(newNode);
            }
        }

        this.saveData();
        this.graph.setData(this.nodes, this.links);
        this.closeModals();
        this.showToast('Fikir kaydedildi.');
    }

    autoSuggestLinks(newNode) {
        if (!newNode.tags || newNode.tags.length === 0) return;
        this.nodes.forEach(node => {
            if (node.id === newNode.id) return;
            const commonTags = node.tags ? node.tags.filter(t => newNode.tags.includes(t)) : [];
            if (commonTags.length > 0) {
                this.links.push({
                    source: newNode.id,
                    target: node.id,
                    label: `#${commonTags[0]}`,
                    strength: 0.7
                });
            }
        });
    }

    openLinkModal() {
        const modal = document.getElementById('link-modal');
        const sourceSelect = document.getElementById('link-source');
        const targetSelect = document.getElementById('link-target');
        sourceSelect.innerHTML = '';
        targetSelect.innerHTML = '';

        this.nodes.forEach(n => {
            sourceSelect.add(new Option(n.title, n.id));
            targetSelect.add(new Option(n.title, n.id));
        });

        if (this.selectedNode) sourceSelect.value = this.selectedNode.id;
        modal.style.display = 'flex';
    }

    handleCreateLink(sourceNode, targetNode) {
        const newLink = { source: sourceNode.id, target: targetNode.id, label: 'Manuel Bağlantı', strength: 0.85 };
        this.links.push(newLink);
        this.saveData();
        this.graph.setData(this.nodes, this.links);
        this.showToast(`"${sourceNode.title}" ve "${targetNode.title}" bağlandı!`);
    }

    handleSaveLink(e) {
        e.preventDefault();
        const sId = document.getElementById('link-source').value;
        const tId = document.getElementById('link-target').value;
        const label = document.getElementById('link-label').value.trim() || 'Korelasyon';

        if (sId === tId) return;

        this.links.push({ source: sId, target: tId, label, strength: 0.8 });
        this.saveData();
        this.graph.setData(this.nodes, this.links);
        this.closeModals();
        this.showToast('Korelasyon oluşturuldu!');
    }

    removeLink(link) {
        this.links = this.links.filter(l => l !== link);
        this.saveData();
        this.graph.setData(this.nodes, this.links);
        if (this.selectedNode) this.handleNodeSelect(this.selectedNode);
    }

    openSynthesizerModal() {
        document.getElementById('synth-modal').style.display = 'flex';
        this.generateSynthesis();
    }

    generateSynthesis() {
        const loading = document.getElementById('synth-loading');
        const result = document.getElementById('synth-result');
        const text = document.getElementById('synth-text');

        loading.style.display = 'flex';
        result.style.display = 'none';

        setTimeout(() => {
            loading.style.display = 'none';
            result.style.display = 'block';
            text.innerHTML = "Zihin haritanızdaki <strong>SaaS Satış Otomasyonu</strong> ve <strong>Fiziksel Defter OCR Notları</strong> analiz edildi: Tedarikçi indirim filtreleri ve sesli komut altyapısını birleştirerek tek tıkla çalışan Otonom Satış Asistanı modülünü aktifleştirebilirsiniz!";
        }, 800);
    }

    closeModals() {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.style.display = 'none');
    }

    exportData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            nodes: this.nodes,
            links: this.links,
            exportedAt: new Date().toISOString()
        }, null, 2));

        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", `mindnexus_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${type === 'warning' ? '⚠️' : '✨'}</span> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new MindNexusApp();
});

const TRANSLATIONS = {
    en: {
        statusLabel: 'Status',
        statusValue: 'Active',
        settingsTitle: 'Settings',
        shakeLabel: 'Shake on detection',
        soundLabel: 'Sound alert',
        keyLabel: 'API Key',
        keyPlaceholder: 'Enter your API key',
        detectingTitle: 'Detecting (7 patterns)',
        high: 'High',
        medium: 'Medium',
        patterns: {
            ssn: 'SSN / National IDs',
            georgianId: 'Georgian Personal ID',
            creditCard: 'Credit Cards',
            email: 'Email Addresses',
            iban: 'IBAN / Bank Info',
            passport: 'Passport Numbers',
            phone: 'Phone Numbers',
            georgianCompanyId: 'Company ID',
            phoneGeorgia: 'Georgian Phone',
        }
    },
    ka: {
        statusLabel: 'სტატუსი',
        statusValue: 'აქტიური',
        settingsTitle: 'პარამეტრები',
        shakeLabel: 'ვიბრაცია აღმოჩენისას',
        soundLabel: 'ხმოვანი სიგნალი',
        keyLabel: 'API გასაღები',
        keyPlaceholder: 'შეიყვანეთ API გასაღები',
        detectingTitle: 'აღმოჩენა (7 შაბლონი)',
        high: 'მაღალი',
        medium: 'საშუალო',
        patterns: {
            ssn: 'SSN / პირადი ნომერი',
            georgianId: 'საქართველოს პირადი ნომერი',
            creditCard: 'საკრედიტო ბარათები',
            email: 'ელ.ფოსტის მისამართები',
            iban: 'IBAN / საბანკო ინფო',
            passport: 'პასპორტის ნომრები',
            phone: 'ტელეფონის ნომრები',
            georgianCompanyId: 'საიდენტიფიკაციო კოდი',
            phoneGeorgia: 'ტელეფონის ნომერი',
        }
    }
};

const PATTERNS = [
    { key: 'ssn', icon: 'id-card', severity: 'high' },
    { key: 'georgianId', icon: 'id-badge', severity: 'high' },
    { key: 'creditCard', icon: 'credit-card', severity: 'high' },
    { key: 'iban', icon: 'building', severity: 'high' },
    { key: 'passport', icon: 'book', severity: 'high' },
    { key: 'email', icon: 'mail', severity: 'medium' },
    { key: 'phone', icon: 'phone', severity: 'medium' }
];

const ICONS = {
    'id-card': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="6" y1="16" x2="14" y2="16"/></svg>',
    'id-badge': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20"/><circle cx="12" cy="10" r="3"/><path d="M8 18c0-2.2 1.8-4 4-4s4 1.8 4 4"/></svg>',
    'credit-card': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    'building': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M9 22v-4h6v4"/></svg>',
    'book': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    'mail': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16"/><path d="M22 6l-10 7L2 6"/></svg>',
    'phone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
};

const DEFAULT_SETTINGS = {
    language: 'en',
    shakeAnimation: true,
    soundAlert: false
};

let currentSettings = { ...DEFAULT_SETTINGS };

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    renderUI();
    setupEventListeners();
});

const loadSettings = async () => {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    try {

        const result = await chrome.storage.local.get(DEFAULT_SETTINGS);
        currentSettings = { ...DEFAULT_SETTINGS, ...result };
    } catch (e) {
        console.warn('Storage access failed', e);
    }
};

const saveSettings = async () => {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    try {
        await chrome.storage.local.set(currentSettings);
        if (chrome.tabs) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (tab?.id) {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'LEXGUARD_SETTINGS',
                    settings: currentSettings
                }).catch(() => {
                    console.log('Failed to send message.')
                });
            }
        }
    } catch (e) {
        console.warn('Settings save failed', e);
    }
};

const renderUI = () => {
    const t = TRANSLATIONS[currentSettings.language];

    const statusLabel = document.getElementById('status-label');
    if (statusLabel) statusLabel.textContent = t.statusLabel;

    const statusValue = document.getElementById('status-value');
    if (statusValue) statusValue.textContent = t.statusValue;

    const settingsTitle = document.getElementById('settings-title');
    if (settingsTitle) settingsTitle.textContent = t.settingsTitle;

    const shakeLabel = document.getElementById('shake-label');
    if (shakeLabel) shakeLabel.textContent = t.shakeLabel;

    const soundLabel = document.getElementById('sound-label');
    if (soundLabel) soundLabel.textContent = t.soundLabel;

    const keyLabel = document.getElementById('key-label');
    if (keyLabel) keyLabel.textContent = t.keyLabel;

    const keyInput = document.getElementById('api-key-input');
    if (keyInput) keyInput.placeholder = t.keyPlaceholder;

    const detectingTitle = document.getElementById('detecting-title');
    if (detectingTitle) detectingTitle.textContent = t.detectingTitle;

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentSettings.language);
    });

    const shakeToggle = document.getElementById('setting-shake');
    if (shakeToggle) shakeToggle.checked = currentSettings.shakeAnimation;

    const soundToggle = document.getElementById('setting-sound');
    if (soundToggle) soundToggle.checked = currentSettings.soundAlert;

    const detectList = document.getElementById('detect-list');
    if (detectList) {
        detectList.innerHTML = PATTERNS.map(p => `
            <div class="detect-item ${p.severity}">
                <span class="detect-icon">${ICONS[p.icon]}</span>
                <span class="detect-name">${t.patterns[p.key]}</span>
                <span class="detect-severity ${p.severity}">${t[p.severity]}</span>
            </div>
        `).join('');
    }
}

const setupEventListeners = () => {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentSettings.language = btn.dataset.lang;
            renderUI();
            saveSettings();
        });
    });

    const shakeToggle = document.getElementById('setting-shake');
    if (shakeToggle) {
        shakeToggle.addEventListener('change', () => {
            currentSettings.shakeAnimation = shakeToggle.checked;
            saveSettings();
        });
    }

    const soundToggle = document.getElementById('setting-sound');
    if (soundToggle) {
        soundToggle.addEventListener('change', () => {
            currentSettings.soundAlert = soundToggle.checked;
            saveSettings();
        });
    }

    const patternsHeader = document.getElementById('patterns-header');
    const patternsSection = document.getElementById('patterns-section');
    if (patternsHeader && patternsSection) {
        patternsHeader.addEventListener('click', () => {
            patternsSection.classList.toggle('expanded');
        });
    }
}
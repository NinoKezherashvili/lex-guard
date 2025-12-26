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
            phone: 'Phone Numbers'
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
            phone: 'ტელეფონის ნომრები'
        }
    }
};

const PATTERNS = [
    { key: 'ssn', icon: '🔐', severity: 'high' },
    { key: 'georgianId', icon: '🇬🇪', severity: 'high' },
    { key: 'creditCard', icon: '💳', severity: 'high' },
    { key: 'iban', icon: '🏦', severity: 'high' },
    { key: 'passport', icon: '🛂', severity: 'high' },
    { key: 'email', icon: '📧', severity: 'medium' },
    { key: 'phone', icon: '📱', severity: 'medium' }
];

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
                <span class="detect-icon">${p.icon}</span>
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

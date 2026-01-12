const TRANSLATIONS = {
    en: {
        statusLabel: 'Status',
        statusValue: 'Active',
        settingsTitle: 'Settings',
        shakeLabel: 'Shake on detection',
        keyLabel: 'API Key',
        keyPlaceholder: 'Enter your API key',
        detectingTitle: 'Detecting',
        detectingPatternsLabel: 'Patterns',
        high: 'High',
        medium: 'Medium',
        patterns: {
            website: 'Website URLs',
            email: 'Email Addresses',
            phone: 'Phone Numbers',
            iban: 'IBAN',
            georgianId: 'Personal ID',
            georgianCompanyId: 'Company ID',
        }
    },
    ka: {
        statusLabel: 'სტატუსი',
        statusValue: 'აქტიური',
        settingsTitle: 'პარამეტრები',
        shakeLabel: 'ვიბრაცია აღმოჩენისას',
        keyLabel: 'API გასაღები',
        keyPlaceholder: 'შეიყვანეთ API გასაღები',
        detectingTitle: 'აღმოჩენა',
        detectingPatternsLabel: 'შაბლონები',
        high: 'მაღალი',
        medium: 'საშუალო',
        patterns: {
            website: 'ვებსაიტის მისამართები',
            email: 'ელ.ფოსტის მისამართები',
            phone: 'ტელეფონის ნომრები',
            iban: 'IBAN',
            georgianId: 'პირადი ნომერი',
            georgianCompanyId: 'საიდენტიფიკაციო კოდი',
        }
    }
};

// Patterns matching `LexGuard.PATTERNS` in patterns.js - order: high severity first, then medium
const PATTERNS = [
    { key: 'georgianId', severity: 'high' },
    { key: 'georgianCompanyId', severity: 'high' },
    { key: 'iban', severity: 'high' },
    { key: 'website', severity: 'medium' },
    { key: 'email', severity: 'medium' },
    { key: 'phone', severity: 'medium' }
];

const DEFAULT_SETTINGS = {
    language: 'en',
    shakeAnimation: true,
    disabledPatterns: [] // Array of pattern keys that are disabled
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
        // Ensure disabledPatterns is always an array
        if (!Array.isArray(currentSettings.disabledPatterns)) {
            currentSettings.disabledPatterns = [];
        }
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

const isPatternEnabled = (patternKey) => {
    return !currentSettings.disabledPatterns.includes(patternKey);
};

const togglePattern = (patternKey) => {
    const index = currentSettings.disabledPatterns.indexOf(patternKey);
    if (index === -1) {
        // Pattern is enabled, disable it
        currentSettings.disabledPatterns.push(patternKey);
    } else {
        // Pattern is disabled, enable it
        currentSettings.disabledPatterns.splice(index, 1);
    }
    saveSettings();
    updateDetectingTitle();
};

const updateDetectingTitle = () => {
    const t = TRANSLATIONS[currentSettings.language];
    const enabledCount = PATTERNS.filter(p => isPatternEnabled(p.key)).length;
    const detectingTitle = document.getElementById('detecting-title');
    if (detectingTitle) {
        detectingTitle.textContent = `${t.detectingTitle} ${t.detectingPatternsLabel}`;
    }
};

const renderUI = () => {
    const t = TRANSLATIONS[currentSettings.language];
    const enabledCount = PATTERNS.filter(p => isPatternEnabled(p.key)).length;

    const statusLabel = document.getElementById('status-label');
    if (statusLabel) statusLabel.textContent = t.statusLabel;

    const statusValue = document.getElementById('status-value');
    if (statusValue) statusValue.textContent = t.statusValue;

    const settingsTitle = document.getElementById('settings-title');
    if (settingsTitle) settingsTitle.textContent = t.settingsTitle;

    const shakeLabel = document.getElementById('shake-label');
    if (shakeLabel) shakeLabel.textContent = t.shakeLabel;

    const keyLabel = document.getElementById('key-label');
    if (keyLabel) keyLabel.textContent = t.keyLabel;

    const keyInput = document.getElementById('api-key-input');
    if (keyInput) keyInput.placeholder = t.keyPlaceholder;

    const detectingTitle = document.getElementById('detecting-title');
    if (detectingTitle) {
        detectingTitle.textContent = `${t.detectingPatternsLabel}`;
    }

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentSettings.language);
    });

    const shakeToggle = document.getElementById('setting-shake');
    if (shakeToggle) shakeToggle.checked = currentSettings.shakeAnimation;

    const detectList = document.getElementById('detect-list');
    if (detectList) {
        detectList.innerHTML = PATTERNS.map(p => {
            const enabled = isPatternEnabled(p.key);
            return `
                <div class="detect-item${enabled ? '' : ' disabled'}">
                    <div class="detect-info">
                        <span class="detect-name">${t.patterns[p.key]}</span>
                    </div>
                    <label class="toggle toggle-sm">
                        <input type="checkbox" data-pattern="${p.key}" ${enabled ? 'checked' : ''} />
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            `;
        }).join('');

        // Add event listeners for pattern toggles
        detectList.querySelectorAll('input[data-pattern]').forEach(input => {
            input.addEventListener('change', (e) => {
                const patternKey = e.target.dataset.pattern;
                const detectItem = e.target.closest('.detect-item');

                togglePattern(patternKey);

                // Update visual state
                if (detectItem) {
                    detectItem.classList.toggle('disabled', !e.target.checked);
                }
            });
        });
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

    const patternsHeader = document.getElementById('patterns-header');
    const patternsSection = document.getElementById('patterns-section');
    if (patternsHeader && patternsSection) {
        patternsHeader.addEventListener('click', () => {
            patternsSection.classList.toggle('expanded');
        });
    }
}
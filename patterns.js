var LexGuard = window.LexGuard || {};

LexGuard.PATTERNS = {
    ssn: {
        name: 'SSN / National ID',
        icon: '🔐',
        severity: 'high',
        pattern: /\b(?!000|666|9\d{2})\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,
        placeholder: '000-00-0000',
        redacted: '[SSN REDACTED]'
    },
    georgianId: {
        name: 'Georgian Personal ID',
        icon: '🇬🇪',
        severity: 'high',
        pattern: /\b[0-5]\d{10}\b/g,
        placeholder: '00000000000',
        redacted: '[ID REDACTED]'
    },
    creditCard: {
        name: 'Credit Card',
        icon: '💳',
        severity: 'high',
        pattern: /\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{1,4}\b/g,
        placeholder: '0000-0000-0000-0000',
        redacted: '[CARD REDACTED]'
    },
    email: {
        name: 'Email Address',
        icon: '📧',
        severity: 'medium',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        placeholder: 'email@example.com',
        redacted: '[EMAIL REDACTED]'
    },
    iban: {
        name: 'IBAN / Bank Info',
        icon: '🏦',
        severity: 'high',
        pattern: /\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4}\s?[A-Z0-9]{0,14}\b/g,
        placeholder: 'XX00 0000 0000 0000 0000 00',
        redacted: '[IBAN REDACTED]'
    },
    passport: {
        name: 'Passport Number',
        icon: '🛂',
        severity: 'high',
        pattern: /\b(?:passport[:\s#]*)?([A-Z]{1,2}\d{7,9})\b/gi,
        placeholder: 'XX0000000',
        redacted: '[PASSPORT REDACTED]'
    },
    phone: {
        name: 'Phone Number',
        icon: '📱',
        severity: 'medium',
        // USA, UK, Germany, France, and Georgia 
        pattern: /(?:\+(?:1|44|49|33|995)[\s\-\.]?\(?\d{1,4}\)?[\s\-\.]?\d{2,4}[\s\-\.]?\d{2,4}[\s\-\.]?\d{0,4})|(?:\([2-9]\d{2}\)[\s\-\.]?\d{3}[\s\-\.]?\d{4})|(?:[2-9]\d{2}[\s\-]\d{3}[\s\-]\d{4})|(?:0[1-9]\d{1,4}[\s\-]\d{3,4}[\s\-]\d{3,4})|(?:5\d{2}[\s\-]?\d{3}[\s\-]?\d{3})/g,
        placeholder: '(XXX) XXX-XXXX',
        minDigits: 7,
        maxDigits: 15
    },
    georgianCompanyId: {
        name: 'Georgian Company ID',
        icon: '🏢',
        severity: 'high',
        pattern: /(?<=(?:ს\/კ|საიდენტიფიკაციო\s*(?:ნომერი|კოდი))[\s:]*)\d{9}\b/g,
        placeholder: 'XXXXXXXXX',
    },
};


LexGuard.IGNORE_VALUES = new Set();

Object.values(LexGuard.PATTERNS).forEach(p => {
    if (p.placeholder) LexGuard.IGNORE_VALUES.add(p.placeholder.toLowerCase());
    if (p.redacted) LexGuard.IGNORE_VALUES.add(p.redacted.toLowerCase());
});

LexGuard.SETTINGS = {
    shakeAnimation: true,
    soundAlert: false,
    blockSendButton: true  // cannot be disabled
};

if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['shakeAnimation', 'soundAlert'], (result) => {
        if (result.shakeAnimation !== undefined) LexGuard.SETTINGS.shakeAnimation = result.shakeAnimation;
        if (result.soundAlert !== undefined) LexGuard.SETTINGS.soundAlert = result.soundAlert;
    });
}

if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'LEXGUARD_SETTINGS' && msg.settings) {
            if (msg.settings.shakeAnimation !== undefined) LexGuard.SETTINGS.shakeAnimation = msg.settings.shakeAnimation;
            if (msg.settings.soundAlert !== undefined) LexGuard.SETTINGS.soundAlert = msg.settings.soundAlert;

            if (msg.settings.language) {
                LexGuard.LANG = msg.settings.language;
            }
        }
        return true;
    });
}

window.LexGuard = LexGuard;

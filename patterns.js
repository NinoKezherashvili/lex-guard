var LexGuard = window.LexGuard || {};

const CONTEXT_KEYWORDS = {
    phone: [
        'მობილური', 'ტელეფონი', 'ტელ', 'მობ', 'ნომერი', 'დარეკე', 'დამირეკე',
        'საკონტაქტო', 'კონტაქტი',
        'phone', 'mobile', 'cell', 'tel', 'call', 'contact', 'number', 'reach'
    ],
    personalId: [
        'პირადი', 'პირადობა', 'პირადობის', 'ნომერი', 'იდენტიფიკატორი',
        'მოქალაქე', 'დაბადების', 'პ/ნ', 'პ.ნ',
        'personal', 'id', 'identification', 'citizen', 'national', 'identity',
        'born', 'dob', 'ssn'
    ],
    orgId: [
        'საიდენტიფიკაციო', 'კოდი', 'ს/კ', 'ს.კ', 'კომპანია', 'ორგანიზაცია',
        'შპს', 'სს', 'იურიდიული', 'რეგისტრაცია', 'საგადასახადო',
        'company', 'organization', 'org', 'business', 'corporate', 'tax',
        'registration', 'entity', 'llc', 'ltd', 'inc'
    ]
};

function checkContext(text, index, keywords) {
    const lookbackDistance = 50;  // Characters to look back
    const lookaheadDistance = 20; // Characters to look ahead

    const start = Math.max(0, index - lookbackDistance);
    const end = Math.min(text.length, index + lookaheadDistance);
    const contextAround = text.substring(start, end).toLowerCase();

    return keywords.some(keyword => contextAround.includes(keyword.toLowerCase()));
}

LexGuard.PATTERNS = {
    website: {
        name: 'Website URL',
        icon: '🌐',
        severity: 'medium',
        pattern: /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:[-a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=%]*)?/g,
        placeholder: 'https://example.com',
    },
    email: {
        name: 'Email Address',
        icon: '📧',
        severity: 'medium',
        pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
        placeholder: 'email@example.com',
    },
    phone: {
        name: 'Phone Number',
        icon: '📱',
        severity: 'medium',
        pattern: /(?:\+995|0)?\s?5[1-9]\d(?:\s?\d{2}){3}\b/g,
        placeholder: '(XXX) XXX-XXXX',
        validate: (match, index, fullText) => {
            if (match.includes('+995')) return true;
            return checkContext(fullText, index, CONTEXT_KEYWORDS.phone);
        }
    },
    iban: {
        name: 'Georgian IBAN',
        icon: '🏦',
        severity: 'high',
        pattern: /\bGE\d{2}[A-Z]{2}\d{16}\b/g,
        placeholder: 'GE00XX0000000000000000',
    },
    georgianId: {
        name: 'Georgian Personal ID',
        icon: '🇬🇪',
        severity: 'high',
        pattern: /(?<![\.\/-])\b\d{11}\b(?![\.\/-])/g,
        placeholder: '00000000000',
        validate: (match, index, fullText) => {
            return checkContext(fullText, index, CONTEXT_KEYWORDS.personalId);
        }
    },
    georgianCompanyId: {
        name: 'Georgian Company ID',
        icon: '🏢',
        severity: 'high',
        pattern: /(?<![\.\/-])\b\d{9}\b(?![\.\/-])/g,
        placeholder: 'XXXXXXXXX',
        validate: (match, index, fullText) => {
            const startsCorrectly = match.startsWith('2') || match.startsWith('4');
            const hasContext = checkContext(fullText, index, CONTEXT_KEYWORDS.orgId);
            return startsCorrectly || hasContext;
        }
    }
};

LexGuard.CONTEXT_KEYWORDS = CONTEXT_KEYWORDS;
LexGuard.checkContext = checkContext;

LexGuard.IGNORE_VALUES = new Set();

Object.values(LexGuard.PATTERNS).forEach(p => {
    if (p.placeholder) LexGuard.IGNORE_VALUES.add(p.placeholder.toLowerCase());
    if (p.redacted) LexGuard.IGNORE_VALUES.add(p.redacted.toLowerCase());
});

LexGuard.SETTINGS = {
    shakeAnimation: true,
    soundAlert: false,
    blockSendButton: true  // Cannot be disabled
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
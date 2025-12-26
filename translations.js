var LexGuard = window.LexGuard || {};

LexGuard.LANG = 'en';

LexGuard.TRANSLATIONS = {
    en: {
        sensitiveDataDetected: 'Sensitive data detected',
        high: 'high',
        medium: 'medium',
        details: 'Details',
        hide: 'Hide',
        replaceAll: 'Replace All',
        reviewed: "I've Reviewed",
        replaceWithPlaceholder: 'Replace with placeholder',
        deleteEntirely: 'Delete entirely',
        replacedWith: 'replaced with',
        redacted: '[REDACTED]',
        placeholder: 'placeholder',
        deleted: 'deleted',
        allItems: 'All items',
        reviewBeforeSending: '⚠️ Review sensitive data before sending',
        showHideValue: 'Show/Hide value',
        replace: 'Replace',
        patterns: {
            ssn: 'SSN / National ID',
            georgianId: 'Georgian Personal ID',
            creditCard: 'Credit Card',
            email: 'Email Address',
            iban: 'IBAN / Bank Info',
            passport: 'Passport Number',
            phone: 'Phone Number',
            zipCode: 'ZIP / Postal Code'
        }
    },
    ka: {
        sensitiveDataDetected: 'აღმოჩენილია სენსიტიური მონაცემები',
        high: 'მაღალი',
        medium: 'საშუალო',
        details: 'დეტალები',
        hide: 'დამალვა',
        replaceAll: 'ყველას ჩანაცვლება',
        reviewed: 'გადავამოწმე',
        replaceWithPlaceholder: 'ჩანაცვლება შაბლონით',
        deleteEntirely: 'სრულად წაშლა',
        replacedWith: 'ჩანაცვლებულია',
        redacted: '[ᲠᲔᲓᲐᲥᲢᲘᲠᲔᲑᲣᲚᲘ]',
        placeholder: 'შაბლონით',
        deleted: 'წაშლილია',
        allItems: 'ყველა',
        reviewBeforeSending: '⚠️ გადაამოწმეთ სენსიტიური მონაცემები გაგზავნამდე',
        showHideValue: 'მნიშვნელობის ჩვენება/დამალვა',
        replace: 'ჩანაცვლება',
        patterns: {
            ssn: 'SSN / პირადი ნომერი',
            georgianId: 'საქართველოს პირადი ნომერი',
            creditCard: 'საკრედიტო ბარათი',
            email: 'ელ.ფოსტა',
            iban: 'IBAN / საბანკო ინფო',
            passport: 'პასპორტის ნომერი',
            phone: 'ტელეფონის ნომერი',
            zipCode: 'საფოსტო ინდექსი'
        }
    }
};

LexGuard.t = function (key) {
    const lang = LexGuard.LANG;
    const keys = key.split('.');
    let value = LexGuard.TRANSLATIONS[lang];

    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            value = LexGuard.TRANSLATIONS['en'];
            for (const k2 of keys) {
                if (value && value[k2] !== undefined) {
                    value = value[k2];
                } else {
                    return key;
                }
            }
            break;
        }
    }

    return value || key;
};

LexGuard.utils.getStorage(['language']).then((result) => {
    if (result.language) {
        LexGuard.LANG = result.language;
    }
});

if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            let languageChanged = false;

            if (msg.type === 'LEXGUARD_LANGUAGE' && msg.language) {
                LexGuard.LANG = msg.language;
                languageChanged = true;
            }

            if (msg.type === 'LEXGUARD_SETTINGS' && msg.settings && msg.settings.language) {
                LexGuard.LANG = msg.settings.language;
                languageChanged = true;
            }

            if (languageChanged && LexGuard.ui && LexGuard.ui.banner && LexGuard.ui.banner.classList.contains('visible')) {
                const items = LexGuard.scanner.detectedItems;
                LexGuard.ui.banner.remove();
                LexGuard.ui.banner = null;
                LexGuard.ui.createBanner();
                if (items.length > 0) {
                    LexGuard.ui.showBanner(items);
                }
            }

            return true;
        });
    } catch (e) {
        console.warn('LexGuard: Message listener setup failed', e);
    }
}

window.LexGuard = LexGuard;

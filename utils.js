var LexGuard = window.LexGuard || {};

LexGuard.utils = {
    debounce: function (fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    maskValue: function (value) {
        if (!value) return '••••';
        if (value.length <= 4) return '••••';
        return value.slice(0, 2) + '•'.repeat(Math.min(value.length - 4, 8)) + value.slice(-2);
    },

    getStorage: function (keys) {
        return new Promise((resolve) => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.get(keys, (result) => {
                        resolve(result || {});
                    });
                } else {
                    resolve({});
                }
            } catch (e) {
                console.warn('LexGuard: Storage access failed', e);
                resolve({});
            }
        });
    },

    setStorage: function (data) {
        return new Promise((resolve) => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.set(data, () => {
                        resolve(true);
                    });
                } else {
                    resolve(false);
                }
            } catch (e) {
                console.warn('LexGuard: Storage save failed', e);
                resolve(false);
            }
        });
    },

    escapeHtml: function (text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.LexGuard = LexGuard;

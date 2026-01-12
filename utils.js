// Global debug flag for optional verbose logging across LexGuard modules.
// Set to true during development if you need detailed console output.
var LEXGUARD_DEBUG = false;

var LexGuard = window.LexGuard || {};

/**
 * Logs debug messages only when LEXGUARD_DEBUG is enabled.
 * @param {...*} args - Arguments to pass to console.log
 * @returns {void}
 */
LexGuard.logDebug = function (...args) {
    if (!LEXGUARD_DEBUG) return;
    // eslint-disable-next-line no-console
    console.log(...args);
};

LexGuard.TIMING = {
    INITIAL_SCAN_DELAY: 1000,
    RETRY_SCAN_DELAY: 3000,
    RETRY_INIT_DELAY: 50,
    PASTE_HANDLER_DELAY: 50,
    REPLACE_STEP_DELAY: 50,
    SET_INPUT_RESOLVE_DELAY: 100
};

LexGuard.utils = {
    /**
     * Creates a debounced version of a function that delays execution
     * until after the specified delay has passed since the last invocation.
     * @param {Function} fn - The function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: function (fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * Masks a sensitive value, showing only first 2 and last 2 characters.
     * Used for displaying detected sensitive data in the UI.
     * @param {string} value - The value to mask
     * @returns {string} Masked value (e.g., "12••••••34")
     */
    maskValue: function (value) {
        if (!value) return '••••';
        if (value.length <= 4) return '••••';
        return value.slice(0, 2) + '•'.repeat(Math.min(value.length - 4, 8)) + value.slice(-2);
    },

    /**
     * Retrieves data from Chrome extension storage.
     * @param {string|Array<string>|Object} keys - Key(s) to retrieve, or object with default values
     * @returns {Promise<Object>} Promise resolving to storage data object
     */
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

    /**
     * Saves data to Chrome extension storage.
     * @param {Object} data - Object with key-value pairs to store
     * @returns {Promise<boolean>} Promise resolving to true if successful, false otherwise
     */
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

    /**
     * Escapes HTML special characters to prevent XSS attacks.
     * @param {string} text - Text to escape
     * @returns {string} HTML-escaped text
     */
    escapeHtml: function (text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.LexGuard = LexGuard;

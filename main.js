(function () {
    'use strict';

    const waitForLexGuard = (callback, attempts = 0) => {
        if (attempts > 50) {
            console.error('LexGuard: Failed to initialize - modules not loaded');
            return;
        }

        if (window.LexGuard &&
            window.LexGuard.utils &&
            window.LexGuard.scanner &&
            window.LexGuard.ui &&
            window.LexGuard.PATTERNS) {
            callback();
        } else {
            const retryDelay = (window.LexGuard && window.LexGuard.TIMING)
                ? window.LexGuard.TIMING.RETRY_INIT_DELAY
                : 50;
            setTimeout(() => waitForLexGuard(callback, attempts + 1), retryDelay);
        }
    };

    waitForLexGuard(() => {
        const debouncedScan = LexGuard.utils.debounce((text) => {
            LexGuard.logDebug('LexGuard: Scanning text of length', text.length);
            LexGuard.scanner.scanText(text);
        }, 300);

        const observedInputs = new WeakSet();

        const attachInputListeners = (input) => {
            if (!input || observedInputs.has(input)) return;

            LexGuard.logDebug('LexGuard: Attaching listeners to', input.tagName, input.id || input.className);

            observedInputs.add(input);
            input.dataset.lexguard = 'true';

            const handleInput = () => {
                const text = input.textContent || input.innerText || input.value || '';
                LexGuard.logDebug('LexGuard: Input event, text length:', text.length);
                debouncedScan(text);
            };

            input.addEventListener('input', handleInput);
            input.addEventListener('keyup', handleInput);

            input.addEventListener('paste', () => {
                setTimeout(handleInput, LexGuard.TIMING.PASTE_HANDLER_DELAY);
            });

            const initialText = input.textContent || input.innerText || input.value || '';
            if (initialText.length > 3) {
                debouncedScan(initialText);
            }
        };

        const findAndObserveInputs = () => {
            const selectors = [
                // ChatGPT
                '#prompt-textarea',
                'div.ProseMirror[contenteditable="true"]',
                'textarea[name="prompt-textarea"]',

                // Gemini
                'div[contenteditable="true"][aria-label*="prompt"]',
                'rich-textarea [contenteditable="true"]',
                '.ql-editor[contenteditable="true"]'
            ];

            for (const selector of selectors) {
                const input = document.querySelector(selector);
                if (input && !input.dataset.lexguard && input.style.display !== 'none') {
                    LexGuard.logDebug('LexGuard: Found input with selector:', selector);
                    attachInputListeners(input);
                    return;
                }
            }
        };

        const observeDOM = () => {
            const observer = new MutationObserver((mutations) => {
                let shouldCheck = false;

                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        shouldCheck = true;
                        break;
                    }
                }

                if (shouldCheck) {
                    findAndObserveInputs();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        };

        const init = () => {
            const patternCount = Object.keys(LG.PATTERNS).length;

            LexGuard.ui.init();
            findAndObserveInputs();
            observeDOM();

            setTimeout(findAndObserveInputs, LexGuard.TIMING.INITIAL_SCAN_DELAY);
            setTimeout(findAndObserveInputs, LexGuard.TIMING.RETRY_SCAN_DELAY);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    });
})();
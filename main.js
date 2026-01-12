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
            setTimeout(() => waitForLexGuard(callback, attempts + 1), 50);
        }
    };

    waitForLexGuard(() => {
        const LG = window.LexGuard;

        const debouncedScan = LG.utils.debounce((text) => {
            console.log('LexGuard: Scanning text of length', text.length);
            LG.scanner.scanText(text);
        }, 300);

        const observedInputs = new WeakSet();

        const attachInputListeners = (input) => {
            if (!input || observedInputs.has(input)) return;

            console.log('LexGuard: Attaching listeners to', input.tagName, input.id || input.className);

            observedInputs.add(input);
            input.dataset.lexguard = 'true';

            const handleInput = () => {
                const text = input.textContent || input.innerText || input.value || '';
                console.log('LexGuard: Input event, text length:', text.length);
                debouncedScan(text);
            };

            input.addEventListener('input', handleInput);
            input.addEventListener('keyup', handleInput);

            input.addEventListener('paste', () => {
                setTimeout(handleInput, 50);
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
                    console.log('LexGuard: Found input with selector:', selector);
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
            console.log(`🛡️ LexGuard: Active on ChatGPT (${patternCount} patterns)`);

            LG.ui.init();
            findAndObserveInputs();
            observeDOM();

            setTimeout(findAndObserveInputs, 1000);
            setTimeout(findAndObserveInputs, 3000);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    });
})();
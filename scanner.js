var LexGuard = window.LexGuard || {};

LexGuard.scanner = {
    isBlocking: false,
    hasShaken: false,
    hasPlayedSound: false,
    detectedItems: [],
    isProcessing: false,

    _tooltipShowHandler: null,
    _tooltipHideHandler: null,

    /**
     * Plays an alert sound when sensitive data is detected.
     * Uses Web Audio API to generate a brief tone. Gracefully handles
     * browsers without Web Audio support by disabling sound alerts.
     * @returns {void}
     */
    playAlertSound: function () {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

        // Gracefully handle browsers/environments without Web Audio support
        if (!AudioContextCtor) {
            console.warn('LexGuard: Web Audio API not supported, disabling sound alerts');
            if (LexGuard.SETTINGS) {
                LexGuard.SETTINGS.soundAlert = false;
            }
            return;
        }

        const playTone = (audioContext) => {
            try {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 800;
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(
                    0.01,
                    audioContext.currentTime + 0.2
                );

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
            } catch (e) {
                console.warn('LexGuard: Could not play alert tone', e);
            }
        };

        try {
            // Reuse a single AudioContext if possible to avoid resource issues
            if (!LexGuard._audioContext) {
                LexGuard._audioContext = new AudioContextCtor();
            }
            const audioContext = LexGuard._audioContext;

            // Some browsers require a user gesture before audio can play.
            // If the context is suspended, try to resume it and handle failure.
            if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
                audioContext.resume()
                    .then(() => {
                        if (audioContext.state === 'running') {
                            playTone(audioContext);
                        }
                    })
                    .catch((e) => {
                        console.warn('LexGuard: Audio context resume failed, disabling sound alerts', e);
                        if (LexGuard.SETTINGS) {
                            LexGuard.SETTINGS.soundAlert = false;
                        }
                    });
            } else {
                playTone(audioContext);
            }
        } catch (e) {
            console.warn('LexGuard: Could not initialize audio context, disabling sound alerts', e);
            if (LexGuard.SETTINGS) {
                LexGuard.SETTINGS.soundAlert = false;
            }
        }
    },

    /**
     * Scans text for sensitive data patterns (SSN, credit cards, emails, etc.).
     * Automatically shows/hides banner, plays alerts, and blocks send button based on settings.
     * @param {string} text - The text content to scan for sensitive patterns
     * @returns {Array<Object>} Array of detected items, each containing:
     *   - {string} type - Pattern type key (e.g., 'ssn', 'creditCard')
     *   - {string} name - Human-readable pattern name
     *   - {string} icon - Icon identifier
     *   - {string} severity - 'high' or 'medium'
     *   - {string} value - The detected sensitive value
     *   - {string} placeholder - Placeholder text for replacement
     */
    scanText: function (text) {
        if (!text || text.length < 3) {
            LexGuard.ui.hideBanner();
            this.unblockSendButton();
            this.hasShaken = false;
            this.detectedItems = [];
            return [];
        }

        const found = [];
        const patterns = LexGuard.PATTERNS;
        const ignoreValues = LexGuard.IGNORE_VALUES || new Set();

        for (const [key, config] of Object.entries(patterns)) {
            // Always work on a fresh RegExp instance so we never depend on or
            // mutate shared global-regex state (lastIndex, etc.)
            const basePattern = config.pattern;
            const pattern = basePattern && basePattern.global
                ? new RegExp(basePattern.source, basePattern.flags)
                : basePattern;

            if (!pattern) {
                continue;
            }

            pattern.lastIndex = 0;

            let match;
            const uniqueMatches = new Set();

            while ((match = pattern.exec(text)) !== null) {
                const matchValue = match[0];
                const matchIndex = match.index;

                if (uniqueMatches.has(matchValue)) continue;
                uniqueMatches.add(matchValue);

                const matchLower = matchValue.toLowerCase();

                if (ignoreValues.has(matchLower)) {
                    continue;
                }

                if (/^[0\-\s\(\)\.]+$/.test(matchValue)) {
                    continue;
                }

                if (config.minDigits || config.maxDigits) {
                    const digitCount = matchValue.replace(/\D/g, '').length;
                    if (config.minDigits && digitCount < config.minDigits) continue;
                    if (config.maxDigits && digitCount > config.maxDigits) continue;
                }

                if (config.validate) {
                    const isValid = config.validate(matchValue, matchIndex, text);
                    if (!isValid) {
                        LexGuard.logDebug(`LexGuard: Skipping ${key} match "${matchValue}" - failed validation`);
                        continue;
                    }
                }

                if (!found.find(f => f.value === matchValue)) {
                    found.push({
                        type: key,
                        name: config.name,
                        icon: config.icon,
                        severity: config.severity,
                        value: matchValue,
                        placeholder: config.placeholder
                    });
                }
            }
        }

        // Sort by severity (high first)
        found.sort((a, b) => {
            if (a.severity === 'high' && b.severity !== 'high') return -1;
            if (a.severity !== 'high' && b.severity === 'high') return 1;
            return 0;
        });

        this.detectedItems = found;

        if (found.length > 0) {
            LexGuard.ui.showBanner(found);

            if (LexGuard.SETTINGS.shakeAnimation && !this.hasShaken) {
                LexGuard.ui.shakeInput();
                this.hasShaken = true;
            }

            if (LexGuard.SETTINGS.soundAlert && !this.hasPlayedSound) {
                this.playAlertSound();
                this.hasPlayedSound = true;
            }

            if (LexGuard.SETTINGS.blockSendButton) {
                this.blockSendButton();
            }
        } else {
            LexGuard.ui.hideBanner();
            this.unblockSendButton();
            this.hasShaken = false;
            this.hasPlayedSound = false;
        }

        return found;
    },

    /**
     * Finds the active input element (textarea or contenteditable) for ChatGPT/Gemini.
     * Tries multiple selectors to support different UI variations.
     * @returns {HTMLElement|null} The input element, or null if not found
     */
    getInputElement: function () {
        return (
            // ChatGPT
            document.querySelector('#prompt-textarea') ||
            document.querySelector('div.ProseMirror[contenteditable="true"]') ||
            // Gemini
            document.querySelector('div[contenteditable="true"][aria-label*="prompt"]') ||
            document.querySelector('rich-textarea [contenteditable="true"]') ||
            document.querySelector('.ql-editor[contenteditable="true"]')
        );
    },

    /**
     * Retrieves the current text content from the input element.
     * Handles both textarea and contenteditable elements.
     * @returns {string} The text content, or empty string if no input found
     */
    getInputText: function () {
        const input = this.getInputElement();
        if (!input) return '';
        return input.textContent || input.innerText || input.value || '';
    },

    /**
     * Replaces text within the DOM while preserving structure.
     * Handles replacements that might span multiple text nodes by concatenating
     * all text, performing replacement, then reconstructing the DOM.
     * @param {string} searchValue - The text to find and replace
     * @param {string} replacement - The replacement text
     * @returns {boolean} True if replacement was successful, false otherwise
     */
    replaceInDOM: function (searchValue, replacement) {
        const input = this.getInputElement();
        if (!input) return false;

        // Get all text nodes
        const textNodes = this.getTextNodes(input);
        if (textNodes.length === 0) return false;

        // Concatenate all text nodes to handle matches spanning multiple nodes
        const fullText = textNodes.map(node => node.textContent).join('');
        
        // Check if the search value exists in the concatenated text
        if (!fullText.includes(searchValue)) {
            return false;
        }

        // Perform replacement on the concatenated text
        const replacedText = fullText.split(searchValue).join(replacement);

        // Reconstruct DOM: for contenteditable, replace all text nodes with a single new one
        // This preserves the parent structure while handling multi-node matches
        if (input.contentEditable === 'true' || input.isContentEditable) {
            // Find the first text node's parent to determine insertion point
            const firstTextNode = textNodes[0];
            const parentNode = firstTextNode.parentNode;

            // Remove all existing text nodes
            textNodes.forEach(node => {
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            });

            // Insert the replaced text as a single text node at the original position
            // If parent still has other children, insert before first; otherwise append
            if (parentNode && parentNode.firstChild) {
                parentNode.insertBefore(document.createTextNode(replacedText), parentNode.firstChild);
            } else if (parentNode) {
                parentNode.appendChild(document.createTextNode(replacedText));
            } else {
                // Fallback: if no parent, append to input directly
                input.appendChild(document.createTextNode(replacedText));
            }
        } else {
            // For textarea, just set the value directly
            input.value = replacedText;
        }

        // Dispatch input event to notify the application
        input.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText'
        }));

        return true;
    },

    /**
     * Retrieves all text nodes within an element using TreeWalker.
     * @param {HTMLElement} element - The element to traverse
     * @returns {Array<Text>} Array of text nodes
     */
    getTextNodes: function (element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        return textNodes;
    },

    /**
     * Sets the text content of the input element, handling both contenteditable
     * and textarea elements. Uses native property setters when available for better
     * compatibility with frameworks like React.
     * @param {string} text - The text to set in the input
     * @returns {Promise<boolean>} Resolves to true if successful, false otherwise
     */
    setInputTextFallback: function (text) {
        return new Promise((resolve) => {
            const input = this.getInputElement();
            if (!input) {
                resolve(false);
                return;
            }

            requestAnimationFrame(() => {
                if (input.contentEditable === 'true' || input.isContentEditable) {
                    // ContentEditable branch: directly replace contents instead of using deprecated execCommand
                    input.focus();

                    // Replace entire contents
                    while (input.firstChild) {
                        input.removeChild(input.firstChild);
                    }
                    input.appendChild(document.createTextNode(text));

                    // Move caret to end
                    const selection = window.getSelection();
                    if (selection) {
                        const range = document.createRange();
                        range.selectNodeContents(input);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }

                    // Notify underlying app (ChatGPT/Gemini) about the change
                    input.dispatchEvent(new InputEvent('input', {
                        bubbles: true,
                        cancelable: true,
                        inputType: 'insertText',
                        data: text
                    }));
                } else {
                    const descriptor = Object.getOwnPropertyDescriptor(
                        window.HTMLTextAreaElement.prototype,
                        'value'
                    );

                    if (descriptor && typeof descriptor.set === 'function') {
                        descriptor.set.call(input, text);
                    } else {
                        // Fallback: directly assign the value if the descriptor or setter is missing
                        input.value = text;
                    }

                    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                }

                setTimeout(() => resolve(true), LexGuard.TIMING.SET_INPUT_RESOLVE_DELAY);
            });
        });
    },

    /**
     * Validates replace action to guard against unexpected input values.
     * Only known safe actions are allowed to proceed.
     * @param {string} action - The action to validate ('placeholder' or 'delete')
     * @returns {boolean} True if action is valid, false otherwise
     * @private
     */
    _isValidReplaceAction: function (action) {
        const allowedActions = ['placeholder', 'delete'];
        if (!allowedActions.includes(action)) {
            console.warn('LexGuard: Invalid replace action received', action);
            return false;
        }
        return true;
    },

    /**
     * Compute the replacement string for a detected item based on the requested action.
     * Returns null if the action is unknown so callers can safely no-op.
     * @param {Object} item - Detected item object.
     * @param {string} action - One of the allowed replace actions.
     * @returns {string|null}
     */
    _getReplacementValue: function (item, action) {
        switch (action) {
            case 'placeholder':
                return item.placeholder;
            case 'delete':
                return '';
            default:
                return null;
        }
    },

    /**
     * Ensures only one replace operation runs at a time.
     * Shows loading overlay during operation and prevents concurrent replacements.
     * @param {Function} fn - Async function to execute exclusively
     * @returns {Promise<void>}
     */
    runExclusive: async function (fn) {
        if (this.isProcessing) return;

        this.isProcessing = true;
        LexGuard.ui.showLoading();

        try {
            await fn();
        } finally {
            LexGuard.ui.hideLoading();
            this.isProcessing = false;
        }
    },

    /**
     * Replaces a single detected item in the input text.
     * @param {number} index - Index of the item in detectedItems array
     * @param {string} action - Replacement action: 'placeholder' or 'delete'
     * @returns {Promise<void>}
     */
    replaceItem: async function (index, action) {
        if (!this._isValidReplaceAction(action)) {
            return;
        }

        await this.runExclusive(async () => {
            const item = this.detectedItems[index];
            if (!item) {
                console.warn('LexGuard: Item not found at index', index);
                return;
            }

            await new Promise(r => setTimeout(r, LexGuard.TIMING.REPLACE_STEP_DELAY));

            const t = LexGuard.t;
            const replacement = this._getReplacementValue(item, action);
            if (replacement === null) {
                console.warn('LexGuard: No replacement value resolved for action', action);
                return;
            }

            const success = this.replaceInDOM(item.value, replacement);

            if (!success) {
                const currentText = this.getInputText();
                const newText = currentText.split(item.value).join(replacement);
                await this.setInputTextFallback(newText);
            }

            await new Promise(r => setTimeout(r, LexGuard.TIMING.REPLACE_STEP_DELAY));

            const patternName = t(`patterns.${item.type}`) || item.name;
            this.detectedItems = this.detectedItems.filter((_, i) => i !== index);

            LexGuard.ui.removeItem(index);

            this.showReplaceFeedback(patternName, action);
        });
    },

    /**
     * Replaces all detected items in the input text with the specified action.
     * @param {string} action - Replacement action: 'placeholder' or 'delete'
     * @returns {Promise<void>}
     */
    replaceAll: async function (action) {
        if (!this._isValidReplaceAction(action)) {
            return;
        }

        await this.runExclusive(async () => {
            await new Promise(r => setTimeout(r, LexGuard.TIMING.REPLACE_STEP_DELAY));

            const t = LexGuard.t;
            let allSuccess = true;

            for (const item of this.detectedItems) {
                const replacement = this._getReplacementValue(item, action);
                if (replacement === null) {
                    console.warn('LexGuard: No replacement value resolved for action', action);
                    continue;
                }

                const success = this.replaceInDOM(item.value, replacement);
                if (!success) {
                    allSuccess = false;
                }
            }

            if (!allSuccess) {
                let currentText = this.getInputText();
                this.detectedItems.forEach(item => {
                    const replacement = this._getReplacementValue(item, action);
                    if (replacement === null) {
                        return;
                    }
                    currentText = currentText.split(item.value).join(replacement);
                });
                await this.setInputTextFallback(currentText);
            }

            await new Promise(r => setTimeout(r, LexGuard.TIMING.REPLACE_STEP_DELAY));

            this.detectedItems = [];

            LexGuard.ui.hideBanner();
            this.unblockSendButton();
            this.hasShaken = false;

            this.showReplaceFeedback(t('allItems'), action);
        });
    },

    /**
     * Shows a toast notification after a replacement operation.
     * @param {string} itemName - Name of the item that was replaced
     * @param {string} action - The action that was performed ('placeholder' or 'delete')
     * @returns {void}
     */
    showReplaceFeedback: function (itemName, action) {
        const t = LexGuard.t;
        const actionText = {
            'placeholder': `${t('replacedWith')} ${t('placeholder')}`,
            'delete': t('deleted')
        };

        if (!actionText[action]) {
            console.warn('LexGuard: Unknown replace action for feedback', action);
            return;
        }

        LexGuard.ui.showToast(`✓ ${itemName} ${actionText[action]}`);
    },

    // SEND BUTTON & ENTER KEY BLOCKING
    _enterKeyHandler: null,

    /**
     * Blocks the send button and Enter key when sensitive data is detected.
     * Adds tooltip and event listeners to prevent accidental submission.
     * @returns {void}
     */
    blockSendButton: function () {
        if (this.isBlocking) return;

        const sendBtn = document.querySelector(
            // ChatGPT
            'button[data-testid="send-button"], ' +
            'button[aria-label*="Send"], ' +
            'button[aria-label*="send"], ' +
            'form button[type="submit"], ' +
            // Gemini
            'button[aria-label*="Submit"], ' +
            'button[aria-label*="submit"], ' +
            'button[data-tooltip="Submit"], ' +
            'button[mattooltip="Submit"], ' +
            '.send-button-container button, ' +
            'button.send-button'
        );

        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.dataset.lexguardBlocked = 'true';
            sendBtn.classList.add('lexguard-blocked');

            this._tooltipShowHandler = (e) => LexGuard.ui.showTooltip(e);
            this._tooltipHideHandler = () => LexGuard.ui.hideTooltip();

            sendBtn.addEventListener('mouseenter', this._tooltipShowHandler);
            sendBtn.addEventListener('mouseleave', this._tooltipHideHandler);
        }

        this.blockEnterKey();

        this.isBlocking = true;
    },

    /**
     * Blocks Enter key submission when sensitive data is detected.
     * Uses capture phase to intercept before ChatGPT/Gemini handlers.
     * @returns {void}
     */
    blockEnterKey: function () {
        if (this._enterKeyHandler) {
            document.removeEventListener('keydown', this._enterKeyHandler, true);
        }

        this._enterKeyHandler = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                const input = this.getInputElement();

                if (input && (e.target === input || input.contains(e.target))) {
                    if (this.detectedItems.length > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();

                        const t = LexGuard.t;
                        LexGuard.ui.showToast(t('reviewBeforeSending'));

                        if (LexGuard.SETTINGS.shakeAnimation) {
                            LexGuard.ui.shakeInput();
                        }

                        return false;
                    }
                }
            }
        };

        // Use capture phase to intercept before ChatGPT/Gemini handlers
        document.addEventListener('keydown', this._enterKeyHandler, true);
    },

    /**
     * Removes Enter key blocking and restores normal submission behavior.
     * @returns {void}
     */
    unblockEnterKey: function () {
        if (this._enterKeyHandler) {
            document.removeEventListener('keydown', this._enterKeyHandler, true);
            this._enterKeyHandler = null;
        }
    },

    /**
     * Unblocks the send button and Enter key, restoring normal submission behavior.
     * Removes tooltip and event listeners.
     * @returns {void}
     */
    unblockSendButton: function () {
        const sendBtn = document.querySelector('[data-lexguard-blocked="true"]');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.removeAttribute('data-lexguard-blocked');
            sendBtn.classList.remove('lexguard-blocked');

            if (this._tooltipShowHandler) {
                sendBtn.removeEventListener('mouseenter', this._tooltipShowHandler);
            }
            if (this._tooltipHideHandler) {
                sendBtn.removeEventListener('mouseleave', this._tooltipHideHandler);
            }
        }

        this.unblockEnterKey();

        LexGuard.ui.hideTooltip();
        this.isBlocking = false;
    },

    /**
     * Handles the "reviewed" action - unblocks send button and hides banner.
     * Called when user acknowledges they've reviewed the sensitive data.
     * @returns {void}
     */
    handleReview: function () {
        this.unblockSendButton();
        LexGuard.ui.hideBanner();
        this.hasShaken = false;
    }
};

window.LexGuard = LexGuard;
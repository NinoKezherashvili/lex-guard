var LexGuard = window.LexGuard || {};

LexGuard.scanner = {
    isBlocking: false,
    hasShaken: false,
    hasPlayedSound: false,
    detectedItems: [],
    isProcessing: false,

    _tooltipShowHandler: null,
    _tooltipHideHandler: null,

    // ALERT SOUND
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
            const matches = text.match(pattern);

            if (matches) {
                [...new Set(matches)].forEach(match => {
                    const matchLower = match.toLowerCase();

                    if (ignoreValues.has(matchLower)) {
                        return;
                    }

                    if (match.includes('[') && match.includes('REDACTED]')) {
                        return;
                    }

                    if (/^[0\-\s\(\)\.]+$/.test(match)) {
                        return;
                    }

                    if (config.minDigits || config.maxDigits) {
                        const digitCount = match.replace(/\D/g, '').length;
                        if (config.minDigits && digitCount < config.minDigits) return;
                        if (config.maxDigits && digitCount > config.maxDigits) return;
                    }

                    if (!found.find(f => f.value === match)) {
                        found.push({
                            type: key,
                            name: config.name,
                            icon: config.icon,
                            severity: config.severity,
                            value: match,
                            placeholder: config.placeholder
                        });
                    }
                });
            }
        }

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

    getInputText: function () {
        const input = this.getInputElement();
        if (!input) return '';
        return input.textContent || input.innerText || input.value || '';
    },

    // Replace text within DOM while preserving structure
    replaceInDOM: function (searchValue, replacement) {
        const input = this.getInputElement();
        if (!input) return false;

        // Get all text nodes
        const textNodes = this.getTextNodes(input);
        let replaced = false;

        // Handle replacements that might span multiple text nodes
        for (const node of textNodes) {
            if (node.textContent.includes(searchValue)) {
                node.textContent = node.textContent.split(searchValue).join(replacement);
                replaced = true;
            }
        }

        if (replaced) {
            input.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText'
            }));
        }

        return replaced;
    },

    // Get all text nodes within an element
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
                    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLTextAreaElement.prototype,
                        'value'
                    ).set;

                    nativeTextAreaValueSetter.call(input, text);
                    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                }

                setTimeout(() => resolve(true), 100);
            });
        });
    },

    /**
     * Validate replace action to guard against unexpected input values.
     * Only known safe actions are allowed to proceed.
     */
    _isValidReplaceAction: function (action) {
        const allowedActions = ['placeholder', 'delete'];
        if (!allowedActions.includes(action)) {
            console.warn('LexGuard: Invalid replace action received', action);
            return false;
        }
        return true;
    },

    // Ensure only one replace operation runs at a time
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

    // REPLACE FUNCTIONS
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

            await new Promise(r => setTimeout(r, 50));

            const t = LexGuard.t;
            let replacement = '';

            switch (action) {
                case 'placeholder':
                    replacement = item.placeholder;
                    break;
                case 'delete':
                    replacement = '';
                    break;
            }

            const success = this.replaceInDOM(item.value, replacement);

            if (!success) {
                const currentText = this.getInputText();
                const newText = currentText.split(item.value).join(replacement);
                await this.setInputTextFallback(newText);
            }

            await new Promise(r => setTimeout(r, 50));

            const patternName = t(`patterns.${item.type}`) || item.name;
            this.detectedItems = this.detectedItems.filter((_, i) => i !== index);

            LexGuard.ui.removeItem(index);

            this.showReplaceFeedback(patternName, action);
        });
    },

    replaceAll: async function (action) {
        if (!this._isValidReplaceAction(action)) {
            return;
        }

        await this.runExclusive(async () => {
            await new Promise(r => setTimeout(r, 50));

            const t = LexGuard.t;
            let allSuccess = true;

            for (const item of this.detectedItems) {
                let replacement = '';
                switch (action) {
                    case 'placeholder':
                        replacement = item.placeholder;
                        break;
                    case 'delete':
                        replacement = '';
                        break;
                }

                const success = this.replaceInDOM(item.value, replacement);
                if (!success) {
                    allSuccess = false;
                }
            }

            if (!allSuccess) {
                let currentText = this.getInputText();
                this.detectedItems.forEach(item => {
                    let replacement = '';
                    switch (action) {
                        case 'placeholder':
                            replacement = item.placeholder;
                            break;
                        case 'delete':
                            replacement = '';
                            break;
                    }
                    currentText = currentText.split(item.value).join(replacement);
                });
                await this.setInputTextFallback(currentText);
            }

            await new Promise(r => setTimeout(r, 50));

            this.detectedItems = [];

            LexGuard.ui.hideBanner();
            this.unblockSendButton();
            this.hasShaken = false;

            this.showReplaceFeedback(t('allItems'), action);
        });
    },

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

    // SEND BUTTON BLOCKING
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
            this.isBlocking = true;

            this._tooltipShowHandler = (e) => LexGuard.ui.showTooltip(e);
            this._tooltipHideHandler = () => LexGuard.ui.hideTooltip();

            sendBtn.addEventListener('mouseenter', this._tooltipShowHandler);
            sendBtn.addEventListener('mouseleave', this._tooltipHideHandler);
        }
    },

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

        LexGuard.ui.hideTooltip();
        this.isBlocking = false;
    },

    handleReview: function () {
        this.unblockSendButton();
        LexGuard.ui.hideBanner();
        this.hasShaken = false;
    }
};

window.LexGuard = LexGuard;
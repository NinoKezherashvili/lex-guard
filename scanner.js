var LexGuard = window.LexGuard || {};

LexGuard.scanner = {
    isBlocking: false,
    hasShaken: false,
    hasPlayedSound: false,
    detectedItems: [],
    _scrollHandler: null,
    _resizeHandler: null,

    _tooltipShowHandler: null,
    _tooltipHideHandler: null,

    // ALERT SOUND
    playAlertSound: function () {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            console.warn('LexGuard: Could not play sound', e);
        }
    },

    scanText: function (text) {
        if (!text || text.length < 3) {
            LexGuard.ui.hideBanner();
            this.unblockSendButton();
            this.removeHighlights();
            this.hasShaken = false;
            this.detectedItems = [];
            return [];
        }

        const found = [];
        const patterns = LexGuard.PATTERNS;
        const ignoreValues = LexGuard.IGNORE_VALUES || new Set();

        for (const [key, config] of Object.entries(patterns)) {
            config.pattern.lastIndex = 0;
            const matches = text.match(config.pattern);

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
            this.showHighlights();

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
            this.removeHighlights();
            this.hasShaken = false;
            this.hasPlayedSound = false;
        }

        return found;
    },

    // HIGHLIGHT UNDERLINES (Grammarly way)
    showHighlights: function () {
        const input = this.getInputElement();
        if (!input || this.detectedItems.length === 0) return;

        this.removeHighlights(false);

        this.detectedItems.forEach(item => {
            const positions = this.findTextPositions(input, item.value);

            positions.forEach(pos => {
                const underline = document.createElement('div');
                underline.className = 'lexguard-underline';
                underline.dataset.severity = item.severity;
                underline.style.cssText = `
                    position: absolute;
                    left: ${pos.left}px;
                    top: ${pos.bottom - 2}px;
                    width: ${pos.width}px;
                    height: 3px;
                    pointer-events: none;
                    z-index: 10000;
                `;
                document.body.appendChild(underline);
            });
        });

        this.addPositionListeners();
    },

    findTextPositions: function (element, searchText) {
        const positions = [];
        const text = element.textContent || '';
        let startIndex = 0;

        while (true) {
            const index = text.indexOf(searchText, startIndex);
            if (index === -1) break;

            const textNodeInfo = this.getTextNodeAtPosition(element, index);

            if (textNodeInfo) {
                try {
                    const range = document.createRange();
                    const endNodeInfo = this.getTextNodeAtPosition(element, index + searchText.length - 1);

                    if (endNodeInfo) {
                        range.setStart(textNodeInfo.node, textNodeInfo.offset);

                        if (textNodeInfo.node === endNodeInfo.node) {
                            range.setEnd(textNodeInfo.node, textNodeInfo.offset + searchText.length);
                        } else {
                            range.setEnd(endNodeInfo.node, endNodeInfo.offset + 1);
                        }

                        const rect = range.getBoundingClientRect();

                        if (rect.width > 0) {
                            positions.push({
                                left: rect.left + window.scrollX,
                                top: rect.top + window.scrollY,
                                bottom: rect.bottom + window.scrollY,
                                width: rect.width
                            });
                        }
                    }
                } catch (e) {
                    console.warn('LexGuard: Could not get text position', e);
                }
            }

            startIndex = index + 1;
        }

        return positions;
    },

    getTextNodeAtPosition: function (element, position) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let currentPos = 0;
        let node;

        while (node = walker.nextNode()) {
            const length = node.textContent.length;
            if (currentPos + length > position) {
                return { node: node, offset: position - currentPos };
            }
            currentPos += length;
        }

        return null;
    },

    addPositionListeners: function () {
        this.removePositionListeners();

        const updatePositions = LexGuard.utils.debounce(() => {
            if (this.detectedItems.length > 0) {
                this.showHighlights();
            }
        }, 50);

        this._scrollHandler = updatePositions;
        this._resizeHandler = updatePositions;

        window.addEventListener('scroll', this._scrollHandler, true);
        window.addEventListener('resize', this._resizeHandler);
    },

    removePositionListeners: function () {
        if (this._scrollHandler) {
            window.removeEventListener('scroll', this._scrollHandler, true);
            this._scrollHandler = null;
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
    },

    removeHighlights: function (removeListeners = true) {
        document.querySelectorAll('.lexguard-underline').forEach(el => el.remove());

        if (removeListeners) {
            this.removePositionListeners();
        }
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

    setInputText: function (text) {
        const input = this.getInputElement();
        if (!input) {
            console.warn('LexGuard: No input element found');
            return;
        }

        this.removeHighlights();

        if (input.contentEditable === 'true' || input.isContentEditable) {
            input.focus();

            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(input);
            selection.removeAllRanges();
            selection.addRange(range);

            document.execCommand('insertText', false, text);

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
    },

    // REPLACE FUNCTIONS
    replaceItem: function (index, action) {
        const item = this.detectedItems[index];
        if (!item) {
            console.warn('LexGuard: Item not found at index', index);
            return;
        }

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

        const currentText = this.getInputText();
        const newText = currentText.split(item.value).join(replacement);
        this.setInputText(newText);

        const patternName = t(`patterns.${item.type}`) || item.name;
        this.detectedItems = this.detectedItems.filter((_, i) => i !== index);

        LexGuard.ui.removeItem(index);
        this.showReplaceFeedback(patternName, action);

        if (this.detectedItems.length > 0) {
            setTimeout(() => this.showHighlights(), 100);
        }
    },

    replaceAll: function (action) {
        const t = LexGuard.t;
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

        this.setInputText(currentText);
        this.detectedItems = [];

        LexGuard.ui.hideBanner();
        this.unblockSendButton();
        this.removeHighlights();
        this.hasShaken = false;

        this.showReplaceFeedback(t('allItems'), action);
    },

    showReplaceFeedback: function (itemName, action) {
        const t = LexGuard.t;
        const actionText = {
            'placeholder': `${t('replacedWith')} ${t('placeholder')}`,
            'delete': t('deleted')
        };

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
        this.removeHighlights();
        LexGuard.ui.hideBanner();
        this.hasShaken = false;
    }
};

window.LexGuard = LexGuard;
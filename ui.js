var LexGuard = window.LexGuard || {};

LexGuard.ui = {
    banner: null,
    tooltip: null,
    replaceMenu: null,
    loadingOverlay: null,
    _documentClickHandler: null,

    /**
     * Initializes the UI components (banner, tooltip, loading overlay).
     * Should be called once when the extension loads.
     * @returns {void}
     */
    init: function () {
        this.createBanner();
        this.createTooltip();
        this.createLoadingOverlay();
    },

    // LOADING OVERLAY
    createLoadingOverlay: function () {
        if (document.getElementById('lexguard-loading')) {
            this.loadingOverlay = document.getElementById('lexguard-loading');
            return;
        }

        const t = LexGuard.t;
        const el = document.createElement('div');
        el.id = 'lexguard-loading';
        el.innerHTML = `
            <div class="lexguard-loading-content">
                <div class="lexguard-spinner"></div>
                <span class="lexguard-loading-text">${t('replacing')}</span>
            </div>
        `;
        document.body.appendChild(el);
        this.loadingOverlay = el;
    },

    /**
     * Shows the loading overlay and disables banner buttons during operations.
     * @returns {void}
     */
    showLoading: function () {
        if (!this.loadingOverlay) this.createLoadingOverlay();
        this.loadingOverlay.classList.add('visible');

        // Disable banner buttons while loading
        const buttons = document.querySelectorAll('#lexguard-banner button');
        buttons.forEach(btn => btn.disabled = true);
    },

    /**
     * Hides the loading overlay and re-enables banner buttons.
     * @returns {void}
     */
    hideLoading: function () {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('visible');
        }

        // Re-enable banner buttons
        const buttons = document.querySelectorAll('#lexguard-banner button');
        buttons.forEach(btn => btn.disabled = false);
    },

    // BANNER
    createBanner: function () {
        if (document.getElementById('lexguard-banner')) {
            this.banner = document.getElementById('lexguard-banner');
            return;
        }
        const t = LexGuard.t;

        const el = document.createElement('div');
        el.id = 'lexguard-banner';
        el.innerHTML = `
            <div class="lexguard-content">
                <div class="lexguard-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="11" width="18" height="11"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
                        <path d="M12 17.5V19"/>
                    </svg>
                </div>
                <div class="lexguard-text">
                    <span class="lexguard-title">${t('sensitiveDataDetected')}</span>
                    <span class="lexguard-count" id="lexguard-count">0</span>
                </div>
                <button class="lexguard-btn" id="lexguard-show">${t('details')}</button>
                <button class="lexguard-btn lexguard-btn-replace" id="lexguard-replace-all">${t('replaceAll')}</button>
                <button class="lexguard-btn lexguard-btn-review" id="lexguard-review">${t('reviewed')}</button>
                <button class="lexguard-close" id="lexguard-close">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="lexguard-details" id="lexguard-details"></div>
        `;

        document.body.appendChild(el);
        this.banner = el;

        // Create replace menu as separate element directly on body for better z-index
        let menuEl = document.getElementById('lexguard-replace-menu');
        if (!menuEl) {
            menuEl = document.createElement('div');
            menuEl.id = 'lexguard-replace-menu';
            menuEl.className = 'lexguard-replace-menu';
            menuEl.innerHTML = `
                <div class="lexguard-replace-option" data-action="placeholder">${t('replaceWithPlaceholder')}</div>
                <div class="lexguard-replace-option" data-action="delete">${t('deleteEntirely')}</div>
            `;
            document.body.appendChild(menuEl);
        }
        this.replaceMenu = menuEl;

        // Event listeners
        document.getElementById('lexguard-close').addEventListener('click', () => this.hideBanner());
        document.getElementById('lexguard-show').addEventListener('click', () => this.toggleDetails());
        document.getElementById('lexguard-review').addEventListener('click', () => LexGuard.scanner.handleReview());

        const replaceAllBtn = document.getElementById('lexguard-replace-all');
        replaceAllBtn.addEventListener('click', (e) => {
            if (LexGuard.scanner.isProcessing) return;
            LexGuard.logDebug('LexGuard: Replace All button clicked');
            e.preventDefault();
            e.stopPropagation();
            this.showReplaceMenu(e, 'all');
        });

        // Replace menu options 
        this.replaceMenu.addEventListener('click', (e) => {
            if (LexGuard.scanner.isProcessing) return;

            const option = e.target.closest('.lexguard-replace-option');
            if (!option) {
                LexGuard.logDebug('LexGuard: Click in menu but not on option');
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const action = option.dataset.action;
            const target = this.replaceMenu.dataset.target;
            LexGuard.logDebug('LexGuard: Replace option clicked', { action, target });

            this.hideReplaceMenu();

            if (target === 'all') {
                LexGuard.logDebug('LexGuard: Calling replaceAll with action:', action);
                LexGuard.scanner.replaceAll(action);
            } else {
                const index = parseInt(target, 10);
                LexGuard.logDebug('LexGuard: Calling replaceItem with index:', index, 'action:', action);
                LexGuard.scanner.replaceItem(index, action);
            }
        });

        // Close menu on outside click (single global handler, avoid leaks)
        if (!this._documentClickHandler) {
            this._documentClickHandler = (e) => {
                const isOnMenu = e.target.closest('.lexguard-replace-menu');
                const isOnReplaceAllBtn = e.target.closest('.lexguard-btn-replace');
                const isOnItemReplaceBtn = e.target.closest('.lexguard-item-replace');

                if (!isOnMenu && !isOnReplaceAllBtn && !isOnItemReplaceBtn) {
                    this.hideReplaceMenu();
                }
            };

            // Small delay so initial clicks that created the menu don't immediately close it
            setTimeout(() => {
                document.addEventListener('click', this._documentClickHandler);
            }, 100);
        }
    },

    // Completely remove banner and global listeners (used on language change)
    destroyBanner: function () {
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
            this._documentClickHandler = null;
        }

        if (this.banner) {
            this.banner.remove();
            this.banner = null;
        }

        if (this.replaceMenu) {
            this.replaceMenu.remove();
            this.replaceMenu = null;
        }
    },

    // Helper function to safely set text content (prevents XSS)
    _safeSetText: function (element, text) {
        if (element) {
            element.textContent = text;
        }
    },

    // Helper function to safely set HTML attribute (prevents XSS)
    _safeSetAttribute: function (element, attr, value) {
        if (element && value) {
            element.setAttribute(attr, LexGuard.utils.escapeHtml(value));
        }
    },

    /**
     * Displays the banner with detected sensitive data items.
     * @param {Array<Object>} items - Array of detected items, each containing:
     *   - {string} type - Pattern type key
     *   - {string} name - Human-readable name
     *   - {string} icon - Icon identifier
     *   - {string} severity - 'high' or 'medium'
     *   - {string} value - The detected sensitive value
     *   - {string} placeholder - Placeholder text for replacement
     * @returns {void}
     */
    showBanner: function (items) {
        if (!this.banner) this.createBanner();
        const t = LexGuard.t;

        // SVG icons for each pattern type
        const ITEM_ICONS = {
            website: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
            ssn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="6" y1="16" x2="14" y2="16"/></svg>',
            georgianId: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20"/><circle cx="12" cy="10" r="3"/><path d="M8 18c0-2.2 1.8-4 4-4s4 1.8 4 4"/></svg>',
            creditCard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
            iban: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M9 22v-4h6v4"/></svg>',
            passport: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
            email: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16"/><path d="M22 6l-10 7L2 6"/></svg>',
            phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
            georgianCompanyId: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M9 22v-4h6v4"/></svg>'
        };

        const highCount = items.filter(i => i.severity === 'high').length;
        const mediumCount = items.filter(i => i.severity === 'medium').length;

        const countEl = document.getElementById('lexguard-count');
        if (countEl) {
            // Fix XSS: Use DOM methods instead of innerHTML
            countEl.textContent = ''; // Clear first
            const highSpan = document.createElement('span');
            highSpan.className = 'high-count';
            highSpan.textContent = `${highCount} ${t('high')}`;
            const separator = document.createTextNode(' · ');
            const mediumSpan = document.createElement('span');
            mediumSpan.className = 'medium-count';
            mediumSpan.textContent = `${mediumCount} ${t('medium')}`;
            countEl.appendChild(highSpan);
            countEl.appendChild(separator);
            countEl.appendChild(mediumSpan);
        }

        const detailsEl = document.getElementById('lexguard-details');
        if (!detailsEl) return;

        detailsEl.textContent = ''; // Clear safely

        items.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = `lexguard-item severity-${item.severity}`;
            row.dataset.index = index;

            // Escape all user-controlled data where needed for attributes; use raw values for
            // dataset and textContent so masking and display lengths remain correct.
            const rawValue = item.value;
            const patternName = t(`patterns.${item.type}`) || item.name;
            const maskedValue = LexGuard.utils.maskValue(rawValue);

            // Use structured DOM APIs plus static SVG icon map to avoid XSS
            const iconSvg = ITEM_ICONS[item.type] || ITEM_ICONS.ssn;
            const escapedShowHide = LexGuard.utils.escapeHtml(t('showHideValue'));
            const escapedReplace = LexGuard.utils.escapeHtml(t('replace'));
            const escapedSeverity = LexGuard.utils.escapeHtml(item.severity === 'high' ? t('high') : t('medium'));

            // Create elements safely using DOM methods
            const iconSpan = document.createElement('span');
            iconSpan.className = 'lexguard-item-icon';
            // iconSvg comes from a trusted static map, so innerHTML here is safe
            iconSpan.innerHTML = iconSvg;

            const typeSpan = document.createElement('span');
            typeSpan.className = 'lexguard-item-type';
            typeSpan.textContent = patternName;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'lexguard-item-value';
            valueSpan.dataset.masked = 'true';
            // Store the original unescaped value so reveal/mask operations work with the correct
            // string length and users never see HTML entities; textContent keeps it safe in the DOM.
            valueSpan.dataset.original = rawValue;
            valueSpan.textContent = maskedValue;

            const eyeBtn = document.createElement('button');
            eyeBtn.className = 'lexguard-eye';
            eyeBtn.setAttribute('title', escapedShowHide);
            eyeBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            `;

            const replaceBtn = document.createElement('button');
            replaceBtn.className = 'lexguard-item-replace';
            replaceBtn.setAttribute('title', escapedReplace);
            replaceBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 1l4 4-4 4"/>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                    <path d="M7 23l-4-4 4-4"/>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
            `;

            const severitySpan = document.createElement('span');
            severitySpan.className = 'lexguard-item-severity';
            severitySpan.textContent = escapedSeverity;

            // Append all elements
            row.appendChild(iconSpan);
            row.appendChild(typeSpan);
            row.appendChild(valueSpan);
            row.appendChild(eyeBtn);
            row.appendChild(replaceBtn);
            row.appendChild(severitySpan);

            // Eye button - toggle mask (already created above, just get reference)
            const valueEl = valueSpan;

            eyeBtn.addEventListener('click', () => {
                const isMasked = valueEl.dataset.masked === 'true';
                const original = valueEl.dataset.original;

                if (isMasked) {
                    // Reveal original raw value; textContent handles escaping for safe display.
                    valueEl.textContent = original;
                    valueEl.dataset.masked = 'false';
                    valueEl.classList.add('revealed');
                } else {
                    // Re-mask using the original raw value so masking length is correct.
                    valueEl.textContent = LexGuard.utils.maskValue(original);
                    valueEl.dataset.masked = 'true';
                    valueEl.classList.remove('revealed');
                }
            });

            // Replace button (already created above)
            replaceBtn.addEventListener('click', (e) => {
                if (LexGuard.scanner.isProcessing) return;
                LexGuard.logDebug('LexGuard: Item replace button clicked, index:', index);
                e.preventDefault();
                e.stopPropagation();
                this.showReplaceMenu(e, index.toString());
            });

            detailsEl.appendChild(row);
        });

        this.banner.classList.add('visible');

        const reviewBtn = document.getElementById('lexguard-review');
        if (reviewBtn) {
            reviewBtn.style.display = LexGuard.SETTINGS.blockSendButton ? 'inline-flex' : 'none';
        }
    },

    /**
     * Hides the banner and collapses any expanded details.
     * @returns {void}
     */
    hideBanner: function () {
        if (this.banner) {
            this.banner.classList.remove('visible');
            this.banner.classList.remove('expanded');
            this.hideReplaceMenu();
        }
    },

    /**
     * Toggles the expanded/collapsed state of the banner details section.
     * @returns {void}
     */
    toggleDetails: function () {
        const t = LexGuard.t;
        if (this.banner) {
            this.banner.classList.toggle('expanded');
            const showBtn = document.getElementById('lexguard-show');
            if (showBtn) {
                showBtn.textContent = this.banner.classList.contains('expanded') ? t('hide') : t('details');
            }
        }
    },

    // REPLACE MENU
    showReplaceMenu: function (e, target) {
        LexGuard.logDebug('LexGuard: showReplaceMenu called', { target, replaceMenu: !!this.replaceMenu });
        if (!this.replaceMenu) {
            console.warn('LexGuard: replaceMenu not found!');
            return;
        }

        const rect = e.target.getBoundingClientRect();
        this.replaceMenu.style.top = (rect.bottom + 5) + 'px';
        this.replaceMenu.style.left = rect.left + 'px';
        this.replaceMenu.dataset.target = target;
        this.replaceMenu.classList.add('visible');
        LexGuard.logDebug('LexGuard: Menu should be visible now');
    },

    hideReplaceMenu: function () {
        if (this.replaceMenu) {
            this.replaceMenu.classList.remove('visible');
        }
    },

    /**
     * Removes a detected item from the banner display.
     * Updates item indices and hides banner if no items remain.
     * @param {number} index - Index of the item to remove
     * @returns {void}
     */
    removeItem: function (index) {
        const t = LexGuard.t;
        const item = document.querySelector(`.lexguard-item[data-index="${index}"]`);
        if (item) {
            item.classList.add('replaced');
            setTimeout(() => item.remove(), 300);
        }

        // Update remaining items' indices
        const items = LexGuard.scanner.detectedItems;
        if (items.length === 0) {
            this.hideBanner();
            LexGuard.scanner.unblockSendButton();
        } else {
            // Re-index remaining items
            document.querySelectorAll('.lexguard-item').forEach((el, i) => {
                el.dataset.index = i;
            });

            // Update count (fix XSS: use DOM methods)
            const highCount = items.filter(i => i.severity === 'high').length;
            const mediumCount = items.filter(i => i.severity === 'medium').length;
            const countEl = document.getElementById('lexguard-count');
            if (countEl) {
                countEl.textContent = '';
                const highSpan = document.createElement('span');
                highSpan.className = 'high-count';
                highSpan.textContent = `${highCount} ${t('high')}`;
                const separator = document.createTextNode(' · ');
                const mediumSpan = document.createElement('span');
                mediumSpan.className = 'medium-count';
                mediumSpan.textContent = `${mediumCount} ${t('medium')}`;
                countEl.appendChild(highSpan);
                countEl.appendChild(separator);
                countEl.appendChild(mediumSpan);
            }
        }
    },

    // TOOLTIP
    createTooltip: function () {
        if (document.getElementById('lexguard-tooltip')) {
            this.tooltip = document.getElementById('lexguard-tooltip');
            return;
        }
        const t = LexGuard.t;

        const el = document.createElement('div');
        el.id = 'lexguard-tooltip';
        el.textContent = t('reviewBeforeSending');
        document.body.appendChild(el);
        this.tooltip = el;
    },

    /**
     * Shows a tooltip near the send button when it's blocked.
     * @param {Event} e - Mouse event containing target element position
     * @returns {void}
     */
    showTooltip: function (e) {
        if (this.tooltip) {
            const rect = e.target.getBoundingClientRect();
            this.tooltip.style.left = (rect.left + rect.width / 2) + 'px';
            this.tooltip.style.top = (rect.top - 10) + 'px';
            this.tooltip.classList.add('visible');
        }
    },

    /**
     * Hides the tooltip.
     * @returns {void}
     */
    hideTooltip: function () {
        if (this.tooltip) {
            this.tooltip.classList.remove('visible');
        }
    },

    // TOAST
    /**
     * Displays a temporary toast notification message.
     * @param {string} message - The message to display
     * @returns {void}
     */
    showToast: function (message) {
        let toast = document.getElementById('lexguard-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'lexguard-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add('visible');

        setTimeout(() => {
            toast.classList.remove('visible');
        }, 2000);
    },

    /**
     * Applies a shake animation to the input element to draw attention.
     * Used when sensitive data is detected.
     * @returns {void}
     */
    shakeInput: function () {
        const input = document.querySelector('#prompt-textarea') ||
            document.querySelector('rich-textarea') ||
            document.querySelector('.ql-editor');

        if (input) {
            const container = input.closest('div[class*="composer"], div[class*="input"], form, rich-textarea') || input.parentElement;
            if (container) {
                container.classList.add('lexguard-shake');
                setTimeout(() => container.classList.remove('lexguard-shake'), 500);
            }
        }
    }
};

window.LexGuard = LexGuard;
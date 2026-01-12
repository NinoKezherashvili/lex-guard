var LexGuard = window.LexGuard || {};

LexGuard.ui = {
    banner: null,
    tooltip: null,
    replaceMenu: null,
    loadingOverlay: null,
    _documentClickHandler: null,

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

    showLoading: function () {
        if (!this.loadingOverlay) this.createLoadingOverlay();
        this.loadingOverlay.classList.add('visible');

        // Disable banner buttons while loading
        const buttons = document.querySelectorAll('#lexguard-banner button');
        buttons.forEach(btn => btn.disabled = true);
    },

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
        // const logoUrl = chrome.runtime.getURL('images/favicon.png');
        el.id = 'lexguard-banner';
        el.innerHTML = `
            <!-- Section 1: Header -->
          <div class="lexguard-header">
                <div class="lexguard-header-left">
                    <span class="lexguard-title">NyxGuard WARNING</span>
                </div>
            </div>

            <!-- Section 2: Stats -->
            <div class="lexguard-stats">
                <div class="lexguard-stats-title"> ${t('sensitiveDataDetected')}</div>
                <div class="lexguard-stats-row">
                    <div class="lexguard-stat">
                        <span class="lexguard-stat-number" id="lexguard-high-count">0</span>
                        <span class="lexguard-stat-label">${t('highRisk')}</span>
                    </div>
                    <div class="lexguard-stat-divider"></div>
                    <div class="lexguard-stat">
                        <span class="lexguard-stat-number" id="lexguard-medium-count">0</span>
                        <span class="lexguard-stat-label">${t('mediumRisk')}</span>
                    </div>
                    <div class="lexguard-stat-divider"></div>
                    <div class="lexguard-stat">
                        <span class="lexguard-stat-number" id="lexguard-low-count">0</span>
                        <span class="lexguard-stat-label">${t('lowRisk')}</span>
                    </div>
                </div>
            </div>

            <!-- Section 3: Actions -->
            <div class="lexguard-actions">
                <button class="lexguard-btn lexguard-btn-review" id="lexguard-review">${t('reviewed')}</button>
                <div class="lexguard-actions-right">
                    <button class="lexguard-btn lexguard-btn-details" id="lexguard-show">${t('details')}</button>
                    <button class="lexguard-btn lexguard-btn-replace" id="lexguard-replace-all">${t('replaceAll')}</button>
                </div>
            </div>

            <!-- Details Panel -->
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
        document.getElementById('lexguard-show').addEventListener('click', () => this.toggleDetails());
        document.getElementById('lexguard-review').addEventListener('click', () => LexGuard.scanner.handleReview());

        const replaceAllBtn = document.getElementById('lexguard-replace-all');
        replaceAllBtn.addEventListener('click', (e) => {
            if (LexGuard.scanner.isProcessing) return;
            console.log('LexGuard: Replace All button clicked');
            e.preventDefault();
            e.stopPropagation();
            this.showReplaceMenu(e, 'all');
        });

        // Replace menu options 
        this.replaceMenu.addEventListener('click', (e) => {
            if (LexGuard.scanner.isProcessing) return;

            const option = e.target.closest('.lexguard-replace-option');
            if (!option) {
                console.log('LexGuard: Click in menu but not on option');
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const action = option.dataset.action;
            const target = this.replaceMenu.dataset.target;
            console.log('LexGuard: Replace option clicked', { action, target });

            this.hideReplaceMenu();

            if (target === 'all') {
                console.log('LexGuard: Calling replaceAll with action:', action);
                LexGuard.scanner.replaceAll(action);
            } else {
                const index = parseInt(target, 10);
                console.log('LexGuard: Calling replaceItem with index:', index, 'action:', action);
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

    showBanner: function (items) {
        if (!this.banner) this.createBanner();
        const t = LexGuard.t;

        const highCount = items.filter(i => i.severity === 'high').length;
        const mediumCount = items.filter(i => i.severity === 'medium').length;
        const lowCount = items.filter(i => i.severity === 'low').length;
        const totalCount = items.length;

        // Update stats section
        const totalCountEl = document.getElementById('lexguard-total-count');
        const highCountEl = document.getElementById('lexguard-high-count');
        const mediumCountEl = document.getElementById('lexguard-medium-count');
        const lowCountEl = document.getElementById('lexguard-low-count');

        if (totalCountEl) totalCountEl.textContent = totalCount;
        if (highCountEl) highCountEl.textContent = highCount;
        if (mediumCountEl) mediumCountEl.textContent = mediumCount;
        if (lowCountEl) lowCountEl.textContent = lowCount;

        const detailsEl = document.getElementById('lexguard-details');
        if (!detailsEl) return;

        detailsEl.textContent = ''; // Clear safely

        // Group items by severity (high → medium → low)
        const severityOrder = ['high', 'medium', 'low'];
        const severityLabels = {
            high: t('high'),
            medium: t('medium'),
            low: t('low')
        };

        const groupedBySeverity = {};
        items.forEach((item, index) => {
            const severity = item.severity || 'low';
            if (!groupedBySeverity[severity]) {
                groupedBySeverity[severity] = [];
            }
            groupedBySeverity[severity].push({ ...item, originalIndex: index });
        });

        // Render groups in severity order
        severityOrder.forEach(severity => {
            const group = groupedBySeverity[severity];
            if (!group || group.length === 0) return;

            // Create group container
            const groupEl = document.createElement('div');
            groupEl.className = 'lexguard-group';

            // Create group header
            const headerEl = document.createElement('div');
            headerEl.className = `lexguard-group-header severity-${severity}`;

            const severitySpan = document.createElement('span');
            severitySpan.className = 'lexguard-group-type';
            severitySpan.textContent = `${severityLabels[severity]} (${group.length})`;

            headerEl.appendChild(severitySpan);
            groupEl.appendChild(headerEl);

            // Create items list
            const itemsListEl = document.createElement('div');
            itemsListEl.className = 'lexguard-group-items';

            group.forEach(item => {
                const row = document.createElement('div');
                row.className = 'lexguard-item';
                row.dataset.index = item.originalIndex;

                const rawValue = item.value;
                const maskedValue = LexGuard.utils.maskValue(rawValue);
                const escapedShowHide = LexGuard.utils.escapeHtml(t('showHideValue'));
                const escapedReplace = LexGuard.utils.escapeHtml(t('replace'));

                // Type label
                const typeLabel = document.createElement('span');
                typeLabel.className = 'lexguard-item-type';
                typeLabel.textContent = t(`patterns.${item.type}`) || item.name;

                // Value container with eye button inside
                const valueSpan = document.createElement('span');
                valueSpan.className = 'lexguard-item-value';
                valueSpan.dataset.masked = 'true';
                valueSpan.dataset.original = rawValue;

                // Text element inside value
                const textSpan = document.createElement('span');
                textSpan.className = 'lexguard-item-text';
                textSpan.textContent = maskedValue;

                // Eye button inside value
                const eyeBtn = document.createElement('button');
                eyeBtn.className = 'lexguard-eye';
                eyeBtn.setAttribute('title', escapedShowHide);
                eyeBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                `;

                valueSpan.appendChild(textSpan);
                valueSpan.appendChild(eyeBtn);

                // Replace button (outside value)
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

                row.appendChild(typeLabel);
                row.appendChild(valueSpan);
                row.appendChild(replaceBtn);

                // Eye button toggle
                eyeBtn.addEventListener('click', () => {
                    const isMasked = valueSpan.dataset.masked === 'true';
                    const original = valueSpan.dataset.original;

                    if (isMasked) {
                        textSpan.textContent = original;
                        valueSpan.dataset.masked = 'false';
                        valueSpan.classList.add('revealed');
                    } else {
                        textSpan.textContent = LexGuard.utils.maskValue(original);
                        valueSpan.dataset.masked = 'true';
                        valueSpan.classList.remove('revealed');
                    }
                });

                // Replace button
                replaceBtn.addEventListener('click', (e) => {
                    if (LexGuard.scanner.isProcessing) return;
                    console.log('LexGuard: Item replace button clicked, index:', item.originalIndex);
                    e.preventDefault();
                    e.stopPropagation();
                    this.showReplaceMenu(e, item.originalIndex.toString());
                });

                itemsListEl.appendChild(row);
            });

            groupEl.appendChild(itemsListEl);
            detailsEl.appendChild(groupEl);
        });

        this.banner.classList.add('visible');

        const reviewBtn = document.getElementById('lexguard-review');
        if (reviewBtn) {
            reviewBtn.style.display = LexGuard.SETTINGS.blockSendButton ? 'inline-flex' : 'none';
        }
    },

    hideBanner: function () {
        if (this.banner) {
            this.banner.classList.remove('visible');
            this.banner.classList.remove('expanded');
            this.hideReplaceMenu();
        }
    },

    toggleDetails: function () {
        if (this.banner) {
            this.banner.classList.toggle('expanded');
        }
    },

    // REPLACE MENU
    showReplaceMenu: function (e, target) {
        console.log('LexGuard: showReplaceMenu called', { target, replaceMenu: !!this.replaceMenu });
        if (!this.replaceMenu) {
            console.warn('LexGuard: replaceMenu not found!');
            return;
        }

        const rect = e.target.getBoundingClientRect();
        const menuWidth = 200; // min-width from CSS

        // Position menu to the left of the button
        this.replaceMenu.style.top = (rect.bottom + 5) + 'px';
        this.replaceMenu.style.left = (rect.right - menuWidth) + 'px';
        this.replaceMenu.dataset.target = target;
        this.replaceMenu.classList.add('visible');
        console.log('LexGuard: Menu should be visible now');
    },

    hideReplaceMenu: function () {
        if (this.replaceMenu) {
            this.replaceMenu.classList.remove('visible');
        }
    },

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

            // Update stats
            const highCount = items.filter(i => i.severity === 'high').length;
            const mediumCount = items.filter(i => i.severity === 'medium').length;

            const highCountEl = document.getElementById('lexguard-high-count');
            const mediumCountEl = document.getElementById('lexguard-medium-count');

            if (highCountEl) highCountEl.textContent = highCount;
            if (mediumCountEl) mediumCountEl.textContent = mediumCount;
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

    showTooltip: function (e) {
        if (this.tooltip) {
            const rect = e.target.getBoundingClientRect();
            this.tooltip.style.left = (rect.left + rect.width / 2) + 'px';
            this.tooltip.style.top = (rect.top - 10) + 'px';
            this.tooltip.classList.add('visible');
        }
    },

    hideTooltip: function () {
        if (this.tooltip) {
            this.tooltip.classList.remove('visible');
        }
    },

    // TOAST
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

    // SHAKE
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
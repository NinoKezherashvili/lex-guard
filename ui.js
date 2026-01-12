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

        const content = document.createElement('div');
        content.className = 'lexguard-loading-content';

        const spinner = document.createElement('div');
        spinner.className = 'lexguard-spinner';

        const text = document.createElement('span');
        text.className = 'lexguard-loading-text';
        text.textContent = t('replacing');

        content.appendChild(spinner);
        content.appendChild(text);
        el.appendChild(content);

        document.body.appendChild(el);
        this.loadingOverlay = el;
    },

    showLoading: function () {
        if (!this.loadingOverlay) this.createLoadingOverlay();
        this.loadingOverlay.classList.add('visible');

        const buttons = document.querySelectorAll('#lexguard-banner button');
        buttons.forEach(btn => btn.disabled = true);
    },

    hideLoading: function () {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('visible');
        }

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

        // Build banner using DOM methods to avoid innerHTML XSS risks
        // Section 1: Header
        const header = document.createElement('div');
        header.className = 'lexguard-header';

        const headerLeft = document.createElement('div');
        headerLeft.className = 'lexguard-header-left';

        const title = document.createElement('span');
        title.className = 'lexguard-title';
        title.textContent = 'LexyGuard WARNING';

        headerLeft.appendChild(title);
        header.appendChild(headerLeft);

        // Section 2: Stats
        const stats = document.createElement('div');
        stats.className = 'lexguard-stats';

        const statsTitle = document.createElement('div');
        statsTitle.className = 'lexguard-stats-title';
        statsTitle.textContent = t('sensitiveDataDetected');

        const statsRow = document.createElement('div');
        statsRow.className = 'lexguard-stats-row';

        // High stat
        const highStat = document.createElement('div');
        highStat.className = 'lexguard-stat';
        const highNumber = document.createElement('span');
        highNumber.className = 'lexguard-stat-number';
        highNumber.id = 'lexguard-high-count';
        highNumber.textContent = '0';
        const highLabel = document.createElement('span');
        highLabel.className = 'lexguard-stat-label';
        highLabel.textContent = t('highRisk');
        highStat.appendChild(highNumber);
        highStat.appendChild(highLabel);

        // Divider 1
        const divider1 = document.createElement('div');
        divider1.className = 'lexguard-stat-divider';

        // Medium stat
        const mediumStat = document.createElement('div');
        mediumStat.className = 'lexguard-stat';
        const mediumNumber = document.createElement('span');
        mediumNumber.className = 'lexguard-stat-number';
        mediumNumber.id = 'lexguard-medium-count';
        mediumNumber.textContent = '0';
        const mediumLabel = document.createElement('span');
        mediumLabel.className = 'lexguard-stat-label';
        mediumLabel.textContent = t('mediumRisk');
        mediumStat.appendChild(mediumNumber);
        mediumStat.appendChild(mediumLabel);

        // Divider 2
        const divider2 = document.createElement('div');
        divider2.className = 'lexguard-stat-divider';

        // Low stat
        const lowStat = document.createElement('div');
        lowStat.className = 'lexguard-stat';
        const lowNumber = document.createElement('span');
        lowNumber.className = 'lexguard-stat-number';
        lowNumber.id = 'lexguard-low-count';
        lowNumber.textContent = '0';
        const lowLabel = document.createElement('span');
        lowLabel.className = 'lexguard-stat-label';
        lowLabel.textContent = t('lowRisk');
        lowStat.appendChild(lowNumber);
        lowStat.appendChild(lowLabel);

        statsRow.appendChild(highStat);
        statsRow.appendChild(divider1);
        statsRow.appendChild(mediumStat);
        statsRow.appendChild(divider2);
        statsRow.appendChild(lowStat);

        stats.appendChild(statsTitle);
        stats.appendChild(statsRow);

        // Section 3: Actions
        const actions = document.createElement('div');
        actions.className = 'lexguard-actions';

        const reviewBtn = document.createElement('button');
        reviewBtn.className = 'lexguard-btn lexguard-btn-review';
        reviewBtn.id = 'lexguard-review';
        reviewBtn.textContent = t('reviewed');

        const actionsRight = document.createElement('div');
        actionsRight.className = 'lexguard-actions-right';

        const detailsBtn = document.createElement('button');
        detailsBtn.className = 'lexguard-btn lexguard-btn-details';
        detailsBtn.id = 'lexguard-show';
        detailsBtn.textContent = t('details');

        const replaceAllBtn = document.createElement('button');
        replaceAllBtn.className = 'lexguard-btn lexguard-btn-replace';
        replaceAllBtn.id = 'lexguard-replace-all';
        replaceAllBtn.textContent = t('replaceAll');

        actionsRight.appendChild(detailsBtn);
        actionsRight.appendChild(replaceAllBtn);

        actions.appendChild(reviewBtn);
        actions.appendChild(actionsRight);

        // Details Panel
        const details = document.createElement('div');
        details.className = 'lexguard-details';
        details.id = 'lexguard-details';

        // Assemble banner
        el.appendChild(header);
        el.appendChild(stats);
        el.appendChild(actions);
        el.appendChild(details);

        document.body.appendChild(el);
        this.banner = el;

        // Create replace menu
        let menuEl = document.getElementById('lexguard-replace-menu');
        if (!menuEl) {
            menuEl = document.createElement('div');
            menuEl.id = 'lexguard-replace-menu';
            menuEl.className = 'lexguard-replace-menu';

            const placeholderOption = document.createElement('div');
            placeholderOption.className = 'lexguard-replace-option';
            placeholderOption.dataset.action = 'placeholder';
            placeholderOption.textContent = t('replaceWithPlaceholder');

            const deleteOption = document.createElement('div');
            deleteOption.className = 'lexguard-replace-option';
            deleteOption.dataset.action = 'delete';
            deleteOption.textContent = t('deleteEntirely');

            menuEl.appendChild(placeholderOption);
            menuEl.appendChild(deleteOption);

            document.body.appendChild(menuEl);
        }
        this.replaceMenu = menuEl;

        // Event listeners
        detailsBtn.addEventListener('click', () => this.toggleDetails());
        reviewBtn.addEventListener('click', () => LexGuard.scanner.handleReview());

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

        // Close menu on outside click
        if (!this._documentClickHandler) {
            this._documentClickHandler = (e) => {
                const isOnMenu = e.target.closest('.lexguard-replace-menu');
                const isOnReplaceAllBtn = e.target.closest('.lexguard-btn-replace');
                const isOnItemReplaceBtn = e.target.closest('.lexguard-item-replace');

                if (!isOnMenu && !isOnReplaceAllBtn && !isOnItemReplaceBtn) {
                    this.hideReplaceMenu();
                }
            };

            setTimeout(() => {
                document.addEventListener('click', this._documentClickHandler);
            }, 100);
        }
    },

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

    _safeSetText: function (element, text) {
        if (element) {
            element.textContent = text;
        }
    },

    _safeSetAttribute: function (element, attr, value) {
        if (element && value) {
            element.setAttribute(attr, LexGuard.utils.escapeHtml(value));
        }
    },

    _createSvgElement: function (svgString) {
        const template = document.createElement('template');
        template.innerHTML = svgString.trim();
        return template.content.firstChild;
    },

    showBanner: function (items) {
        if (!this.banner) this.createBanner();
        const t = LexGuard.t;

        const highCount = items.filter(i => i.severity === 'high').length;
        const mediumCount = items.filter(i => i.severity === 'medium').length;
        const lowCount = items.filter(i => i.severity === 'low').length;

        const highCountEl = document.getElementById('lexguard-high-count');
        const mediumCountEl = document.getElementById('lexguard-medium-count');
        const lowCountEl = document.getElementById('lexguard-low-count');

        if (highCountEl) highCountEl.textContent = highCount;
        if (mediumCountEl) mediumCountEl.textContent = mediumCount;
        if (lowCountEl) lowCountEl.textContent = lowCount;

        const detailsEl = document.getElementById('lexguard-details');
        if (!detailsEl) return;

        detailsEl.textContent = '';

        // Group items by type
        const groupedItems = {};
        items.forEach((item, index) => {
            if (!groupedItems[item.type]) {
                groupedItems[item.type] = {
                    name: t(`patterns.${item.type}`) || item.name,
                    severity: item.severity,
                    items: []
                };
            }
            groupedItems[item.type].items.push({ ...item, originalIndex: index });
        });

        // Render grouped items
        Object.keys(groupedItems).forEach(type => {
            const group = groupedItems[type];

            const groupEl = document.createElement('div');
            groupEl.className = 'lexguard-group';

            const headerEl = document.createElement('div');
            headerEl.className = `lexguard-group-header severity-${group.severity}`;

            const typeSpan = document.createElement('span');
            typeSpan.className = 'lexguard-group-type';
            typeSpan.textContent = group.name;

            const severitySpan = document.createElement('span');
            severitySpan.className = 'lexguard-group-severity';
            severitySpan.textContent = group.severity === 'high' ? t('high') : (group.severity === 'medium' ? t('medium') : t('low'));

            headerEl.appendChild(typeSpan);
            headerEl.appendChild(severitySpan);
            groupEl.appendChild(headerEl);

            const itemsListEl = document.createElement('div');
            itemsListEl.className = 'lexguard-group-items';

            group.items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'lexguard-item';
                row.dataset.index = item.originalIndex;

                const rawValue = item.value;
                const maskedValue = LexGuard.utils.maskValue(rawValue);

                const valueSpan = document.createElement('span');
                valueSpan.className = 'lexguard-item-value';
                valueSpan.dataset.masked = 'true';
                valueSpan.dataset.original = rawValue;

                const textSpan = document.createElement('span');
                textSpan.className = 'lexguard-item-text';
                textSpan.textContent = maskedValue;

                const eyeBtn = document.createElement('button');
                eyeBtn.className = 'lexguard-eye';
                eyeBtn.setAttribute('title', t('showHideValue'));

                const eyeSvg = this._createSvgElement(`
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                `);
                eyeBtn.appendChild(eyeSvg);

                valueSpan.appendChild(textSpan);
                valueSpan.appendChild(eyeBtn);

                const replaceBtn = document.createElement('button');
                replaceBtn.className = 'lexguard-item-replace';
                replaceBtn.setAttribute('title', t('replace'));

                const replaceSvg = this._createSvgElement(`
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 1l4 4-4 4"/>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                        <path d="M7 23l-4-4 4-4"/>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                    </svg>
                `);
                replaceBtn.appendChild(replaceSvg);

                row.appendChild(valueSpan);
                row.appendChild(replaceBtn);

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
            reviewBtn.classList.toggle('hidden', !LexGuard.SETTINGS.blockSendButton);
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

    // REPLACE MENU - Using CSS custom properties instead of inline styles
    showReplaceMenu: function (e, target) {
        console.log('LexGuard: showReplaceMenu called', { target, replaceMenu: !!this.replaceMenu });
        if (!this.replaceMenu) {
            console.warn('LexGuard: replaceMenu not found!');
            return;
        }

        const rect = e.target.getBoundingClientRect();
        const menuWidth = 200;

        // Use CSS custom properties instead of inline styles (CSP compliant)
        this.replaceMenu.style.setProperty('--menu-top', (rect.bottom + 5) + 'px');
        this.replaceMenu.style.setProperty('--menu-left', (rect.right - menuWidth) + 'px');
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
        const item = document.querySelector(`.lexguard-item[data-index="${index}"]`);
        if (item) {
            item.classList.add('replaced');
            setTimeout(() => item.remove(), 300);
        }

        const items = LexGuard.scanner.detectedItems;
        if (items.length === 0) {
            this.hideBanner();
            LexGuard.scanner.unblockSendButton();
        } else {
            document.querySelectorAll('.lexguard-item').forEach((el, i) => {
                el.dataset.index = i;
            });

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

    // Using CSS custom properties instead of inline styles (CSP compliant)
    showTooltip: function (e) {
        if (this.tooltip) {
            const rect = e.target.getBoundingClientRect();
            this.tooltip.style.setProperty('--tooltip-left', (rect.left + rect.width / 2) + 'px');
            this.tooltip.style.setProperty('--tooltip-top', (rect.top - 10) + 'px');
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
var LexGuard = window.LexGuard || {};

LexGuard.ui = {
    banner: null,
    tooltip: null,
    replaceMenu: null,

    init: function () {
        this.createBanner();
        this.createTooltip();
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                </div>
                <div class="lexguard-text">
                    <span class="lexguard-title">${t('sensitiveDataDetected')}</span>
                    <span class="lexguard-count" id="lexguard-count">0</span>
                </div>
                <button class="lexguard-btn" id="lexguard-show">${t('details')}</button>
                <button class="lexguard-btn lexguard-btn-replace" id="lexguard-replace-all">${t('replaceAll')}</button>
                <button class="lexguard-btn lexguard-btn-review" id="lexguard-review">${t('reviewed')}</button>
                <button class="lexguard-close" id="lexguard-close">×</button>
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
            console.log('LexGuard: Replace All button clicked');
            e.preventDefault();
            e.stopPropagation();
            this.showReplaceMenu(e, 'all');
        });

        // Replace menu options 
        this.replaceMenu.addEventListener('click', (e) => {
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
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                const isOnMenu = e.target.closest('.lexguard-replace-menu');
                const isOnReplaceAllBtn = e.target.closest('.lexguard-btn-replace');
                const isOnItemReplaceBtn = e.target.closest('.lexguard-item-replace');

                if (!isOnMenu && !isOnReplaceAllBtn && !isOnItemReplaceBtn) {
                    this.hideReplaceMenu();
                }
            });
        }, 100);
    },

    showBanner: function (items) {
        if (!this.banner) this.createBanner();
        const t = LexGuard.t;

        const highCount = items.filter(i => i.severity === 'high').length;
        const mediumCount = items.filter(i => i.severity === 'medium').length;

        const countEl = document.getElementById('lexguard-count');
        if (countEl) {
            countEl.innerHTML = `<span class="high-count">${highCount} ${t('high')}</span> · <span class="medium-count">${mediumCount} ${t('medium')}</span>`;
        }

        const detailsEl = document.getElementById('lexguard-details');
        if (!detailsEl) return;

        detailsEl.innerHTML = '';

        items.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = `lexguard-item severity-${item.severity}`;
            row.dataset.index = index;

            const patternName = t(`patterns.${item.type}`) || item.name;
            const maskedValue = LexGuard.utils.maskValue(item.value);
            const escapedValue = LexGuard.utils.escapeHtml(item.value);

            row.innerHTML = `
                <span class="lexguard-item-icon">${item.icon}</span>
                <span class="lexguard-item-type">${patternName}</span>
                <span class="lexguard-item-value" data-masked="true" data-original="${escapedValue}">${maskedValue}</span>
                <button class="lexguard-eye" title="${t('showHideValue')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
                <button class="lexguard-item-replace" title="${t('replace')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 1l4 4-4 4"/>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                        <path d="M7 23l-4-4 4-4"/>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                    </svg>
                </button>
                <span class="lexguard-item-severity">${item.severity === 'high' ? t('high') : t('medium')}</span>
            `;

            // Eye button - toggle mask
            const eyeBtn = row.querySelector('.lexguard-eye');
            const valueEl = row.querySelector('.lexguard-item-value');

            eyeBtn.addEventListener('click', () => {
                const isMasked = valueEl.dataset.masked === 'true';
                const original = valueEl.dataset.original;

                if (isMasked) {
                    valueEl.textContent = original;
                    valueEl.dataset.masked = 'false';
                    valueEl.classList.add('revealed');
                } else {
                    valueEl.textContent = LexGuard.utils.maskValue(original);
                    valueEl.dataset.masked = 'true';
                    valueEl.classList.remove('revealed');
                }
            });

            // Replace button
            const replaceBtn = row.querySelector('.lexguard-item-replace');
            replaceBtn.addEventListener('click', (e) => {
                console.log('LexGuard: Item replace button clicked, index:', index);
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

    hideBanner: function () {
        if (this.banner) {
            this.banner.classList.remove('visible');
            this.banner.classList.remove('expanded');
            this.hideReplaceMenu();
        }
    },

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
        console.log('LexGuard: showReplaceMenu called', { target, replaceMenu: !!this.replaceMenu });
        if (!this.replaceMenu) {
            console.warn('LexGuard: replaceMenu not found!');
            return;
        }

        const rect = e.target.getBoundingClientRect();
        this.replaceMenu.style.top = (rect.bottom + 5) + 'px';
        this.replaceMenu.style.left = rect.left + 'px';
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

            // Update count
            const highCount = items.filter(i => i.severity === 'high').length;
            const mediumCount = items.filter(i => i.severity === 'medium').length;
            const countEl = document.getElementById('lexguard-count');
            if (countEl) {
                countEl.innerHTML = `<span class="high-count">${highCount} ${t('high')}</span> · <span class="medium-count">${mediumCount} ${t('medium')}</span>`;
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

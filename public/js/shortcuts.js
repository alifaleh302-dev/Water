/**
 * Keyboard Shortcuts & UX Enhancements
 * Phase 3: Input Optimization
 *
 * Global shortcuts:
 *   Alt+1..9    → Navigate to nav item
 *   Ctrl+S      → Save active form (closest [data-save-btn])
 *   Ctrl+N      → Trigger primary action button on page (data-quick-new)
 *   Esc         → Close modal / collapse open form
 *   F2          → Edit selected row (if data-row-selected)
 *   Ctrl+/      → Show shortcut help
 *   /           → Focus search input
 *   F9          → Open invoice modal (quick add)
 */
(function (global) {
    'use strict';

    const Shortcuts = {
        registered: new Map(),

        init() {
            document.addEventListener('keydown', this._handle.bind(this));
            this._injectHelpModal();
        },

        register(combo, handler, description = '') {
            this.registered.set(combo.toLowerCase(), { handler, description });
        },

        _handle(e) {
            // Ignore if user is typing in input/textarea (except for global shortcuts)
            const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
            const combo = this._buildCombo(e);

            // Always-active shortcuts (work even in inputs)
            const globalAlways = ['ctrl+s', 'escape', 'ctrl+enter'];
            if (!globalAlways.includes(combo) && inField && !e.ctrlKey && !e.altKey) return;

            const reg = this.registered.get(combo);
            if (reg) {
                e.preventDefault();
                reg.handler(e);
                return;
            }

            // Built-in shortcuts
            switch (combo) {
                case 'ctrl+s':
                    e.preventDefault();
                    this._triggerSave();
                    break;
                case 'escape':
                    this._closeTopModal();
                    break;
                case 'ctrl+n':
                    e.preventDefault();
                    this._triggerNew();
                    break;
                case 'f9':
                    e.preventDefault();
                    if (typeof openNewInvoice === 'function') openNewInvoice();
                    break;
                case 'f2':
                    this._editSelected();
                    break;
                case 'ctrl+/':
                    e.preventDefault();
                    this._showHelp();
                    break;
                case '/':
                    if (!inField) { e.preventDefault(); this._focusSearch(); }
                    break;
                case 'alt+1': case 'alt+2': case 'alt+3':
                case 'alt+4': case 'alt+5': case 'alt+6':
                case 'alt+7': case 'alt+8': case 'alt+9':
                    e.preventDefault();
                    this._navByIndex(parseInt(combo.split('+')[1]) - 1);
                    break;
            }
        },

        _buildCombo(e) {
            const parts = [];
            if (e.ctrlKey || e.metaKey) parts.push('ctrl');
            if (e.altKey) parts.push('alt');
            if (e.shiftKey) parts.push('shift');
            const key = (e.key || '').toLowerCase();
            if (!['control', 'alt', 'shift', 'meta'].includes(key)) parts.push(key);
            return parts.join('+');
        },

        _triggerSave() {
            // 1. Visible modal save button
            const modalSave = document.querySelector('.modal-backdrop.show button[id^="save"]:not([disabled])');
            if (modalSave) { modalSave.click(); return; }
            // 2. Visible card with form
            const cardSave = document.querySelector('.card:not([style*="display:none"]):not([style*="display: none"]) button[id^="save"]:not([disabled])');
            if (cardSave) { cardSave.click(); return; }
            // 3. Generic save button
            const anySave = document.querySelector('[data-save-btn]:not([disabled])');
            if (anySave) anySave.click();
        },

        _triggerNew() {
            const btn = document.querySelector('[data-quick-new]') ||
                        document.querySelector('.page-header .btn-primary');
            if (btn) btn.click();
        },

        _closeTopModal() {
            const open = document.querySelector('.modal-backdrop.show');
            if (open) {
                open.classList.remove('show');
                document.body.style.overflow = '';
                return;
            }
            // Close any expanded card-form
            const expandedForm = document.querySelector('[id$="FormCard"]:not([style*="display:none"]):not([style*="display: none"])');
            if (expandedForm) expandedForm.style.display = 'none';
        },

        _editSelected() {
            const row = document.querySelector('tr.row-selected');
            if (row) {
                const editBtn = row.querySelector('[onclick*="edit"]');
                if (editBtn) editBtn.click();
            }
        },

        _focusSearch() {
            const search = document.querySelector('input[placeholder*="بحث"], input[id*="Search"]');
            if (search) search.focus();
        },

        _navByIndex(idx) {
            const items = document.querySelectorAll('.sidebar-nav a[data-page]');
            if (items[idx]) items[idx].click();
        },

        _injectHelpModal() {
            if (document.getElementById('shortcutsHelpModal')) return;
            const html = `
            <div class="modal-backdrop" id="shortcutsHelpModal">
                <div class="modal-dialog" style="max-width:560px;">
                    <div class="modal-header">
                        <h3>⌨️ اختصارات لوحة المفاتيح</h3>
                        <button class="modal-close" onclick="closeModal('shortcutsHelpModal')">×</button>
                    </div>
                    <div class="modal-body">
                        <table class="shortcut-table">
                            <tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>حفظ النموذج الحالي</td></tr>
                            <tr><td><kbd>Ctrl</kbd>+<kbd>N</kbd></td><td>إضافة جديد</td></tr>
                            <tr><td><kbd>Esc</kbd></td><td>إغلاق النافذة المنبثقة</td></tr>
                            <tr><td><kbd>F9</kbd></td><td>فاتورة جديدة سريعة</td></tr>
                            <tr><td><kbd>F2</kbd></td><td>تعديل الصف المحدد</td></tr>
                            <tr><td><kbd>/</kbd></td><td>التركيز على البحث</td></tr>
                            <tr><td><kbd>Alt</kbd>+<kbd>1..9</kbd></td><td>التنقل بين الأقسام</td></tr>
                            <tr><td><kbd>Enter</kbd></td><td>الانتقال للحقل التالي</td></tr>
                            <tr><td><kbd>Ctrl</kbd>+<kbd>Enter</kbd></td><td>تأكيد وحفظ</td></tr>
                            <tr><td><kbd>Ctrl</kbd>+<kbd>/</kbd></td><td>عرض هذه القائمة</td></tr>
                        </table>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        },

        _showHelp() {
            const m = document.getElementById('shortcutsHelpModal');
            if (m) m.classList.add('show');
        }
    };

    document.addEventListener('DOMContentLoaded', () => Shortcuts.init());
    if (document.readyState !== 'loading') Shortcuts.init();

    global.Shortcuts = Shortcuts;
})(window);

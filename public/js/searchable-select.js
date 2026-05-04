/**
 * Searchable Select — UX Enhancement
 * Phase 3: Replaces native <select> with autocomplete-friendly dropdown
 *
 * Usage:
 *   const ss = SearchableSelect.create('selectId', { placeholder: 'بحث...' });
 *   ss.load([{value, label, sublabel?}]);
 *   ss.value;             // get
 *   ss.value = 'id';      // set
 *   ss.onChange = (v) => {};
 */
(function (global) {
    'use strict';

    let counter = 0;

    class SearchableSelect {
        constructor(targetId, options = {}) {
            this.id = ++counter;
            this.target = document.getElementById(targetId);
            if (!this.target) throw new Error('Target not found: ' + targetId);

            this.opts = Object.assign({
                placeholder: 'بحث أو اختيار...',
                emptyText: 'لا توجد نتائج',
                searchable: true,
                clearable: true
            }, options);

            this.items = [];
            this._value = '';
            this._filteredItems = [];
            this.onChange = null;

            this._build();
        }

        _build() {
            // Hide native select but keep its name for form submission
            this.target.style.display = 'none';

            const wrap = document.createElement('div');
            wrap.className = 'ss-wrapper';
            wrap.innerHTML = `
                <div class="ss-control">
                    <input type="text" class="ss-input form-control" placeholder="${this.opts.placeholder}" autocomplete="off">
                    <span class="ss-arrow">▾</span>
                </div>
                <div class="ss-dropdown" hidden>
                    <div class="ss-list"></div>
                </div>`;
            this.target.parentNode.insertBefore(wrap, this.target.nextSibling);

            this.wrap = wrap;
            this.input = wrap.querySelector('.ss-input');
            this.dropdown = wrap.querySelector('.ss-dropdown');
            this.list = wrap.querySelector('.ss-list');

            this._attachEvents();
        }

        _attachEvents() {
            this.input.addEventListener('focus', () => this._open());
            this.input.addEventListener('input', () => {
                this._filter(this.input.value);
                this._open();
            });
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); this._highlightNext(1); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); this._highlightNext(-1); }
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    const sel = this.list.querySelector('.ss-item.highlighted');
                    if (sel) this._select(sel.dataset.value);
                }
                else if (e.key === 'Escape') this._close();
            });
            document.addEventListener('click', (e) => {
                if (!this.wrap.contains(e.target)) this._close();
            });
        }

        load(items) {
            this.items = Array.isArray(items) ? items : [];
            this._filter('');
            this._renderList();
        }

        _filter(q) {
            const t = (q || '').trim().toLowerCase();
            this._filteredItems = !t ? this.items.slice() :
                this.items.filter(i =>
                    (i.label || '').toLowerCase().includes(t) ||
                    (i.sublabel || '').toLowerCase().includes(t)
                );
            this._renderList();
        }

        _renderList() {
            if (!this._filteredItems.length) {
                this.list.innerHTML = `<div class="ss-empty">${this.opts.emptyText}</div>`;
                return;
            }
            this.list.innerHTML = this._filteredItems.map((it, idx) => `
                <div class="ss-item ${idx === 0 ? 'highlighted' : ''}" data-value="${it.value}">
                    <div class="ss-item-label">${escapeHtml(it.label)}</div>
                    ${it.sublabel ? `<div class="ss-item-sub">${escapeHtml(it.sublabel)}</div>` : ''}
                </div>
            `).join('');
            this.list.querySelectorAll('.ss-item').forEach(el => {
                el.addEventListener('click', () => this._select(el.dataset.value));
                el.addEventListener('mouseenter', () => {
                    this.list.querySelectorAll('.ss-item').forEach(x => x.classList.remove('highlighted'));
                    el.classList.add('highlighted');
                });
            });
        }

        _highlightNext(dir) {
            const items = Array.from(this.list.querySelectorAll('.ss-item'));
            if (!items.length) return;
            let idx = items.findIndex(i => i.classList.contains('highlighted'));
            idx = (idx + dir + items.length) % items.length;
            items.forEach(i => i.classList.remove('highlighted'));
            items[idx].classList.add('highlighted');
            items[idx].scrollIntoView({ block: 'nearest' });
        }

        _select(value) {
            const it = this.items.find(i => String(i.value) === String(value));
            if (!it) return;
            this._value = it.value;
            this.input.value = it.label;
            this.target.value = it.value;
            this.target.dispatchEvent(new Event('change', { bubbles: true }));
            if (typeof this.onChange === 'function') this.onChange(it.value, it);
            this._close();
        }

        _open() { this.dropdown.hidden = false; this.wrap.classList.add('open'); }
        _close() { this.dropdown.hidden = true; this.wrap.classList.remove('open'); }

        get value() { return this._value; }
        set value(v) {
            const it = this.items.find(i => String(i.value) === String(v));
            if (it) {
                this._value = it.value;
                this.input.value = it.label;
                this.target.value = it.value;
            } else {
                this._value = '';
                this.input.value = '';
                this.target.value = '';
            }
        }

        clear() { this.value = ''; }
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    global.SearchableSelect = {
        create(id, opts) { return new SearchableSelect(id, opts); }
    };
})(window);

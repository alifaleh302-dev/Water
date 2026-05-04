/**
 * Draft Manager — Data Resilience Layer
 * Phase 2: Zero-loss persistence using IndexedDB + Server sync fallback
 *
 * Design:
 *  - IndexedDB primary store (offline-tolerant, larger quota)
 *  - localStorage fallback (browser quota: ~5MB)
 *  - Server sync (cross-device) every 5 seconds when online
 *  - Auto-save every 1.5 seconds while user types
 *  - Visual indicator: 🟢 saved | 🟡 saving | 🔴 unsaved (offline)
 */
(function (global) {
    'use strict';

    const DB_NAME = 'water_drafts_db';
    const DB_VERSION = 1;
    const STORE = 'drafts';
    const AUTO_SAVE_DELAY = 1500;
    const SERVER_SYNC_DELAY = 5000;
    const LS_PREFIX = 'water_draft_';

    let dbPromise = null;
    let activeForms = new Map(); // formId -> {key, timer, syncTimer, status}

    // ============================
    // IndexedDB wrapper
    // ============================
    function openDB() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            try {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE)) {
                        const os = db.createObjectStore(STORE, { keyPath: 'key' });
                        os.createIndex('updated_at', 'updated_at', { unique: false });
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            } catch (e) { reject(e); }
        }).catch(() => null); // null means IndexedDB unavailable
        return dbPromise;
    }

    async function idbPut(record) {
        const db = await openDB();
        if (!db) return false;
        return new Promise((res) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(record);
            tx.oncomplete = () => res(true);
            tx.onerror = () => res(false);
        });
    }
    async function idbGet(key) {
        const db = await openDB();
        if (!db) return null;
        return new Promise((res) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(key);
            req.onsuccess = () => res(req.result || null);
            req.onerror = () => res(null);
        });
    }
    async function idbDelete(key) {
        const db = await openDB();
        if (!db) return;
        return new Promise((res) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(key);
            tx.oncomplete = () => res(true);
            tx.onerror = () => res(false);
        });
    }
    async function idbList() {
        const db = await openDB();
        if (!db) return [];
        return new Promise((res) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).getAll();
            req.onsuccess = () => res(req.result || []);
            req.onerror = () => res([]);
        });
    }

    // ============================
    // localStorage fallback
    // ============================
    function lsPut(key, data) {
        try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(data)); return true; }
        catch (e) { return false; }
    }
    function lsGet(key) {
        try { const v = localStorage.getItem(LS_PREFIX + key); return v ? JSON.parse(v) : null; }
        catch (e) { return null; }
    }
    function lsDelete(key) {
        try { localStorage.removeItem(LS_PREFIX + key); } catch (e) {}
    }
    function lsList() {
        const out = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(LS_PREFIX)) {
                try { out.push(JSON.parse(localStorage.getItem(k))); } catch (e) {}
            }
        }
        return out;
    }

    // ============================
    // Server sync
    // ============================
    async function serverPut(key, data) {
        try {
            const r = await fetch('/api/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ key, data })
            });
            return r.ok;
        } catch (e) { return false; }
    }
    async function serverGet(key) {
        try {
            const r = await fetch('/api/drafts/show?key=' + encodeURIComponent(key), { credentials: 'same-origin' });
            const j = await r.json();
            if (j && j.status === 'success' && j.data) {
                try { return JSON.parse(j.data.draft_data); } catch (e) { return null; }
            }
        } catch (e) {}
        return null;
    }
    async function serverDelete(key) {
        try {
            await fetch('/api/drafts?key=' + encodeURIComponent(key), {
                method: 'DELETE', credentials: 'same-origin'
            });
        } catch (e) {}
    }

    // ============================
    // Public API
    // ============================
    const DraftManager = {
        async save(key, data) {
            const record = { key, data, updated_at: Date.now() };
            const ok = await idbPut(record);
            if (!ok) lsPut(key, record);
            return true;
        },

        async load(key) {
            // Strategy: IndexedDB (fastest) → localStorage → server
            let r = await idbGet(key);
            if (r) return r.data;
            r = lsGet(key);
            if (r) return r.data;
            const sd = await serverGet(key);
            if (sd) return sd;
            return null;
        },

        async clear(key) {
            await idbDelete(key);
            lsDelete(key);
            serverDelete(key); // fire-and-forget
        },

        async list() {
            const idb = await idbList();
            if (idb.length) return idb;
            return lsList();
        },

        /**
         * Bind auto-save to a form
         * @param formId form element id
         * @param key draft key (e.g. "invoice_modal")
         * @param options {indicator: el, autoSave: bool, serverSync: bool}
         */
        bindForm(formId, key, options = {}) {
            const form = document.getElementById(formId);
            if (!form) return;

            const opts = Object.assign({
                autoSave: true,
                serverSync: true,
                indicator: null
            }, options);

            // Cleanup previous binding
            if (activeForms.has(formId)) {
                const prev = activeForms.get(formId);
                clearTimeout(prev.timer);
                clearTimeout(prev.syncTimer);
                form.removeEventListener('input', prev.handler);
            }

            const ctx = { key, status: 'saved', timer: null, syncTimer: null, handler: null };

            const collect = () => {
                const data = {};
                form.querySelectorAll('[name]').forEach(el => {
                    if (el.type === 'checkbox') data[el.name] = el.checked;
                    else if (el.type === 'radio') {
                        if (el.checked) data[el.name] = el.value;
                    } else data[el.name] = el.value;
                });
                return data;
            };

            const updateIndicator = (status) => {
                ctx.status = status;
                if (opts.indicator) {
                    const map = {
                        saved:   { icon: '🟢', text: 'محفوظ', cls: 'draft-saved'   },
                        saving:  { icon: '🟡', text: 'جاري الحفظ…', cls: 'draft-saving' },
                        offline: { icon: '🔴', text: 'غير متصل (محلي فقط)', cls: 'draft-offline' },
                        synced:  { icon: '☁️', text: 'مزامن سحابياً', cls: 'draft-synced' },
                        empty:   { icon: '⚪', text: 'فارغ', cls: 'draft-empty' }
                    };
                    const m = map[status] || map.saved;
                    opts.indicator.innerHTML = `<span class="${m.cls}">${m.icon} ${m.text}</span>`;
                }
            };

            const handler = () => {
                clearTimeout(ctx.timer);
                clearTimeout(ctx.syncTimer);
                updateIndicator('saving');

                ctx.timer = setTimeout(async () => {
                    const data = collect();
                    // Skip if entirely empty
                    const hasData = Object.values(data).some(v => v !== '' && v !== null && v !== undefined && v !== false);
                    if (!hasData) {
                        updateIndicator('empty');
                        return;
                    }
                    await DraftManager.save(key, data);
                    updateIndicator('saved');

                    if (opts.serverSync) {
                        ctx.syncTimer = setTimeout(async () => {
                            const ok = await serverPut(key, data);
                            updateIndicator(ok ? 'synced' : 'saved');
                        }, SERVER_SYNC_DELAY);
                    }
                }, AUTO_SAVE_DELAY);
            };

            ctx.handler = handler;
            form.addEventListener('input', handler);
            form.addEventListener('change', handler);
            activeForms.set(formId, ctx);

            // Try restoring previous draft
            DraftManager.load(key).then(data => {
                if (data && Object.keys(data).length) {
                    if (opts.indicator) {
                        opts.indicator.innerHTML =
                            `<span class="draft-restored">📋 يوجد مسودة محفوظة <button type="button" class="link-btn" data-action="restore">استعادة</button> <button type="button" class="link-btn" data-action="discard">تجاهل</button></span>`;
                        opts.indicator.querySelector('[data-action="restore"]')?.addEventListener('click', () => {
                            DraftManager.fillForm(form, data);
                            updateIndicator('saved');
                        });
                        opts.indicator.querySelector('[data-action="discard"]')?.addEventListener('click', async () => {
                            await DraftManager.clear(key);
                            updateIndicator('empty');
                        });
                    }
                } else {
                    updateIndicator('empty');
                }
            });

            return ctx;
        },

        /**
         * Unbind & clear (after successful save)
         */
        unbind(formId, alsoClear = true) {
            const ctx = activeForms.get(formId);
            if (!ctx) return;
            clearTimeout(ctx.timer);
            clearTimeout(ctx.syncTimer);
            const form = document.getElementById(formId);
            if (form && ctx.handler) {
                form.removeEventListener('input', ctx.handler);
                form.removeEventListener('change', ctx.handler);
            }
            if (alsoClear) DraftManager.clear(ctx.key);
            activeForms.delete(formId);
        },

        /**
         * Fill form with data
         */
        fillForm(form, data) {
            Object.entries(data).forEach(([name, value]) => {
                const el = form.querySelector(`[name="${name}"]`);
                if (!el) return;
                if (el.type === 'checkbox') el.checked = !!value;
                else if (el.type === 'radio') {
                    const r = form.querySelector(`[name="${name}"][value="${value}"]`);
                    if (r) r.checked = true;
                } else el.value = value;
            });
            // Trigger calc engine if bound
            form.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    // Periodic cleanup (>30 days drafts)
    setTimeout(async () => {
        try {
            const all = await DraftManager.list();
            const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
            for (const r of all) {
                if (r.updated_at && r.updated_at < cutoff) await idbDelete(r.key);
            }
        } catch (e) {}
    }, 10000);

    global.DraftManager = DraftManager;
})(window);

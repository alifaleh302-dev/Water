/**
 * Smart Calculation Engine — Frontend
 * Phase 1: Real-time Calculations (On-the-fly / contextual)
 *
 * Mirrors backend CalculationService.php to ensure visual feedback < 16ms.
 * Backend remains the single source of truth on save.
 */
(function (global) {
    'use strict';

    const Calc = {
        // Smart defaults loaded from server (cached after login)
        defaults: {
            price_per_m3: 0,
            vat_rate: 0,
            currency: 'ريال'
        },

        /**
         * Load defaults from server (cached for session lifetime)
         */
        async loadDefaults() {
            try {
                const r = await fetch('/api/calc/defaults', { credentials: 'same-origin' });
                const j = await r.json();
                if (j && j.status === 'success' && j.data) {
                    Object.assign(this.defaults, {
                        price_per_m3: parseFloat(j.data.price_per_m3) || 0,
                        vat_rate:     parseFloat(j.data.vat_rate)     || 0,
                        currency:     j.data.currency || 'ريال'
                    });
                }
            } catch (e) { /* offline-tolerant */ }
            return this.defaults;
        },

        /**
         * Pure function: compute invoice totals — fully deterministic
         */
        invoice(input) {
            const qty       = Math.max(0, parseFloat(input.quantity_m3)     || 0);
            const price     = Math.max(0, parseFloat(input.price_per_m3)    || this.defaults.price_per_m3 || 0);
            const totalRaw  = parseFloat(input.total_amount);
            const discount  = Math.max(0, parseFloat(input.discount_amount) || 0);
            const paid      = Math.max(0, parseFloat(input.paid_amount)     || 0);
            const vatRate   = parseFloat(input.vat_rate);
            const effectiveVat = (isNaN(vatRate) ? this.defaults.vat_rate : vatRate);

            const total = (!isNaN(totalRaw) && totalRaw > 0) ? totalRaw : (qty * price);
            const taxableBase = Math.max(0, total - discount);
            const vatAmount = round2(taxableBase * (effectiveVat / 100));
            const netAmount = round2(taxableBase + vatAmount);
            const dueAmount = round2(Math.max(0, netAmount - paid));

            return {
                quantity_m3:     round2(qty),
                price_per_m3:    round2(price),
                total_amount:    round2(total),
                discount_amount: round2(discount),
                vat_rate:        effectiveVat,
                vat_amount:      vatAmount,
                net_amount:      netAmount,
                paid_amount:     round2(paid),
                due_amount:      dueAmount
            };
        },

        /**
         * Compute settlement totals (driver cashout)
         */
        settlement(cashSales, expenses, commission) {
            let totalCash = 0, totalDue = 0, totalExpenses = 0;
            (cashSales || []).forEach(s => {
                totalCash += parseFloat(s.paid_amount) || 0;
                totalDue  += parseFloat(s.due_amount)  || 0;
            });
            (expenses || []).forEach(e => { totalExpenses += parseFloat(e.amount) || 0; });
            const c = parseFloat(commission) || 0;
            return {
                total_cash:       round2(totalCash),
                total_due:        round2(totalDue),
                total_commission: round2(c),
                total_expenses:   round2(totalExpenses),
                net_receivable:   round2(totalCash - c - totalExpenses)
            };
        },

        /**
         * Format money with locale
         */
        fmt(value, withCurrency = false) {
            const n = parseFloat(value) || 0;
            const s = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return withCurrency ? `${s} ${this.defaults.currency}` : s;
        },

        /**
         * Bind real-time calculation to a form
         * @param formId Form element id
         * @param onUpdate Callback(result) fired on every input
         * @param fieldMap Map of {input_name: source_key}
         */
        bindInvoiceForm(formId, onUpdate) {
            const form = document.getElementById(formId);
            if (!form) return;

            const handler = () => {
                const data = {
                    quantity_m3:     form.querySelector('[name="quantity_m3"]')?.value,
                    price_per_m3:    form.querySelector('[name="price_per_m3"]')?.value,
                    total_amount:    form.querySelector('[name="total_amount"]')?.value,
                    discount_amount: form.querySelector('[name="discount_amount"]')?.value,
                    paid_amount:     form.querySelector('[name="paid_amount"]')?.value
                };
                const r = this.invoice(data);

                // Auto-fill computed fields
                setVal(form, 'net_amount', r.net_amount);
                setVal(form, 'due_amount', r.due_amount);
                setVal(form, 'vat_amount', r.vat_amount);

                // Auto-fill total if user typed quantity * price but no total
                if (data.quantity_m3 && data.price_per_m3 && (!data.total_amount || parseFloat(data.total_amount) === 0)) {
                    setVal(form, 'total_amount', r.total_amount);
                }

                if (typeof onUpdate === 'function') onUpdate(r);
            };

            form.addEventListener('input', handler);
            form.addEventListener('change', handler);
            form._calcHandler = handler;
            // Trigger once for initial state
            setTimeout(handler, 50);
        }
    };

    function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
    function setVal(form, name, value) {
        const el = form.querySelector(`[name="${name}"]`);
        if (el) el.value = parseFloat(value).toFixed(2);
    }

    global.Calc = Calc;
})(window);

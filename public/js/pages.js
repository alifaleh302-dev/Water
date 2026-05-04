/**
 * Water Management System - Page Modules (RE-ENGINEERED v2.0)
 * - Smart Calculations Engine integration
 * - Draft auto-save (IndexedDB + Server sync)
 * - Searchable Selects
 * - Keyboard Shortcuts ready
 */

// ============================================
// DASHBOARD PAGE
// ============================================
registerPage('dashboard', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>📊 لوحة القيادة</h1>
            <span class="breadcrumb">الرئيسية</span>
        </div>
        <div class="row" id="statsRow">
            <div class="col-4"><div class="skeleton skeleton-box"></div></div>
            <div class="col-4"><div class="skeleton skeleton-box"></div></div>
            <div class="col-4"><div class="skeleton skeleton-box"></div></div>
            <div class="col-4"><div class="skeleton skeleton-box"></div></div>
        </div>
        <div class="row" style="margin-top:20px;">
            <div class="col-2"><div class="card"><div class="card-header">📈 ملخص مبيعات اليوم</div><div class="card-body" id="dashSalesInfo">جاري التحميل...</div></div></div>
            <div class="col-2"><div class="card"><div class="card-header">⚠️ تنبيهات</div><div class="card-body" id="dashAlerts">جاري التحميل...</div></div></div>
        </div>
        <div class="row" style="margin-top:20px;">
            <div class="col-1"><div class="card"><div class="card-header">⚡ إجراءات سريعة (اضغط <kbd>F9</kbd> للفاتورة)</div>
            <div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="navigateTo('trips')">🚚 رحلة جديدة</button>
                <button class="btn btn-success" onclick="openNewInvoice()">🧾 فاتورة جديدة</button>
                <button class="btn btn-warning" onclick="navigateTo('settlements')">💰 تصفية سائق</button>
                <button class="btn btn-info" onclick="navigateTo('expenses')">📤 تسجيل مصروف</button>
                <button class="btn btn-secondary" onclick="Shortcuts._showHelp()">⌨️ اختصارات</button>
            </div></div></div>
        </div>`;

    const result = await api.get('/api/dashboard');
    if (result && result.status === 'success') {
        const d = result.data;
        document.getElementById('statsRow').innerHTML = `
            <div class="col-4">
                <div class="stat-card">
                    <div class="stat-icon blue">🧾</div>
                    <div class="stat-info">
                        <h3>${formatMoney(d.today_sales?.total || 0)}</h3>
                        <p>مبيعات اليوم (${d.today_sales?.count || 0} فاتورة)</p>
                    </div>
                </div>
            </div>
            <div class="col-4">
                <div class="stat-card">
                    <div class="stat-icon green">🏦</div>
                    <div class="stat-info">
                        <h3>${formatMoney(d.fund_balance)}</h3>
                        <p>رصيد الصندوق</p>
                    </div>
                </div>
            </div>
            <div class="col-4">
                <div class="stat-card">
                    <div class="stat-icon red">💳</div>
                    <div class="stat-info">
                        <h3>${formatMoney(d.total_customer_debt)}</h3>
                        <p>إجمالي ديون العملاء</p>
                    </div>
                </div>
            </div>
            <div class="col-4">
                <div class="stat-card">
                    <div class="stat-icon orange">🚚</div>
                    <div class="stat-info">
                        <h3>${d.today_trips}</h3>
                        <p>رحلات اليوم</p>
                    </div>
                </div>
            </div>`;

        document.getElementById('dashSalesInfo').innerHTML = `
            <p>💵 النقدي: <strong>${formatMoney(d.today_sales?.cash || 0)}</strong></p>
            <p>📝 الآجل: <strong style="color:var(--danger)">${formatMoney(d.today_sales?.credit || 0)}</strong></p>
            <p>📤 المصروفات: <strong>${formatMoney(d.today_expenses)}</strong></p>`;

        let alerts = '';
        if (d.low_stock_count > 0) alerts += `<p class="badge badge-warning" style="margin-bottom:8px;">📦 ${d.low_stock_count} أصناف تحت الحد الأدنى</p><br>`;
        if (d.overdue_customer_count > 0) alerts += `<p class="badge badge-danger">🔴 ${d.overdue_customer_count} عميل لديه ديون متأخرة (أكثر من 15 يوم)</p>`;
        if (!alerts) alerts = '<p style="color:var(--success)">✅ لا توجد تنبيهات</p>';
        document.getElementById('dashAlerts').innerHTML = alerts;
    }
});

// ============================================
// TRIPS PAGE
// ============================================
registerPage('trips', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>🚚 إدارة الرحلات</h1>
            <button class="btn btn-primary" data-quick-new onclick="openTripForm()">+ رحلة جديدة <kbd>Ctrl+N</kbd></button>
        </div>
        <div class="card">
            <div class="card-header">
                <span>رحلات اليوم</span>
                <div class="filter-bar" style="margin:0;padding:0;background:none;">
                    <input type="date" class="form-control" id="tripDateFilter" value="${todayDate()}" onchange="loadTrips()">
                </div>
            </div>
            <div class="card-body" id="tripsTable">
                <div class="skeleton skeleton-box"></div>
            </div>
        </div>
        <!-- Trip Form Card -->
        <div class="card" id="tripFormCard" style="display:none;">
            <div class="card-header">
                <span>إضافة رحلة جديدة</span>
                <span class="draft-indicator" id="tripDraftIndicator"></span>
            </div>
            <div class="card-body">
                <form id="tripForm">
                    <div class="row">
                        <div class="col-3">
                            <div class="form-group">
                                <label class="form-label">السائق *</label>
                                <select class="form-control" name="driver_id" id="tripDriverId" required></select>
                            </div>
                        </div>
                        <div class="col-3">
                            <div class="form-group">
                                <label class="form-label">الوايت *</label>
                                <select class="form-control" name="truck_id" id="tripTruckId" required onchange="onTruckChange()"></select>
                            </div>
                        </div>
                        <div class="col-3">
                            <div class="form-group">
                                <label class="form-label">عمولة السائق</label>
                                <input type="number" class="form-control money-input auto-filled" name="commission_amount" id="tripCommission" step="0.01" min="0">
                                <span class="field-hint">تحدد آلياً حسب سعة الوايت من الإعدادات</span>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-success" onclick="saveTrip()" id="saveTripBtn">
                        <span class="spinner"></span>
                        <span class="btn-text">💾 فتح الرحلة (Ctrl+S)</span>
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="cancelTripForm()">إلغاء (Esc)</button>
                </form>
            </div>
        </div>`;

    await loadSelect('tripDriverId', '/api/drivers/active');
    await loadSelect('tripTruckId', '/api/trucks/active', 'id', 'plate_number', 'اختر الوايت...');
    setupEnterNavigation('tripForm');
    loadTrips();
});

async function loadTrips() {
    const date = document.getElementById('tripDateFilter')?.value || todayDate();
    showSkeleton('tripsTable');
    const result = await api.get(`/api/trips?date=${date}`);
    if (result && result.status === 'success') {
        buildTable('tripsTable', [
            { key: 'id', title: '#' },
            { key: 'driver_name', title: 'السائق' },
            { key: 'plate_number', title: 'الوايت' },
            { key: 'capacity_m3', title: 'السعة (م³)' },
            { key: 'commission_amount', title: 'العمولة', type: 'money' },
            { key: 'trip_date', title: 'الوقت', type: 'datetime' },
            { key: 'status', title: 'الحالة', type: 'badge', badges: { 'Open': 'badge-success', 'Closed': 'badge-danger' } }
        ], result.data, [
            { title: 'فواتير', icon: '🧾', class: 'btn-primary', handler: 'openInvoiceForTrip' },
            { title: 'إغلاق', icon: '🔒', class: 'btn-danger', handler: 'closeTrip', condition: (r) => r.status === 'Open' }
        ]);
    }
}

function openTripForm() {
    document.getElementById('tripFormCard').style.display = '';
    resetForm('tripForm');
    // Bind draft auto-save
    DraftManager.bindForm('tripForm', 'trip_form', {
        indicator: document.getElementById('tripDraftIndicator')
    });
    setTimeout(() => document.getElementById('tripDriverId')?.focus(), 100);
}

function cancelTripForm() {
    document.getElementById('tripFormCard').style.display = 'none';
    DraftManager.unbind('tripForm', false); // keep draft if user accidentally clicks
}

async function onTruckChange() {
    const truckId = document.getElementById('tripTruckId').value;
    if (!truckId) return;
    const result = await api.get(`/api/trips/commission?truck_id=${truckId}`);
    if (result && result.status === 'success') {
        const el = document.getElementById('tripCommission');
        el.value = result.data.commission_amount;
        el.classList.add('auto-filled');
        showToast('تم تحديد العمولة آلياً', 'info', 1500);
    }
}

async function saveTrip() {
    const btn = document.getElementById('saveTripBtn');
    setButtonLoading(btn, true);
    const data = getFormData('tripForm');
    const result = await api.post('/api/trips', data);
    setButtonLoading(btn, false);
    if (result.status === 'success') {
        showToast('تم فتح الرحلة بنجاح ✅');
        DraftManager.unbind('tripForm', true);
        document.getElementById('tripFormCard').style.display = 'none';
        loadTrips();
    } else {
        showToast(result.message, 'error');
    }
}

async function closeTrip(id) {
    if (!confirm('هل تريد إغلاق هذه الرحلة؟')) return;
    const result = await api.post(`/api/trips/close?id=${id}`);
    if (result.status === 'success') {
        showToast('تم إغلاق الرحلة');
        loadTrips();
    } else {
        showToast(result.message, 'error');
    }
}

function openInvoiceForTrip(tripId) {
    document.getElementById('invTripId').innerHTML = `<option value="${tripId}">رحلة #${tripId}</option>`;
    loadSelect('invCustomerId', '/api/customers', 'id', 'name', 'اختر الزبون...');
    resetForm('invoiceForm');
    document.querySelector('[name="trip_id"]').value = tripId;
    openModal('invoiceModal');
    setupEnterNavigation('invoiceForm');
    bindInvoiceCalc();
}

// ============================================
// INVOICE — SMART REAL-TIME CALCULATIONS
// ============================================
function bindInvoiceCalc() {
    // Bind calc-engine to invoice form (live updates)
    Calc.bindInvoiceForm('invoiceForm', (result) => {
        // Update visible total summary
        const display = document.getElementById('invTotalDisplay');
        if (display) {
            const c = Calc.defaults.currency;
            display.innerHTML = `
            <div class="calc-summary-card">
                <div class="calc-summary-item"><span class="label">الكمية</span><span class="value">${result.quantity_m3} م³</span></div>
                <div class="calc-summary-item"><span class="label">السعر/م³</span><span class="value">${Calc.fmt(result.price_per_m3)}</span></div>
                <div class="calc-summary-item"><span class="label">الإجمالي</span><span class="value">${Calc.fmt(result.total_amount)}</span></div>
                <div class="calc-summary-item"><span class="label">الخصم</span><span class="value">${Calc.fmt(result.discount_amount)}</span></div>
                ${result.vat_rate > 0 ? `<div class="calc-summary-item"><span class="label">الضريبة (${result.vat_rate}%)</span><span class="value">${Calc.fmt(result.vat_amount)}</span></div>` : ''}
                <div class="calc-summary-item highlight"><span class="label">الصافي</span><span class="value">${Calc.fmt(result.net_amount)} ${c}</span></div>
                <div class="calc-summary-item ${result.due_amount > 0 ? 'danger' : ''}"><span class="label">المتبقي (دين)</span><span class="value">${Calc.fmt(result.due_amount)}</span></div>
            </div>`;
        }
    });

    // Bind draft auto-save
    DraftManager.bindForm('invoiceForm', 'invoice_modal', {
        indicator: document.getElementById('invDraftIndicator')
    });
}

// Legacy function — kept for compatibility but now uses Calc engine
function calcInvoice() {
    const form = document.getElementById('invoiceForm');
    if (form && form._calcHandler) form._calcHandler();
}

async function saveInvoice() {
    const btn = document.getElementById('saveInvoiceBtn');
    setButtonLoading(btn, true);
    const data = getFormData('invoiceForm');
    // Re-compute on client (UX); server re-validates
    const computed = Calc.invoice(data);
    Object.assign(data, computed);

    const result = await api.post('/api/invoices', data);
    setButtonLoading(btn, false);
    if (result.status === 'success') {
        showToast('تم حفظ الفاتورة بنجاح ✅');
        DraftManager.unbind('invoiceForm', true);
        closeModal('invoiceModal');
        if (typeof loadTrips === 'function') loadTrips();
        if (typeof loadInvoices === 'function') loadInvoices();
    } else {
        showToast(result.message, 'error');
    }
}

// ============================================
// INVOICES PAGE
// ============================================
registerPage('invoices', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>🧾 الفواتير</h1>
            <button class="btn btn-primary" data-quick-new onclick="openNewInvoice()">+ فاتورة جديدة <kbd>F9</kbd></button>
        </div>
        <div class="card">
            <div class="card-header">
                <span>قائمة الفواتير</span>
                <div class="filter-bar" style="margin:0;padding:0;background:none;">
                    <input type="date" class="form-control" id="invDateFilter" value="${todayDate()}" onchange="loadInvoices()">
                </div>
            </div>
            <div class="card-body" id="invoicesTable"></div>
        </div>`;
    loadInvoices();
});

async function loadInvoices() {
    const date = document.getElementById('invDateFilter')?.value || todayDate();
    showSkeleton('invoicesTable');
    const result = await api.get(`/api/invoices?date=${date}`);
    if (result && result.status === 'success') {
        buildTable('invoicesTable', [
            { key: 'id', title: '#' },
            { key: 'customer_name', title: 'الزبون' },
            { key: 'driver_name', title: 'السائق' },
            { key: 'quantity_m3', title: 'الكمية (م³)' },
            { key: 'total_amount', title: 'الإجمالي', type: 'money' },
            { key: 'discount_amount', title: 'الخصم', type: 'money' },
            { key: 'net_amount', title: 'الصافي', type: 'money' },
            { key: 'paid_amount', title: 'المدفوع', type: 'money' },
            { key: 'due_amount', title: 'المتبقي', type: 'money', render: (v) => {
                const val = parseFloat(v) || 0;
                return val > 0 ? `<span style="color:var(--danger);font-weight:700">${formatMoney(val)}</span>` : formatMoney(val);
            }}
        ], result.data);
    }
}

async function openNewInvoice() {
    // Load smart defaults first
    await Calc.loadDefaults();

    await loadSelect('invTripId', '/api/trips/open', 'id', 'id', 'اختر الرحلة...');
    const trips = await api.get('/api/trips/open');
    if (trips && trips.status === 'success') {
        const sel = document.getElementById('invTripId');
        sel.innerHTML = '<option value="">اختر الرحلة...</option>';
        trips.data.forEach(t => {
            sel.innerHTML += `<option value="${t.id}">رحلة #${t.id} - ${t.driver_name} (${t.plate_number})</option>`;
        });
    }
    await loadSelect('invCustomerId', '/api/customers', 'id', 'name', 'اختر الزبون...');
    resetForm('invoiceForm');

    // Auto-fill price_per_m3 from settings
    const priceField = document.querySelector('#invoiceForm [name="price_per_m3"]');
    if (priceField) {
        priceField.value = Calc.defaults.price_per_m3;
        priceField.classList.add('auto-filled');
    }

    openModal('invoiceModal');
    bindInvoiceCalc();

    // Focus on first interactive field
    setTimeout(() => document.getElementById('invTripId')?.focus(), 100);
}

// ============================================
// CUSTOMERS & DEBTS PAGE
// ============================================
registerPage('customers', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>👥 العملاء والديون</h1>
            <button class="btn btn-primary" data-quick-new onclick="openCustomerForm()">+ إضافة عميل</button>
        </div>
        <div class="card">
            <div class="card-header">قائمة العملاء</div>
            <div class="card-body">
                <div class="search-bar">
                    <span class="search-icon">🔍</span>
                    <input type="text" class="form-control" id="customerSearch" placeholder="بحث بالاسم أو الهاتف أو الحي... (اضغط /)" oninput="searchCustomers()">
                </div>
                <div id="customersTable"></div>
            </div>
        </div>
        <!-- Customer Form -->
        <div class="card" id="customerFormCard" style="display:none;">
            <div class="card-header">
                <span id="customerFormTitle">إضافة عميل جديد</span>
                <span class="draft-indicator" id="customerDraftIndicator"></span>
            </div>
            <div class="card-body">
                <form id="customerForm">
                    <input type="hidden" name="id" id="custId">
                    <div class="row">
                        <div class="col-3">
                            <div class="form-group">
                                <label class="form-label">اسم العميل *</label>
                                <input type="text" class="form-control" name="name" required>
                            </div>
                        </div>
                        <div class="col-3">
                            <div class="form-group">
                                <label class="form-label">رقم الجوال</label>
                                <input type="text" class="form-control" name="phone">
                            </div>
                        </div>
                        <div class="col-3">
                            <div class="form-group">
                                <label class="form-label">الحي / المنطقة</label>
                                <input type="text" class="form-control" name="neighborhood">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-3">
                            <div class="form-group">
                                <label class="form-label">حد الائتمان (دين مسموح)</label>
                                <input type="number" class="form-control money-input" name="credit_limit" step="0.01" min="0" value="0">
                                <span class="field-hint">0 = بدون حد</span>
                            </div>
                        </div>
                        <div class="col-2">
                            <div class="form-group">
                                <label class="form-label">الرصيد (المديونية)</label>
                                <input type="text" class="form-control" name="balance" readonly>
                            </div>
                        </div>
                        <div class="col-2">
                            <div class="form-group">
                                <label class="form-label">إجمالي المدفوعات</label>
                                <input type="text" class="form-control" name="total_lifetime_paid" readonly>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ملاحظات</label>
                        <textarea class="form-control" name="notes" rows="2"></textarea>
                    </div>
                    <button type="button" class="btn btn-success" onclick="saveCustomer()" id="saveCustBtn">
                        <span class="spinner"></span>
                        <span class="btn-text">💾 حفظ (Ctrl+S)</span>
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="cancelCustomerForm()">إلغاء (Esc)</button>
                </form>
            </div>
        </div>`;
    
    loadCustomers();
});

async function loadCustomers() {
    showSkeleton('customersTable');
    
    const [custResult, agingResult] = await Promise.all([
        api.get('/api/customers'),
        api.get('/api/customers/debt-aging?days=15')
    ]);
    
    const agingMap = {};
    if (agingResult && agingResult.status === 'success') {
        agingResult.data.forEach(a => { agingMap[a.id] = a.days_overdue; });
    }
    
    if (custResult && custResult.status === 'success') {
        buildTable('customersTable', [
            { key: 'id', title: '#' },
            { key: 'name', title: 'الاسم', render: (v, row) => {
                let badge = '';
                if (agingMap[row.id]) {
                    badge = `<span class="overdue-badge">${agingMap[row.id]} يوم تأخير</span>`;
                }
                return v + badge;
            }},
            { key: 'phone', title: 'الجوال' },
            { key: 'neighborhood', title: 'الحي' },
            { key: 'balance', title: 'الرصيد', type: 'money', render: (v) => {
                const val = parseFloat(v) || 0;
                return val > 0 ? `<span style="color:var(--danger);font-weight:700">${formatMoney(val)}</span>` : formatMoney(val);
            }},
            { key: 'total_lifetime_paid', title: 'إجمالي المدفوع', type: 'money' }
        ], custResult.data, [
            { title: 'تعديل', icon: '✏️', class: 'btn-primary', handler: 'editCustomer' },
            { title: 'كشف حساب', icon: '📋', class: 'btn-success', handler: 'viewStatement' },
            { title: 'حذف', icon: '🗑️', class: 'btn-danger', handler: 'deleteCustomer' }
        ]);
    }
}

const searchCustomers = debounce(async () => {
    const q = document.getElementById('customerSearch').value;
    if (q.length < 1) { loadCustomers(); return; }
    const result = await api.get(`/api/customers/search?q=${encodeURIComponent(q)}`);
    if (result && result.status === 'success') {
        buildTable('customersTable', [
            { key: 'id', title: '#' },
            { key: 'name', title: 'الاسم' },
            { key: 'phone', title: 'الجوال' },
            { key: 'neighborhood', title: 'الحي' },
            { key: 'balance', title: 'الرصيد', type: 'money' },
        ], result.data, [
            { title: 'تعديل', icon: '✏️', class: 'btn-primary', handler: 'editCustomer' },
            { title: 'كشف حساب', icon: '📋', class: 'btn-success', handler: 'viewStatement' }
        ]);
    }
}, 300);

function openCustomerForm() {
    document.getElementById('customerFormCard').style.display = '';
    document.getElementById('customerFormTitle').textContent = 'إضافة عميل جديد';
    resetForm('customerForm');
    document.getElementById('custId').value = '';
    DraftManager.bindForm('customerForm', 'customer_form_new', {
        indicator: document.getElementById('customerDraftIndicator')
    });
    setupEnterNavigation('customerForm');
    setTimeout(() => document.querySelector('#customerForm [name="name"]')?.focus(), 100);
}

function cancelCustomerForm() {
    document.getElementById('customerFormCard').style.display = 'none';
    DraftManager.unbind('customerForm', false);
}

async function editCustomer(id) {
    const result = await api.get(`/api/customers/show?id=${id}`);
    if (result && result.status === 'success') {
        document.getElementById('customerFormCard').style.display = '';
        document.getElementById('customerFormTitle').textContent = 'تعديل بيانات العميل';
        populateForm('customerForm', result.data);
        document.getElementById('custId').value = id;
        DraftManager.bindForm('customerForm', `customer_form_edit_${id}`, {
            indicator: document.getElementById('customerDraftIndicator')
        });
    }
}

async function saveCustomer() {
    const btn = document.getElementById('saveCustBtn');
    setButtonLoading(btn, true);
    const data = getFormData('customerForm');
    const id = data.id;
    delete data.id;
    delete data.balance;
    delete data.total_lifetime_paid;
    
    let result;
    if (id) {
        result = await api.put(`/api/customers?id=${id}`, data);
    } else {
        result = await api.post('/api/customers', data);
    }
    setButtonLoading(btn, false);
    if (result.status === 'success') {
        showToast(id ? 'تم تحديث العميل ✅' : 'تم إضافة العميل ✅');
        DraftManager.unbind('customerForm', true);
        document.getElementById('customerFormCard').style.display = 'none';
        loadCustomers();
    } else {
        showToast(result.message, 'error');
    }
}

async function deleteCustomer(id) {
    if (!confirm('هل تريد حذف هذا العميل؟')) return;
    const result = await api.delete(`/api/customers?id=${id}`);
    result.status === 'success' ? (showToast('تم الحذف'), loadCustomers()) : showToast(result.message, 'error');
}

async function viewStatement(customerId) {
    navigateTo('reports');
    setTimeout(() => {
        if (document.getElementById('reportCustomerId')) {
            document.getElementById('reportCustomerId').value = customerId;
            document.getElementById('reportType').value = 'customer-statement';
            generateReport();
        }
    }, 500);
}

// ============================================
// SETTLEMENTS PAGE
// ============================================
registerPage('settlements', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>💰 تصفية السائقين</h1>
        </div>
        <div class="card">
            <div class="card-header">اختر السائق واليوم</div>
            <div class="card-body">
                <div class="row">
                    <div class="col-3">
                        <div class="form-group">
                            <label class="form-label">السائق</label>
                            <select class="form-control" id="settDriverId" onchange="prepareSettlement()"></select>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="form-group">
                            <label class="form-label">التاريخ</label>
                            <input type="date" class="form-control" id="settDate" value="${todayDate()}" onchange="prepareSettlement()">
                        </div>
                    </div>
                    <div class="col-3" style="display:flex;align-items:flex-end;">
                        <button class="btn btn-primary" onclick="prepareSettlement()">📋 عرض البيانات</button>
                    </div>
                </div>
            </div>
        </div>
        <div id="settlementData"></div>`;

    await loadSelect('settDriverId', '/api/drivers/active');
});

async function prepareSettlement() {
    const driverId = document.getElementById('settDriverId').value;
    const date = document.getElementById('settDate').value;
    if (!driverId) return;

    const container = document.getElementById('settlementData');
    container.innerHTML = '<div class="skeleton skeleton-box"></div>';

    const result = await api.get(`/api/settlements/prepare?driver_id=${driverId}&date=${date}`);
    if (result && result.status === 'success') {
        const d = result.data;
        const s = d.summary;
        
        let cashSalesHtml = '';
        d.cash_sales.forEach(inv => {
            cashSalesHtml += `<tr>
                <td>${inv.id}</td><td>${inv.customer_name || 'نقدي'}</td>
                <td class="num">${formatMoney(inv.net_amount)}</td>
                <td class="num">${formatMoney(inv.paid_amount)}</td>
                <td class="num">${formatMoney(inv.due_amount)}</td>
            </tr>`;
        });

        let expensesHtml = '';
        let totalExpenses = 0;
        d.expenses.forEach(exp => {
            totalExpenses += parseFloat(exp.amount);
            expensesHtml += `<tr><td>${exp.category_name}</td><td class="num">${formatMoney(exp.amount)}</td><td>${exp.notes || '-'}</td></tr>`;
        });

        // Use Calc engine for settlement totals
        const calc = Calc.settlement(d.cash_sales, d.expenses, s.total_commission);
        const netReceivable = calc.net_receivable;

        container.innerHTML = `
            <div class="card">
                <div class="card-header">📊 ملخص السائق: ${d.driver.name} - ${date}</div>
                <div class="card-body" id="settlementPrintArea">
                    <div class="header-print" style="display:none;">
                        <h2>سند قبض وتصفية</h2>
                        <p>السائق: ${d.driver.name} | التاريخ: ${date}</p>
                    </div>
                    <div class="row" style="margin-bottom:20px;">
                        <div class="col-4"><div class="stat-card"><div class="stat-icon blue">🚚</div><div class="stat-info"><h3>${s.trip_count}</h3><p>عدد الحمولات</p></div></div></div>
                        <div class="col-4"><div class="stat-card"><div class="stat-icon green">💵</div><div class="stat-info"><h3>${formatMoney(calc.total_cash)}</h3><p>إجمالي النقد</p></div></div></div>
                        <div class="col-4"><div class="stat-card"><div class="stat-icon red">💳</div><div class="stat-info"><h3>${formatMoney(calc.total_due)}</h3><p>الديون الآجلة</p></div></div></div>
                    </div>
                    
                    <h3 style="margin:16px 0 8px;">🧾 مبيعات اليوم النقدية</h3>
                    <table class="data-table">
                        <thead><tr><th>#</th><th>الزبون</th><th>الصافي</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
                        <tbody>${cashSalesHtml || '<tr><td colspan="5" style="text-align:center">لا توجد مبيعات</td></tr>'}</tbody>
                    </table>

                    <h3 style="margin:16px 0 8px;">📤 مصروفات السائق</h3>
                    <table class="data-table">
                        <thead><tr><th>الفئة</th><th>المبلغ</th><th>ملاحظات</th></tr></thead>
                        <tbody>${expensesHtml || '<tr><td colspan="3" style="text-align:center">لا توجد مصروفات</td></tr>'}</tbody>
                    </table>

                    <div class="calc-summary-card" style="margin-top:20px;">
                        <div class="calc-summary-item"><span class="label">💵 إجمالي النقد</span><span class="value">${formatMoney(calc.total_cash)}</span></div>
                        <div class="calc-summary-item"><span class="label">➖ العمولة</span><span class="value">${formatMoney(calc.total_commission)}</span></div>
                        <div class="calc-summary-item"><span class="label">➖ المصروفات</span><span class="value">${formatMoney(calc.total_expenses)}</span></div>
                        <div class="calc-summary-item ${netReceivable >= 0 ? 'highlight' : 'danger'}">
                            <span class="label">الصافي المستلم</span>
                            <span class="value">${formatMoney(netReceivable)} ${Calc.defaults.currency}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">💵 تحصيلات ديون سابقة</div>
                <div class="card-body">
                    <div id="collectionsList"></div>
                    <button class="btn btn-success" onclick="openPaymentModal(${driverId})">+ إضافة تحصيل دين</button>
                </div>
            </div>

            <div style="margin-top:16px; display:flex; gap:12px;">
                <button class="btn btn-primary btn-lg" onclick="finalizeSettlement(${driverId}, '${date}', ${netReceivable})" id="finalizeBtn">
                    <span class="spinner"></span>
                    <span class="btn-text">✅ حفظ التصفية (Ctrl+S)</span>
                </button>
                <button class="btn btn-secondary btn-lg" onclick="printContent('settlementPrintArea')">🖨️ طباعة السند</button>
            </div>`;
    }
}

function openPaymentModal(driverId) {
    loadSelect('payCustomerId', '/api/customers/debtors', 'id', 'name', 'اختر الزبون...');
    resetForm('paymentForm');
    document.getElementById('paySettlementId').value = '';
    openModal('paymentModal');
    
    document.getElementById('payCustomerId').onchange = async function() {
        const custId = this.value;
        if (custId) {
            const r = await api.get(`/api/customers/show?id=${custId}`);
            if (r && r.status === 'success') {
                document.getElementById('payCustomerBalance').value = formatMoney(r.data.balance) + ' ريال';
            }
        }
    };
}

async function savePayment() {
    const btn = document.getElementById('savePaymentBtn');
    setButtonLoading(btn, true);
    const data = getFormData('paymentForm');
    
    let result;
    if (data.settlement_id) {
        result = await api.post('/api/settlements/add-detail', data);
    } else {
        showToast('سيتم حفظ التحصيل عند إنهاء التصفية', 'info');
        closeModal('paymentModal');
        setButtonLoading(btn, false);
        
        const listEl = document.getElementById('collectionsList');
        if (listEl) {
            const custName = document.getElementById('payCustomerId').selectedOptions[0]?.text || '';
            listEl.innerHTML += `<div class="badge badge-success" style="margin:4px;padding:8px 12px;">
                ${custName}: ${formatMoney(data.amount_paid)} ريال
                <input type="hidden" class="collection-data" value='${JSON.stringify(data)}'>
            </div>`;
        }
        return;
    }
    
    setButtonLoading(btn, false);
    if (result && result.status === 'success') {
        showToast('تم تسجيل الدفعة بنجاح');
        closeModal('paymentModal');
        prepareSettlement();
    } else {
        showToast(result?.message || 'خطأ', 'error');
    }
}

async function finalizeSettlement(driverId, date, netReceivable) {
    const btn = document.getElementById('finalizeBtn');
    setButtonLoading(btn, true);

    const collectionEls = document.querySelectorAll('.collection-data');
    const details = [];
    collectionEls.forEach(el => {
        try { details.push(JSON.parse(el.value)); } catch(e) {}
    });

    const data = {
        driver_id: driverId,
        total_amount_received: Math.max(0, netReceivable),
        details: details
    };

    const result = await api.post('/api/settlements', data);
    setButtonLoading(btn, false);
    
    if (result.status === 'success') {
        showToast('تم حفظ التصفية بنجاح ✅');
        prepareSettlement();
    } else {
        showToast(result.message, 'error');
    }
}

// ============================================
// EXPENSES PAGE
// ============================================
registerPage('expenses', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>📤 المصروفات</h1>
            <button class="btn btn-primary" data-quick-new onclick="openExpenseForm()">+ مصروف جديد</button>
        </div>
        <div class="card" id="expenseFormCard" style="display:none;">
            <div class="card-header">
                <span>إضافة مصروف</span>
                <span class="draft-indicator" id="expenseDraftIndicator"></span>
            </div>
            <div class="card-body">
                <form id="expenseForm">
                    <div class="row">
                        <div class="col-4">
                            <div class="form-group">
                                <label class="form-label">الفئة *</label>
                                <select class="form-control" name="category_id" id="expCategoryId" required></select>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="form-group">
                                <label class="form-label">المبلغ *</label>
                                <input type="number" class="form-control money-input" name="amount" step="0.01" min="0" required>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="form-group">
                                <label class="form-label">السائق (اختياري - من عهدته)</label>
                                <select class="form-control" name="driver_id" id="expDriverId"></select>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ملاحظات</label>
                        <textarea class="form-control" name="notes" rows="2"></textarea>
                    </div>
                    <button type="button" class="btn btn-success" onclick="saveExpense()" id="saveExpBtn">
                        <span class="spinner"></span>
                        <span class="btn-text">💾 حفظ المصروف (Ctrl+S)</span>
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="cancelExpenseForm()">إلغاء (Esc)</button>
                </form>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <span>سجل المصروفات</span>
                <input type="date" class="form-control" id="expDateFilter" value="${todayDate()}" onchange="loadExpenses()" style="max-width:180px;">
            </div>
            <div class="card-body" id="expensesTable"></div>
        </div>`;

    await loadSelect('expCategoryId', '/api/expenses/categories', 'id', 'category_name', 'اختر الفئة...');
    await loadSelect('expDriverId', '/api/drivers/active', 'id', 'name', 'بدون سائق (مصروف محطة)');
    loadExpenses();
});

function openExpenseForm() {
    document.getElementById('expenseFormCard').style.display = '';
    resetForm('expenseForm');
    DraftManager.bindForm('expenseForm', 'expense_form', {
        indicator: document.getElementById('expenseDraftIndicator')
    });
    setupEnterNavigation('expenseForm');
    setTimeout(() => document.getElementById('expCategoryId')?.focus(), 100);
}

function cancelExpenseForm() {
    document.getElementById('expenseFormCard').style.display = 'none';
    DraftManager.unbind('expenseForm', false);
}

async function loadExpenses() {
    const date = document.getElementById('expDateFilter')?.value || todayDate();
    showSkeleton('expensesTable');
    const result = await api.get(`/api/expenses?date=${date}`);
    if (result && result.status === 'success') {
        buildTable('expensesTable', [
            { key: 'id', title: '#' },
            { key: 'category_name', title: 'الفئة' },
            { key: 'amount', title: 'المبلغ', type: 'money' },
            { key: 'driver_name', title: 'السائق', render: v => v || 'محطة' },
            { key: 'notes', title: 'ملاحظات' },
            { key: 'expense_date', title: 'التاريخ', type: 'datetime' }
        ], result.data, [
            { title: 'حذف', icon: '🗑️', class: 'btn-danger', handler: 'deleteExpense' }
        ]);
    }
}

async function saveExpense() {
    const btn = document.getElementById('saveExpBtn');
    setButtonLoading(btn, true);
    const data = getFormData('expenseForm');
    if (!data.driver_id) delete data.driver_id;
    const result = await api.post('/api/expenses', data);
    setButtonLoading(btn, false);
    if (result.status === 'success') {
        showToast('تم حفظ المصروف ✅');
        DraftManager.unbind('expenseForm', true);
        document.getElementById('expenseFormCard').style.display = 'none';
        resetForm('expenseForm');
        loadExpenses();
    } else {
        showToast(result.message, 'error');
    }
}

async function deleteExpense(id) {
    if (!confirm('هل تريد حذف هذا المصروف؟')) return;
    const result = await api.delete(`/api/expenses?id=${id}`);
    result.status === 'success' ? (showToast('تم الحذف'), loadExpenses()) : showToast(result.message, 'error');
}

// ============================================
// FUND / TREASURY PAGE
// ============================================
registerPage('fund', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>🏦 الصندوق</h1>
            <button class="btn btn-danger btn-lg" onclick="showClosingForm()">🔒 إقفال يومي</button>
        </div>
        <div id="fundStats" class="row" style="margin-bottom:20px;"></div>
        <div class="card">
            <div class="card-header">حركات الصندوق اليوم</div>
            <div class="card-body" id="fundTable"></div>
        </div>
        <div class="card" id="closingFormCard" style="display:none;">
            <div class="card-header">🔒 الإقفال اليومي</div>
            <div class="card-body">
                <div class="row">
                    <div class="col-3">
                        <div class="form-group">
                            <label class="form-label">الرصيد الافتتاحي</label>
                            <input type="text" class="form-control" id="closingOpening" readonly>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="form-group">
                            <label class="form-label">المتوقع (نظامي)</label>
                            <input type="text" class="form-control" id="closingExpected" readonly>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="form-group">
                            <label class="form-label">المبلغ الفعلي (عد يدوي) *</label>
                            <input type="number" class="form-control money-input" id="closingActual" step="0.01" min="0" oninput="calcClosingDiff()">
                        </div>
                    </div>
                </div>
                <div class="financial-total" id="closingDiff">الفارق: 0.00 ريال</div>
                <div style="margin-top:16px;">
                    <button class="btn btn-danger btn-lg" onclick="saveCashClosing()" id="saveClosingBtn">
                        <span class="spinner"></span>
                        <span class="btn-text">🔒 تأكيد الإقفال (Ctrl+S)</span>
                    </button>
                </div>
            </div>
        </div>`;
    loadFund();
});

async function loadFund() {
    const result = await api.get('/api/fund/today');
    if (result && result.status === 'success') {
        const d = result.data;
        document.getElementById('fundStats').innerHTML = `
            <div class="col-3"><div class="stat-card"><div class="stat-icon blue">📥</div><div class="stat-info"><h3>${formatMoney(d.opening_balance)}</h3><p>الرصيد الافتتاحي</p></div></div></div>
            <div class="col-3"><div class="stat-card"><div class="stat-icon green">📈</div><div class="stat-info"><h3>${formatMoney(d.total_in)}</h3><p>إجمالي الدخل</p></div></div></div>
            <div class="col-3"><div class="stat-card"><div class="stat-icon red">📉</div><div class="stat-info"><h3>${formatMoney(d.total_out)}</h3><p>إجمالي المصروفات</p></div></div></div>
            <div class="col-3"><div class="stat-card"><div class="stat-icon orange">🏦</div><div class="stat-info"><h3>${formatMoney(d.current_balance)}</h3><p>الرصيد الحالي</p></div></div></div>`;

        buildTable('fundTable', [
            { key: 'id', title: '#' },
            { key: 'transaction_type', title: 'النوع', type: 'badge', badges: { 'In': 'badge-success', 'Out': 'badge-danger' } },
            { key: 'source_type', title: 'المصدر' },
            { key: 'source_id', title: 'رقم المرجع' },
            { key: 'amount', title: 'المبلغ', type: 'money' },
            { key: 'current_balance', title: 'الرصيد', type: 'money' },
            { key: 'transaction_date', title: 'الوقت', type: 'datetime' }
        ], d.transactions);

        window._fundData = d;
    }
}

function showClosingForm() {
    const d = window._fundData;
    if (!d) return;
    document.getElementById('closingFormCard').style.display = '';
    document.getElementById('closingOpening').value = formatMoney(d.opening_balance);
    document.getElementById('closingExpected').value = formatMoney(d.current_balance);
    setTimeout(() => document.getElementById('closingActual')?.focus(), 100);
}

function calcClosingDiff() {
    const expected = window._fundData?.current_balance || 0;
    const actual = parseFloat(document.getElementById('closingActual').value) || 0;
    const diff = actual - expected;
    const el = document.getElementById('closingDiff');
    el.textContent = `الفارق: ${formatMoney(diff)} ريال`;
    el.className = diff === 0 ? 'financial-total success' : (diff < 0 ? 'financial-total danger' : 'financial-total');
}

async function saveCashClosing() {
    const btn = document.getElementById('saveClosingBtn');
    setButtonLoading(btn, true);
    const actual = parseFloat(document.getElementById('closingActual').value);
    if (!actual && actual !== 0) { showToast('أدخل المبلغ الفعلي', 'warning'); setButtonLoading(btn, false); return; }
    
    const result = await api.post('/api/fund/close', { actual_amount: actual });
    setButtonLoading(btn, false);
    if (result.status === 'success') {
        showToast('تم الإقفال اليومي بنجاح ✅');
        document.getElementById('closingFormCard').style.display = 'none';
        loadFund();
    } else {
        showToast(result.message, 'error');
    }
}

// ============================================
// INVENTORY PAGE
// ============================================
registerPage('inventory', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>📦 المخزون</h1>
            <div>
                <button class="btn btn-primary" onclick="showItemForm()">+ صنف جديد</button>
                <button class="btn btn-success" onclick="showPurchaseForm()">🛒 شراء</button>
                <button class="btn btn-warning" onclick="showIssueForm()">📤 صرف</button>
            </div>
        </div>
        <div id="lowStockAlerts"></div>
        <div class="card">
            <div class="card-header">الأصناف</div>
            <div class="card-body" id="itemsTable"></div>
        </div>
        <div class="card" id="itemFormCard" style="display:none;">
            <div class="card-header">إضافة صنف</div>
            <div class="card-body">
                <form id="itemForm">
                    <div class="row">
                        <div class="col-4"><div class="form-group"><label class="form-label">الاسم *</label><input type="text" class="form-control" name="name" required></div></div>
                        <div class="col-4"><div class="form-group"><label class="form-label">النوع *</label><select class="form-control" name="item_type"><option value="Consumable">مستهلك</option><option value="Asset">أصل</option></select></div></div>
                        <div class="col-4"><div class="form-group"><label class="form-label">الوحدة *</label><input type="text" class="form-control" name="unit" required placeholder="حبة، جالون..."></div></div>
                    </div>
                    <div class="row">
                        <div class="col-3"><div class="form-group"><label class="form-label">السعة</label><input type="text" class="form-control" name="capacity"></div></div>
                        <div class="col-3"><div class="form-group"><label class="form-label">الحد الأدنى</label><input type="number" class="form-control" name="min_limit" min="0" value="0"></div></div>
                        <div class="col-3"><div class="form-group"><label class="form-label">الرصيد الحالي</label><input type="number" class="form-control" name="current_stock" min="0" value="0"></div></div>
                    </div>
                    <button type="button" class="btn btn-success" onclick="saveItem()">💾 حفظ</button>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('itemFormCard').style.display='none'">إلغاء</button>
                </form>
            </div>
        </div>
        <div class="card" id="purchaseFormCard" style="display:none;">
            <div class="card-header">
                <span>🛒 فاتورة شراء</span>
                <span class="draft-indicator" id="purchaseDraftIndicator"></span>
            </div>
            <div class="card-body">
                <form id="purchaseForm">
                    <div class="row">
                        <div class="col-4"><div class="form-group"><label class="form-label">الصنف *</label><select class="form-control" name="item_id" id="purchItemId" required></select></div></div>
                        <div class="col-4"><div class="form-group"><label class="form-label">الكمية *</label><input type="number" class="form-control" name="quantity" min="1" required oninput="calcPurchaseTotal()"></div></div>
                        <div class="col-4"><div class="form-group"><label class="form-label">سعر الوحدة *</label><input type="number" class="form-control money-input" name="unit_price" step="0.01" min="0" required oninput="calcPurchaseTotal()"></div></div>
                    </div>
                    <div class="form-group"><label class="form-label">الإجمالي (محسوب آلياً)</label><input type="number" class="form-control auto-filled" name="total_amount" id="purchTotal" readonly></div>
                    <button type="button" class="btn btn-success" onclick="savePurchase()" id="savePurchBtn"><span class="spinner"></span><span class="btn-text">💾 حفظ الشراء (Ctrl+S)</span></button>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('purchaseFormCard').style.display='none'">إلغاء</button>
                </form>
            </div>
        </div>
        <div class="card" id="issueFormCard" style="display:none;">
            <div class="card-header">📤 صرف من المخزون</div>
            <div class="card-body">
                <form id="issueForm">
                    <div class="row">
                        <div class="col-2"><div class="form-group"><label class="form-label">الصنف *</label><select class="form-control" name="item_id" id="issueItemId" required></select></div></div>
                        <div class="col-2"><div class="form-group"><label class="form-label">الكمية *</label><input type="number" class="form-control" name="quantity" min="1" required></div></div>
                    </div>
                    <input type="hidden" name="transaction_type" value="Issue">
                    <button type="button" class="btn btn-warning" onclick="saveIssue()" id="saveIssueBtn"><span class="spinner"></span><span class="btn-text">📤 تأكيد الصرف</span></button>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('issueFormCard').style.display='none'">إلغاء</button>
                </form>
            </div>
        </div>`;
    loadItems();
    checkLowStock();
});

async function loadItems() {
    showSkeleton('itemsTable');
    const result = await api.get('/api/inventory/items');
    if (result && result.status === 'success') {
        buildTable('itemsTable', [
            { key: 'id', title: '#' },
            { key: 'name', title: 'الصنف' },
            { key: 'item_type', title: 'النوع', render: v => v === 'Consumable' ? 'مستهلك' : 'أصل' },
            { key: 'unit', title: 'الوحدة' },
            { key: 'current_stock', title: 'الرصيد', render: (v, row) => {
                const cls = (parseInt(v) <= parseInt(row.min_limit) && parseInt(row.min_limit) > 0) ? 'color:var(--danger);font-weight:700' : '';
                return `<span style="${cls}">${v}</span>`;
            }},
            { key: 'min_limit', title: 'الحد الأدنى' }
        ], result.data);
    }
}

async function checkLowStock() {
    const result = await api.get('/api/inventory/items/low-stock');
    if (result && result.status === 'success' && result.data.length > 0) {
        let html = '<div style="padding:12px;background:#fff3e0;border-radius:8px;margin-bottom:16px;">';
        html += '<strong>⚠️ تنبيه مخزون منخفض:</strong><br>';
        result.data.forEach(item => {
            html += `<span class="badge badge-warning" style="margin:4px;">${item.name}: ${item.current_stock} ${item.unit} (الحد: ${item.min_limit})</span> `;
        });
        html += '</div>';
        document.getElementById('lowStockAlerts').innerHTML = html;
    }
}

function showItemForm() { document.getElementById('itemFormCard').style.display = ''; }
async function showPurchaseForm() {
    document.getElementById('purchaseFormCard').style.display = '';
    await loadSelect('purchItemId', '/api/inventory/items', 'id', 'name', 'اختر الصنف...');
    DraftManager.bindForm('purchaseForm', 'purchase_form', {
        indicator: document.getElementById('purchaseDraftIndicator')
    });
    setupEnterNavigation('purchaseForm');
}
async function showIssueForm() {
    document.getElementById('issueFormCard').style.display = '';
    await loadSelect('issueItemId', '/api/inventory/items', 'id', 'name', 'اختر الصنف...');
}

function calcPurchaseTotal() {
    const qty = parseFloat(document.querySelector('#purchaseForm [name="quantity"]')?.value) || 0;
    const price = parseFloat(document.querySelector('#purchaseForm [name="unit_price"]')?.value) || 0;
    document.getElementById('purchTotal').value = (qty * price).toFixed(2);
}

async function saveItem() {
    const data = getFormData('itemForm');
    const result = await api.post('/api/inventory/items', data);
    if (result.status === 'success') { showToast('تم إضافة الصنف'); document.getElementById('itemFormCard').style.display = 'none'; loadItems(); }
    else showToast(result.message, 'error');
}

async function savePurchase() {
    const btn = document.getElementById('savePurchBtn');
    setButtonLoading(btn, true);
    const data = getFormData('purchaseForm');
    const result = await api.post('/api/inventory/purchases', data);
    setButtonLoading(btn, false);
    if (result.status === 'success') {
        showToast('تم حفظ عملية الشراء ✅');
        DraftManager.unbind('purchaseForm', true);
        document.getElementById('purchaseFormCard').style.display = 'none';
        loadItems();
    }
    else showToast(result.message, 'error');
}

async function saveIssue() {
    const btn = document.getElementById('saveIssueBtn');
    setButtonLoading(btn, true);
    const data = getFormData('issueForm');
    const result = await api.post('/api/inventory/transactions', data);
    setButtonLoading(btn, false);
    if (result.status === 'success') {
        showToast('تم صرف الكمية');
        if (result.data?.low_stock_alert) showToast('⚠️ تنبيه: المخزون وصل الحد الأدنى!', 'warning', 5000);
        document.getElementById('issueFormCard').style.display = 'none';
        loadItems();
        checkLowStock();
    } else showToast(result.message, 'error');
}

// ============================================
// CUSTOMER ASSETS PAGE
// ============================================
registerPage('assets', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>🏗️ عهد الزبائن (الخزانات)</h1>
            <button class="btn btn-primary" onclick="document.getElementById('assetFormCard').style.display=''">+ عهدة جديدة</button>
        </div>
        <div class="card" id="assetFormCard" style="display:none;">
            <div class="card-header">إضافة عهدة</div>
            <div class="card-body">
                <form id="assetForm">
                    <div class="row">
                        <div class="col-3"><div class="form-group"><label class="form-label">الزبون *</label><select class="form-control" name="customer_id" id="assetCustId" required></select></div></div>
                        <div class="col-3"><div class="form-group"><label class="form-label">الصنف *</label><select class="form-control" name="item_id" id="assetItemId" required></select></div></div>
                        <div class="col-3"><div class="form-group"><label class="form-label">العدد *</label><input type="number" class="form-control" name="quantity" min="1" value="1" required></div></div>
                    </div>
                    <button type="button" class="btn btn-success" onclick="saveAsset()">💾 حفظ</button>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('assetFormCard').style.display='none'">إلغاء</button>
                </form>
            </div>
        </div>
        <div class="card">
            <div class="card-header">قائمة العهد</div>
            <div class="card-body" id="assetsTable"></div>
        </div>`;
    await loadSelect('assetCustId', '/api/customers', 'id', 'name', 'اختر الزبون...');
    await loadSelect('assetItemId', '/api/inventory/items', 'id', 'name', 'اختر الصنف...');
    loadAssets();
});

async function loadAssets() {
    showSkeleton('assetsTable');
    const result = await api.get('/api/inventory/assets');
    if (result && result.status === 'success') {
        buildTable('assetsTable', [
            { key: 'id', title: '#' },
            { key: 'customer_name', title: 'الزبون' },
            { key: 'item_name', title: 'الصنف' },
            { key: 'item_capacity', title: 'السعة' },
            { key: 'quantity', title: 'العدد' },
            { key: 'placement_date', title: 'تاريخ الوضع', type: 'date' },
            { key: 'status', title: 'الحالة', type: 'badge', badges: { 'Deployed': 'badge-success', 'Retrieved': 'badge-info' } }
        ], result.data, [
            { title: 'استرجاع', icon: '↩️', class: 'btn-warning', handler: 'retrieveAsset', condition: r => r.status === 'Deployed' }
        ]);
    }
}

async function saveAsset() {
    const data = getFormData('assetForm');
    const result = await api.post('/api/inventory/assets', data);
    if (result.status === 'success') { showToast('تم حفظ العهدة'); document.getElementById('assetFormCard').style.display = 'none'; loadAssets(); }
    else showToast(result.message, 'error');
}

async function retrieveAsset(id) {
    if (!confirm('هل تريد استرجاع هذه العهدة؟')) return;
    const result = await api.put(`/api/inventory/assets?id=${id}`, { status: 'Retrieved' });
    if (result.status === 'success') { showToast('تم الاسترجاع'); loadAssets(); }
    else showToast(result.message, 'error');
}

// ============================================
// REPORTS PAGE
// ============================================
registerPage('reports', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header"><h1>📈 التقارير</h1></div>
        <div class="card">
            <div class="card-header">اختر التقرير</div>
            <div class="card-body">
                <div class="row">
                    <div class="col-4">
                        <div class="form-group">
                            <label class="form-label">نوع التقرير</label>
                            <select class="form-control" id="reportType" onchange="onReportTypeChange()">
                                <option value="driver-daily">تقرير السائق اليومي</option>
                                <option value="customer-statement">كشف حساب زبون</option>
                                <option value="sales-summary">المبيعات الإجمالية</option>
                                <option value="water-consumption">استهلاك المياه</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-4" id="reportDriverCol">
                        <div class="form-group">
                            <label class="form-label">السائق</label>
                            <select class="form-control" id="reportDriverId"></select>
                        </div>
                    </div>
                    <div class="col-4" id="reportCustomerCol" style="display:none;">
                        <div class="form-group">
                            <label class="form-label">الزبون</label>
                            <select class="form-control" id="reportCustomerId"></select>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-3"><div class="form-group"><label class="form-label">من تاريخ</label><input type="date" class="form-control" id="reportFromDate" value="${todayDate()}"></div></div>
                    <div class="col-3"><div class="form-group"><label class="form-label">إلى تاريخ</label><input type="date" class="form-control" id="reportToDate" value="${todayDate()}"></div></div>
                    <div class="col-3" id="reportGroupCol" style="display:none;">
                        <div class="form-group"><label class="form-label">تجميع</label><select class="form-control" id="reportGroupBy"><option value="day">يومي</option><option value="month">شهري</option></select></div>
                    </div>
                    <div class="col-3" style="display:flex;align-items:flex-end;">
                        <button class="btn btn-primary" onclick="generateReport()">📊 عرض التقرير</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="card" id="reportResultCard" style="display:none;">
            <div class="card-header"><span id="reportTitle">نتائج التقرير</span><button class="btn btn-sm btn-secondary" onclick="printContent('reportContent')">🖨️ طباعة</button></div>
            <div class="card-body" id="reportContent"></div>
        </div>`;
    await loadSelect('reportDriverId', '/api/drivers/active');
    await loadSelect('reportCustomerId', '/api/customers', 'id', 'name', 'اختر الزبون...');
});

function onReportTypeChange() {
    const type = document.getElementById('reportType').value;
    document.getElementById('reportDriverCol').style.display = type === 'driver-daily' ? '' : 'none';
    document.getElementById('reportCustomerCol').style.display = type === 'customer-statement' ? '' : 'none';
    document.getElementById('reportGroupCol').style.display = type === 'sales-summary' ? '' : 'none';
}

async function generateReport() {
    const type = document.getElementById('reportType').value;
    const fromDate = document.getElementById('reportFromDate').value;
    const toDate = document.getElementById('reportToDate').value;
    
    document.getElementById('reportResultCard').style.display = '';
    const content = document.getElementById('reportContent');
    content.innerHTML = '<div class="skeleton skeleton-box"></div>';

    let result;
    
    if (type === 'driver-daily') {
        const driverId = document.getElementById('reportDriverId').value;
        result = await api.get(`/api/reports/driver-daily?driver_id=${driverId}&date=${fromDate}`);
        if (result?.status === 'success') {
            const r = result.data.report;
            content.innerHTML = `
                <h3>📊 تقرير السائق: ${result.data.driver?.name || '-'} | ${fromDate}</h3>
                <div class="row" style="margin:16px 0;">
                    <div class="col-3"><div class="stat-card"><div class="stat-icon blue">🚚</div><div class="stat-info"><h3>${r.trip_count}</h3><p>الحمولات</p></div></div></div>
                    <div class="col-3"><div class="stat-card"><div class="stat-icon green">💵</div><div class="stat-info"><h3>${formatMoney(r.total_net)}</h3><p>إجمالي المبيعات</p></div></div></div>
                    <div class="col-3"><div class="stat-card"><div class="stat-icon orange">🏷️</div><div class="stat-info"><h3>${formatMoney(r.total_commission)}</h3><p>العمولة</p></div></div></div>
                    <div class="col-3"><div class="stat-card"><div class="stat-icon red">💳</div><div class="stat-info"><h3>${formatMoney(r.total_due)}</h3><p>الآجل</p></div></div></div>
                </div>
                <p><strong>النقد المستلم:</strong> ${formatMoney(r.total_cash)}</p>
                <p><strong>الصافي بعد العمولة والمصاريف:</strong> ${formatMoney(r.total_cash - r.total_commission - r.total_expenses)}</p>`;
            document.getElementById('reportTitle').textContent = `تقرير السائق اليومي`;
        }
    } else if (type === 'customer-statement') {
        const custId = document.getElementById('reportCustomerId').value;
        result = await api.get(`/api/reports/customer-statement?customer_id=${custId}&from_date=${fromDate}&to_date=${toDate}`);
        if (result?.status === 'success') {
            let html = `<h3>📋 كشف حساب: ${result.data.customer.name}</h3>
                <p>الرصيد الحالي: <strong style="color:var(--danger)">${formatMoney(result.data.customer.balance)}</strong></p>
                <table class="data-table"><thead><tr><th>التاريخ</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>`;
            result.data.transactions.forEach(tx => {
                html += `<tr>
                    <td>${formatDateTime(tx.transaction_date)}</td>
                    <td>${tx.description}</td>
                    <td class="num" style="color:var(--danger)">${parseFloat(tx.debit) > 0 ? formatMoney(tx.debit) : '-'}</td>
                    <td class="num" style="color:var(--success)">${parseFloat(tx.credit) > 0 ? formatMoney(tx.credit) : '-'}</td>
                    <td class="num" style="font-weight:700">${formatMoney(tx.running_balance)}</td>
                </tr>`;
            });
            html += `</tbody></table>
                <div class="financial-total danger" style="margin-top:16px;">الرصيد الختامي: ${formatMoney(result.data.final_balance)} ريال</div>`;
            content.innerHTML = html;
            document.getElementById('reportTitle').textContent = 'كشف حساب زبون';
        }
    } else if (type === 'sales-summary') {
        const groupBy = document.getElementById('reportGroupBy').value;
        result = await api.get(`/api/reports/sales-summary?group_by=${groupBy}&from_date=${fromDate}&to_date=${toDate}`);
        if (result?.status === 'success') {
            buildTable('reportContent', [
                { key: 'period', title: 'الفترة' },
                { key: 'invoice_count', title: 'عدد الفواتير' },
                { key: 'total', title: 'الإجمالي', type: 'money' },
                { key: 'discount', title: 'الخصومات', type: 'money' },
                { key: 'net', title: 'الصافي', type: 'money' },
                { key: 'paid', title: 'المحصل', type: 'money' },
                { key: 'due', title: 'المتبقي', type: 'money' },
                { key: 'total_quantity_m3', title: 'الكمية (م³)' }
            ], result.data);
            document.getElementById('reportTitle').textContent = 'تقرير المبيعات الإجمالية';
        }
    } else if (type === 'water-consumption') {
        result = await api.get(`/api/reports/water-consumption?from_date=${fromDate}&to_date=${toDate}`);
        if (result?.status === 'success') {
            buildTable('reportContent', [
                { key: 'date', title: 'التاريخ' },
                { key: 'total_m3', title: 'إجمالي (م³)' },
                { key: 'invoice_count', title: 'عدد الفواتير' }
            ], result.data);
            document.getElementById('reportTitle').textContent = 'تقرير استهلاك المياه';
        }
    }
}

// ============================================
// FINANCIAL PERIODS PAGE
// ============================================
registerPage('periods', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>📅 الفترات المالية</h1>
            <button class="btn btn-primary" onclick="document.getElementById('periodFormCard').style.display=''">+ فترة جديدة</button>
        </div>
        <div class="card" id="periodFormCard" style="display:none;">
            <div class="card-header">إضافة فترة مالية</div>
            <div class="card-body">
                <form id="periodForm">
                    <div class="row">
                        <div class="col-3"><div class="form-group"><label class="form-label">اسم الفترة *</label><input type="text" class="form-control" name="period_name" placeholder="مثال: يناير 2025" required></div></div>
                        <div class="col-3"><div class="form-group"><label class="form-label">من تاريخ *</label><input type="date" class="form-control" name="start_date" required></div></div>
                        <div class="col-3"><div class="form-group"><label class="form-label">إلى تاريخ *</label><input type="date" class="form-control" name="end_date" required></div></div>
                    </div>
                    <button type="button" class="btn btn-success" onclick="savePeriod()">💾 حفظ</button>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('periodFormCard').style.display='none'">إلغاء</button>
                </form>
            </div>
        </div>
        <div class="card">
            <div class="card-header">الفترات المالية</div>
            <div class="card-body" id="periodsTable"></div>
        </div>`;
    loadPeriods();
});

async function loadPeriods() {
    showSkeleton('periodsTable');
    const result = await api.get('/api/periods');
    if (result && result.status === 'success') {
        buildTable('periodsTable', [
            { key: 'id', title: '#' },
            { key: 'period_name', title: 'الفترة' },
            { key: 'start_date', title: 'من', type: 'date' },
            { key: 'end_date', title: 'إلى', type: 'date' },
            { key: 'is_closed', title: 'الحالة', type: 'boolean', render: v => v == 1 ? '<span class="badge badge-danger">مغلقة</span>' : '<span class="badge badge-success">مفتوحة</span>' }
        ], result.data, [
            { title: 'إغلاق', icon: '🔒', class: 'btn-danger', handler: 'closePeriod', condition: r => r.is_closed != 1 }
        ]);
    }
}

async function savePeriod() {
    const data = getFormData('periodForm');
    const result = await api.post('/api/periods', data);
    if (result.status === 'success') { showToast('تم إضافة الفترة'); document.getElementById('periodFormCard').style.display = 'none'; loadPeriods(); }
    else showToast(result.message, 'error');
}

async function closePeriod(id) {
    if (!confirm('⚠️ هل تريد إغلاق هذه الفترة؟ لن يمكن التراجع!')) return;
    const result = await api.post(`/api/periods/close?id=${id}`);
    if (result.status === 'success') { showToast('تم إغلاق الفترة وأخذ اللقطة ✅'); loadPeriods(); }
    else showToast(result.message, 'error');
}

// ============================================
// DRIVERS PAGE
// ============================================
registerPage('drivers', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>🧑‍✈️ إدارة السائقين</h1>
            <button class="btn btn-primary" onclick="showDriverForm()">+ سائق جديد</button>
        </div>
        <div class="card" id="driverFormCard" style="display:none;">
            <div class="card-header" id="driverFormTitle">إضافة سائق</div>
            <div class="card-body">
                <form id="driverForm">
                    <input type="hidden" name="id" id="driverId">
                    <div class="row">
                        <div class="col-3"><div class="form-group"><label class="form-label">الاسم *</label><input type="text" class="form-control" name="name" required></div></div>
                        <div class="col-3"><div class="form-group"><label class="form-label">الجوال</label><input type="text" class="form-control" name="phone"></div></div>
                        <div class="col-3"><div class="form-group"><label class="form-label">الحالة</label><select class="form-control" name="is_active"><option value="1">فعال</option><option value="0">معطل</option></select></div></div>
                    </div>
                    <button type="button" class="btn btn-success" onclick="saveDriver()">💾 حفظ</button>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('driverFormCard').style.display='none'">إلغاء</button>
                </form>
            </div>
        </div>
        <div class="card">
            <div class="card-body" id="driversTable"></div>
        </div>`;
    loadDrivers();
});

async function loadDrivers() {
    showSkeleton('driversTable');
    const result = await api.get('/api/drivers');
    if (result?.status === 'success') {
        buildTable('driversTable', [
            { key: 'id', title: '#' },
            { key: 'name', title: 'الاسم' },
            { key: 'phone', title: 'الجوال' },
            { key: 'is_active', title: 'الحالة', type: 'boolean' }
        ], result.data, [
            { title: 'تعديل', icon: '✏️', class: 'btn-primary', handler: 'editDriver' },
            { title: 'حذف', icon: '🗑️', class: 'btn-danger', handler: 'deleteDriver' }
        ]);
    }
}

function showDriverForm() { document.getElementById('driverFormCard').style.display = ''; resetForm('driverForm'); document.getElementById('driverId').value = ''; document.getElementById('driverFormTitle').textContent = 'إضافة سائق'; }

async function editDriver(id) {
    const result = await api.get(`/api/drivers/show?id=${id}`);
    if (result?.status === 'success') { document.getElementById('driverFormCard').style.display = ''; populateForm('driverForm', result.data); document.getElementById('driverId').value = id; document.getElementById('driverFormTitle').textContent = 'تعديل السائق'; }
}

async function saveDriver() {
    const data = getFormData('driverForm');
    const id = data.id; delete data.id;
    const result = id ? await api.put(`/api/drivers?id=${id}`, data) : await api.post('/api/drivers', data);
    if (result.status === 'success') { showToast('تم الحفظ'); document.getElementById('driverFormCard').style.display = 'none'; loadDrivers(); }
    else showToast(result.message, 'error');
}

async function deleteDriver(id) {
    if (!confirm('هل تريد حذف هذا السائق؟')) return;
    const result = await api.delete(`/api/drivers?id=${id}`);
    result.status === 'success' ? (showToast('تم الحذف'), loadDrivers()) : showToast(result.message, 'error');
}

// ============================================
// TRUCKS PAGE
// ============================================
registerPage('trucks', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>🚛 إدارة الوايتات</h1>
            <button class="btn btn-primary" onclick="showTruckForm()">+ وايت جديد</button>
        </div>
        <div class="card" id="truckFormCard" style="display:none;">
            <div class="card-header" id="truckFormTitle">إضافة وايت</div>
            <div class="card-body">
                <form id="truckForm">
                    <input type="hidden" name="id" id="truckId">
                    <div class="row">
                        <div class="col-3"><div class="form-group"><label class="form-label">رقم اللوحة *</label><input type="text" class="form-control" name="plate_number" required></div></div>
                        <div class="col-3"><div class="form-group"><label class="form-label">السعة (م³) *</label><input type="number" class="form-control" name="capacity_m3" step="0.01" min="0" required></div></div>
                        <div class="col-3"><div class="form-group"><label class="form-label">الحالة</label><select class="form-control" name="is_active"><option value="1">يعمل</option><option value="0">متعطل</option></select></div></div>
                    </div>
                    <button type="button" class="btn btn-success" onclick="saveTruck()">💾 حفظ</button>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('truckFormCard').style.display='none'">إلغاء</button>
                </form>
            </div>
        </div>
        <div class="card">
            <div class="card-body" id="trucksTable"></div>
        </div>`;
    loadTrucks();
});

async function loadTrucks() {
    showSkeleton('trucksTable');
    const result = await api.get('/api/trucks');
    if (result?.status === 'success') {
        buildTable('trucksTable', [
            { key: 'id', title: '#' },
            { key: 'plate_number', title: 'رقم اللوحة' },
            { key: 'capacity_m3', title: 'السعة (م³)' },
            { key: 'is_active', title: 'الحالة', type: 'boolean' }
        ], result.data, [
            { title: 'تعديل', icon: '✏️', class: 'btn-primary', handler: 'editTruck' },
            { title: 'حذف', icon: '🗑️', class: 'btn-danger', handler: 'deleteTruck' }
        ]);
    }
}

function showTruckForm() { document.getElementById('truckFormCard').style.display = ''; resetForm('truckForm'); document.getElementById('truckId').value = ''; }

async function editTruck(id) {
    const result = await api.get(`/api/trucks/show?id=${id}`);
    if (result?.status === 'success') { document.getElementById('truckFormCard').style.display = ''; populateForm('truckForm', result.data); document.getElementById('truckId').value = id; }
}

async function saveTruck() {
    const data = getFormData('truckForm');
    const id = data.id; delete data.id;
    const result = id ? await api.put(`/api/trucks?id=${id}`, data) : await api.post('/api/trucks', data);
    if (result.status === 'success') { showToast('تم الحفظ'); document.getElementById('truckFormCard').style.display = 'none'; loadTrucks(); }
    else showToast(result.message, 'error');
}

async function deleteTruck(id) {
    if (!confirm('هل تريد حذف هذا الوايت؟')) return;
    const result = await api.delete(`/api/trucks?id=${id}`);
    result.status === 'success' ? (showToast('تم الحذف'), loadTrucks()) : showToast(result.message, 'error');
}

// ============================================
// SETTINGS PAGE
// ============================================
registerPage('settings', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>⚙️ الإعدادات</h1>
        </div>
        <div class="card">
            <div class="card-header">إعدادات النظام</div>
            <div class="card-body" id="settingsForm">جاري التحميل...</div>
        </div>`;
    
    const result = await api.get('/api/settings');
    if (result?.status === 'success') {
        const settings = result.data;
        let html = '<form id="settForm">';
        
        html += '<h3 style="margin-bottom:12px;">💰 عمولات السائقين</h3><div class="row">';
        Object.keys(settings).forEach(key => {
            if (key.startsWith('commission_')) {
                const label = key.replace('commission_', 'عمولة ').replace('_', '.').replace('m3', ' م³');
                html += `<div class="col-3"><div class="form-group"><label class="form-label">${label}</label><input type="number" class="form-control money-input" name="${key}" value="${settings[key]}" step="0.01" min="0"></div></div>`;
            }
        });
        html += '</div>';
        
        html += '<h3 style="margin:20px 0 12px;">💵 أسعار وضرائب</h3><div class="row">';
        const moneyFields = {
            'price_per_m3': 'سعر المتر المكعب الافتراضي',
            'vat_rate':     'نسبة الضريبة %'
        };
        Object.entries(moneyFields).forEach(([key, label]) => {
            const v = settings[key] !== undefined ? settings[key] : '';
            html += `<div class="col-3"><div class="form-group"><label class="form-label">${label}</label><input type="number" class="form-control money-input" name="${key}" value="${v}" step="0.01" min="0"></div></div>`;
        });
        html += '</div>';

        html += '<h3 style="margin:20px 0 12px;">🏢 إعدادات عامة</h3><div class="row">';
        const textFields = {
            'station_name': 'اسم المحطة',
            'station_phone': 'رقم الهاتف',
            'currency':     'العملة'
        };
        Object.entries(textFields).forEach(([key, label]) => {
            const v = settings[key] !== undefined ? settings[key] : '';
            html += `<div class="col-3"><div class="form-group"><label class="form-label">${label}</label><input type="text" class="form-control" name="${key}" value="${v}"></div></div>`;
        });
        html += '</div>';
        
        html += '<div style="margin-top:16px;"><button type="button" class="btn btn-primary btn-lg" onclick="saveSettings()" id="saveSettBtn"><span class="spinner"></span><span class="btn-text">💾 حفظ الإعدادات (Ctrl+S)</span></button>';
        html += ' <button type="button" class="btn btn-secondary" onclick="generateCommissions()">⚡ توليد عمولات جديدة</button></div>';
        html += '</form>';
        
        document.getElementById('settingsForm').innerHTML = html;
    }
});

async function saveSettings() {
    const btn = document.getElementById('saveSettBtn');
    setButtonLoading(btn, true);
    const form = document.getElementById('settForm');
    const settings = {};
    form.querySelectorAll('[name]').forEach(el => { settings[el.name] = el.value; });
    const result = await api.post('/api/settings', { settings });
    setButtonLoading(btn, false);
    if (result.status === 'success') {
        showToast('تم حفظ الإعدادات ✅');
        // Refresh defaults in calc engine
        await Calc.loadDefaults();
    } else showToast(result.message, 'error');
}

async function generateCommissions() {
    const result = await api.post('/api/settings/generate-commissions');
    if (result.status === 'success') { showToast('تم توليد إعدادات العمولات'); navigateTo('settings'); }
    else showToast(result.message, 'error');
}

// ============================================
// USERS PAGE (Admin only)
// ============================================
registerPage('users', async () => {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
        <div class="page-header">
            <h1>🔑 إدارة المستخدمين</h1>
            <button class="btn btn-primary" onclick="showUserForm()">+ مستخدم جديد</button>
        </div>
        <div class="card" id="userFormCard" style="display:none;">
            <div class="card-header">إضافة مستخدم</div>
            <div class="card-body">
                <form id="userForm">
                    <input type="hidden" name="id" id="userId">
                    <div class="row">
                        <div class="col-4"><div class="form-group"><label class="form-label">اسم المستخدم *</label><input type="text" class="form-control" name="username" required></div></div>
                        <div class="col-4"><div class="form-group"><label class="form-label">كلمة المرور *</label><input type="password" class="form-control" name="password" required></div></div>
                        <div class="col-4"><div class="form-group"><label class="form-label">الصلاحية</label><select class="form-control" name="role"><option value="Accountant">محاسب</option><option value="Admin">مدير</option></select></div></div>
                    </div>
                    <div class="form-group"><label class="form-label">الحالة</label><select class="form-control" name="is_active"><option value="1">فعال</option><option value="0">معطل</option></select></div>
                    <button type="button" class="btn btn-success" onclick="saveUser()">💾 حفظ</button>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('userFormCard').style.display='none'">إلغاء</button>
                </form>
            </div>
        </div>
        <div class="card">
            <div class="card-body" id="usersTable"></div>
        </div>`;
    loadUsers();
});

async function loadUsers() {
    showSkeleton('usersTable');
    const result = await api.get('/api/users');
    if (result?.status === 'success') {
        buildTable('usersTable', [
            { key: 'id', title: '#' },
            { key: 'username', title: 'اسم المستخدم' },
            { key: 'role', title: 'الصلاحية', render: v => v === 'Admin' ? '<span class="badge badge-danger">مدير</span>' : '<span class="badge badge-primary">محاسب</span>' },
            { key: 'is_active', title: 'الحالة', type: 'boolean' }
        ], result.data, [
            { title: 'تعديل', icon: '✏️', class: 'btn-primary', handler: 'editUser' },
            { title: 'حذف', icon: '🗑️', class: 'btn-danger', handler: 'deleteUser' }
        ]);
    }
}

function showUserForm() { document.getElementById('userFormCard').style.display = ''; resetForm('userForm'); document.getElementById('userId').value = ''; }

async function editUser(id) {
    const result = await api.get(`/api/users/show?id=${id}`);
    if (result?.status === 'success') { document.getElementById('userFormCard').style.display = ''; populateForm('userForm', result.data); document.getElementById('userId').value = id; }
}

async function saveUser() {
    const data = getFormData('userForm');
    const id = data.id; delete data.id;
    if (!data.password && id) delete data.password;
    const result = id ? await api.put(`/api/users?id=${id}`, data) : await api.post('/api/users', data);
    if (result.status === 'success') { showToast('تم الحفظ'); document.getElementById('userFormCard').style.display = 'none'; loadUsers(); }
    else showToast(result.message, 'error');
}

async function deleteUser(id) {
    if (!confirm('هل تريد حذف هذا المستخدم؟')) return;
    const result = await api.delete(`/api/users?id=${id}`);
    result.status === 'success' ? (showToast('تم الحذف'), loadUsers()) : showToast(result.message, 'error');
}

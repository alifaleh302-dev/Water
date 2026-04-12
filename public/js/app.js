/**
 * Water Management System - Main Application JavaScript
 * Vanilla JS with Fetch API
 */

// ============================================
// Configuration
// ============================================
const API_BASE = '';

// ============================================
// API Helper
// ============================================
const api = {
    async request(method, endpoint, data = null) {
        const url = endpoint.includes('?') 
            ? `${API_BASE}${endpoint}` 
            : `${API_BASE}${endpoint}`;
        
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (response.status === 401 && !endpoint.includes('auth')) {
                window.location.href = 'index.html';
                return null;
            }
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            showToast('خطأ في الاتصال بالخادم', 'error');
            return { status: 'error', message: 'خطأ في الاتصال' };
        }
    },

    get(endpoint) { return this.request('GET', endpoint); },
    post(endpoint, data) { return this.request('POST', endpoint, data); },
    put(endpoint, data) { return this.request('PUT', endpoint, data); },
    delete(endpoint) { return this.request('DELETE', endpoint); }
};

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'success', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// Button Loading State
// ============================================
function setButtonLoading(btn, loading) {
    if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
        if (!btn.querySelector('.spinner')) {
            const spinner = document.createElement('span');
            spinner.className = 'spinner';
            btn.insertBefore(spinner, btn.firstChild);
        }
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ============================================
// Modal Helper
// ============================================
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop') && e.target.classList.contains('show')) {
        e.target.classList.remove('show');
        document.body.style.overflow = '';
    }
});

// ============================================
// Form Helpers
// ============================================

// Enter moves to next field
function setupEnterNavigation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
            e.preventDefault();
            const inputs = Array.from(form.querySelectorAll('input, select, textarea, button[type="submit"]'));
            const idx = inputs.indexOf(e.target);
            if (idx >= 0 && idx < inputs.length - 1) {
                inputs[idx + 1].focus();
            }
        }
    });
}

// Get form data as object
function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    
    const data = {};
    const elements = form.querySelectorAll('[name]');
    elements.forEach(el => {
        if (el.type === 'checkbox') {
            data[el.name] = el.checked ? 1 : 0;
        } else {
            data[el.name] = el.value;
        }
    });
    return data;
}

// Reset form
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
}

// Populate form with data
function populateForm(formId, data) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    Object.keys(data).forEach(key => {
        const el = form.querySelector(`[name="${key}"]`);
        if (el) {
            if (el.type === 'checkbox') {
                el.checked = !!data[key];
            } else {
                el.value = data[key] ?? '';
            }
        }
    });
}

// ============================================
// Format Numbers
// ============================================
function formatMoney(amount) {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ============================================
// Table Builder
// ============================================
function buildTable(containerId, columns, data, actions = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📋</div>
                <p>لا توجد بيانات لعرضها</p>
            </div>`;
        return;
    }

    let html = '<div class="table-responsive"><table class="data-table"><thead><tr>';
    
    columns.forEach(col => {
        html += `<th>${col.title}</th>`;
    });
    if (actions) {
        html += '<th>الإجراءات</th>';
    }
    html += '</tr></thead><tbody>';

    data.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            let value = row[col.key] ?? '-';
            let cls = '';

            if (col.type === 'money') {
                value = formatMoney(value);
                cls = 'num';
                if (parseFloat(row[col.key]) > 0 && col.positive) cls += ' positive';
                if (parseFloat(row[col.key]) > 0 && col.negative) cls += ' negative';
            } else if (col.type === 'date') {
                value = formatDate(value);
            } else if (col.type === 'datetime') {
                value = formatDateTime(value);
            } else if (col.type === 'badge') {
                const badgeMap = col.badges || {};
                const badgeClass = badgeMap[value] || 'badge-info';
                value = `<span class="badge ${badgeClass}">${value}</span>`;
            } else if (col.type === 'boolean') {
                value = value == 1 || value === true ? 
                    '<span class="badge badge-success">فعال</span>' : 
                    '<span class="badge badge-danger">معطل</span>';
            }

            if (col.render) {
                value = col.render(row[col.key], row);
            }

            html += `<td class="${cls}">${value}</td>`;
        });

        if (actions) {
            html += '<td>';
            actions.forEach(action => {
                if (action.condition && !action.condition(row)) return;
                html += `<button class="btn btn-sm ${action.class || 'btn-primary'}" onclick="${action.handler}(${row.id})" title="${action.title}">${action.icon || action.title}</button> `;
            });
            html += '</td>';
        }
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ============================================
// Skeleton Loader
// ============================================
function showSkeleton(containerId, rows = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = '';
    for (let i = 0; i < rows; i++) {
        html += '<div class="skeleton skeleton-line" style="width:' + (60 + Math.random() * 40) + '%"></div>';
    }
    container.innerHTML = html;
}

// ============================================
// Sidebar Toggle
// ============================================
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('mobile-open');
        }
    }
}

// ============================================
// Navigation / SPA Router
// ============================================
const pages = {};

function registerPage(name, loadFn) {
    pages[name] = loadFn;
}

function navigateTo(pageName) {
    // Update active nav
    document.querySelectorAll('.sidebar-nav a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('data-page') === pageName) {
            a.classList.add('active');
        }
    });

    // Load page content
    if (pages[pageName]) {
        pages[pageName]();
    }

    // Close mobile sidebar
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('mobile-open');
    }

    // Update URL hash
    window.location.hash = pageName;
}

// Handle nav clicks
document.addEventListener('click', (e) => {
    const navLink = e.target.closest('[data-page]');
    if (navLink) {
        e.preventDefault();
        navigateTo(navLink.getAttribute('data-page'));
    }
});

// Handle browser back/forward
window.addEventListener('hashchange', () => {
    const page = window.location.hash.slice(1);
    if (page && pages[page]) {
        navigateTo(page);
    }
});

// ============================================
// Authentication
// ============================================
async function checkAuth() {
    const result = await api.get('/api/auth/me');
    if (result && result.status === 'success') {
        return result.data;
    }
    return null;
}

async function login(username, password) {
    const result = await api.post('/api/auth/login', { username, password });
    if (result.status === 'success') {
        showToast('تم تسجيل الدخول بنجاح', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 500);
    } else {
        showToast(result.message, 'error');
    }
    return result;
}

async function logout() {
    await api.post('/api/auth/logout');
    window.location.href = 'index.html';
}

// ============================================
// Validate Financial Inputs (no negatives)
// ============================================
function validatePositiveInput(input) {
    const val = parseFloat(input.value);
    if (val < 0) {
        input.value = 0;
        showToast('القيم السالبة غير مسموحة', 'warning');
        return false;
    }
    return true;
}

// Add validation to all money inputs
document.addEventListener('input', (e) => {
    if (e.target.classList.contains('money-input') || e.target.dataset.positive === 'true') {
        validatePositiveInput(e.target);
    }
});

// ============================================
// Print Helper
// ============================================
function printContent(elementId) {
    const content = document.getElementById(elementId);
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>طباعة</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Tajawal', sans-serif; direction: rtl; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: right; }
                th { background: #f5f5f5; font-weight: 700; }
                .num { text-align: left; direction: ltr; }
                h2, h3 { margin: 10px 0; }
                .total { font-size: 1.2rem; font-weight: 700; margin: 15px 0; padding: 10px; background: #f0f0f0; }
                .header-print { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                @media print { body { padding: 5px; } }
            </style>
        </head>
        <body>${content.innerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
}

// ============================================
// Debounce for search
// ============================================
function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ============================================
// Select Dropdown Loader
// ============================================
async function loadSelect(selectId, endpoint, valueKey = 'id', textKey = 'name', placeholder = 'اختر...') {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = `<option value="">${placeholder}</option>`;
    
    const result = await api.get(endpoint);
    if (result && result.status === 'success' && Array.isArray(result.data)) {
        result.data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[textKey];
            select.appendChild(option);
        });
    }
}

// ============================================
// Today's date helper
// ============================================
function todayDate() {
    return new Date().toISOString().split('T')[0];
}

// Set date inputs to today
function setDateToToday(inputId) {
    const input = document.getElementById(inputId);
    if (input) input.value = todayDate();
}

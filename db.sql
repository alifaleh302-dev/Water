-- ==============================================================================
-- نظام إدارة محطة المياه - قاعدة بيانات PostgreSQL
-- ==============================================================================

-- ==============================================================================
-- 1. قسم الإعدادات والمستخدمين (Settings & Users)
-- ==============================================================================

CREATE TABLE Users (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للمستخدم
    username VARCHAR(100) NOT NULL UNIQUE,          -- اسم المستخدم (للمحاسب أو المدير)
    password VARCHAR(255) NOT NULL,                 -- كلمة المرور (يجب تخزينها مشفرة)
    role VARCHAR(50) NOT NULL,                      -- نوع الصلاحية (مثال: Admin / Accountant)
    is_active BOOLEAN DEFAULT TRUE                  -- حالة الحساب (هل هو مسموح له بالدخول؟)
);

CREATE TABLE Settings (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للإعداد
    setting_key VARCHAR(100) NOT NULL UNIQUE,       -- اسم الإعداد (مثل: commission_6m3)
    setting_value VARCHAR(255) NOT NULL             -- القيمة المرتبطة بالإعداد
);

-- ==============================================================================
-- 2. قسم البيانات الأساسية والموارد (Master Data)
-- ==============================================================================

CREATE TABLE Drivers (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للسائق
    name VARCHAR(150) NOT NULL,                     -- اسم السائق
    phone VARCHAR(20),                              -- رقم جوال السائق
    is_active BOOLEAN DEFAULT TRUE                  -- حالة السائق (على رأس العمل أم لا)
);

CREATE TABLE Trucks (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للوايت (الناقلة)
    plate_number VARCHAR(50) NOT NULL UNIQUE,       -- رقم اللوحة للوايت
    capacity_m3 NUMERIC(5,2) NOT NULL,              -- سعة الخزان بالمتر المكعب (مثال: 6.00 أو 12.00)
    is_active BOOLEAN DEFAULT TRUE                  -- حالة الوايت (يعمل أو متعطل)
);

CREATE TABLE Customers (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للزبون
    name VARCHAR(150) NOT NULL,                     -- اسم الزبون أو المحل التجاري
    phone VARCHAR(20),                              -- رقم جوال الزبون
    neighborhood VARCHAR(100),                      -- الحي أو المنطقة
    balance NUMERIC(10,2) DEFAULT 0.00,             -- الرصيد الحالي للمديونية (يُحدث تلقائياً)
    total_lifetime_paid NUMERIC(15,2) DEFAULT 0.00  -- إجمالي ما دفعه الزبون للمحطة منذ أول يوم للتعامل
);

-- ==============================================================================
-- 3. قسم العمليات اليومية (Daily Operations)
-- ==============================================================================

CREATE TABLE Trips (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للرحلة/الحمولة
    driver_id INT REFERENCES Drivers(id),           -- السائق الذي قام بالرحلة
    truck_id INT REFERENCES Trucks(id),             -- الوايت المستخدم في هذه الرحلة
    trip_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- تاريخ ووقت خروج الحمولة
    commission_amount NUMERIC(10,2) NOT NULL,       -- عمولة السائق الثابتة على هذه الحمولة
    status VARCHAR(50) DEFAULT 'Open'               -- حالة الرحلة (Open: مفتوحة / Closed: مصفاة)
);

CREATE TABLE Invoices (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للفاتورة
    trip_id INT REFERENCES Trips(id),               -- الرحلة المرتبطة بها الفاتورة (لتتبع السائق والوايت)
    customer_id INT REFERENCES Customers(id),       -- الزبون المشتري
    invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,-- تاريخ ووقت إصدار الفاتورة
    quantity_m3 NUMERIC(10,2) NOT NULL,             -- الكمية المباعة بالمتر المكعب
    total_amount NUMERIC(10,2) NOT NULL,            -- إجمالي قيمة الفاتورة قبل الخصم
    discount_amount NUMERIC(10,2) DEFAULT 0.00,     -- الخصم التجاري الممنوح لحظة البيع
    net_amount NUMERIC(10,2) NOT NULL,              -- الصافي المطلوب (الإجمالي - الخصم)
    paid_amount NUMERIC(10,2) DEFAULT 0.00,         -- ما دفعه الزبون نقداً لحظة البيع
    due_amount NUMERIC(10,2) DEFAULT 0.00           -- الدين المتبقي من الفاتورة (الصافي - المدفوع)
);

-- ==============================================================================
-- 4. قسم التحصيل وتصفية السائق (Collections & Settlements)
-- ==============================================================================

CREATE TABLE Driver_Settlements (
    id SERIAL PRIMARY KEY,                          -- رقم سند التصفية (سند القبض العام من السائق)
    driver_id INT REFERENCES Drivers(id),           -- السائق الذي سلم الأموال
    settlement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,-- تاريخ ووقت التصفية
    total_amount_received NUMERIC(10,2) NOT NULL,   -- إجمالي النقدية المستلمة من السائق
    accountant_id INT REFERENCES Users(id)          -- المحاسب الذي استلم النقدية وأنشأ السند
);

CREATE TABLE Settlement_Details (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد لتفاصيل السداد
    settlement_id INT REFERENCES Driver_Settlements(id) ON DELETE CASCADE, -- سند التصفية المرتبط
    customer_id INT REFERENCES Customers(id),       -- الزبون الذي تم التحصيل منه
    amount_paid NUMERIC(10,2) NOT NULL,             -- المبلغ المدفوع من هذا الزبون تحديداً
    payment_type VARCHAR(50) NOT NULL,              -- نوع الدفع (مثال: سداد دين سابق / دفعة مقدمة)
    discount_amount NUMERIC(10,2) DEFAULT 0.00      -- مسامحة أو خصم عند السداد (تخصم من دينه ولا تدخل الصندوق)
);


-- ==============================================================================
-- 5. قسم المصروفات (Expenses)
-- ==============================================================================

CREATE TABLE Expense_Categories (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد لنوع المصروف
    category_name VARCHAR(100) NOT NULL UNIQUE      -- اسم التصنيف (مثال: ديزل، بنشر، غسيل)
);

CREATE TABLE Expenses (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للمصروف
    expense_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,-- تاريخ ووقت المصروف
    category_id INT REFERENCES Expense_Categories(id),-- نوع المصروف
    driver_id INT REFERENCES Drivers(id),           -- السائق المرتبط بالمصروف (يمكن أن يكون NULL إذا كان مصروف محطة)
    amount NUMERIC(10,2) NOT NULL,                  -- قيمة المصروف
    notes TEXT                                      -- ملاحظات تفصيلية عن المصروف
);

-- ==============================================================================
-- 6. قسم المخزون والأصول (Inventory & Assets)
-- ==============================================================================

CREATE TABLE Items (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للصنف
    name VARCHAR(150) NOT NULL,                     -- اسم الصنف (كلور، فلتر، خزان)
    item_type VARCHAR(50) NOT NULL,                 -- نوع الصنف (مستهلك: Consumable / أصل: Asset)
    capacity VARCHAR(50),                           -- السعة أو الحجم (مثال: 1000 لتر للخزانات)
    unit VARCHAR(50) NOT NULL,                      -- الوحدة (مثال: حبة، جالون)
    min_limit INT DEFAULT 0,                        -- الحد الأدنى للتنبيه بالنقص
    current_stock INT DEFAULT 0                     -- الرصيد الحالي الفعلي في المستودع
);

CREATE TABLE Inventory_Purchases (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد لعملية الشراء
    item_id INT REFERENCES Items(id),               -- الصنف المشترى
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,-- تاريخ الشراء
    quantity INT NOT NULL,                          -- الكمية المشتراة
    unit_price NUMERIC(10,2) NOT NULL,              -- سعر الوحدة
    total_amount NUMERIC(10,2) NOT NULL             -- إجمالي التكلفة (لخصمها من الصندوق)
);

CREATE TABLE Inventory_Transactions (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد لحركة المخزون
    item_id INT REFERENCES Items(id),               -- الصنف المرتبط بالحركة
    transaction_type VARCHAR(50) NOT NULL,          -- نوع الحركة (مثال: صرف للاستخدام: Issue)
    quantity INT NOT NULL,                          -- الكمية المنصرفة
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- تاريخ الحركة
);

CREATE TABLE Customer_Assets (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للعهدة
    customer_id INT REFERENCES Customers(id),       -- الزبون المستلم للعهدة
    item_id INT REFERENCES Items(id),               -- الصنف الموزع (الخزان)
    quantity INT NOT NULL,                          -- العدد الموزع
    placement_date DATE DEFAULT CURRENT_DATE,       -- تاريخ وضع الأصل عند الزبون
    status VARCHAR(50) DEFAULT 'Deployed'           -- الحالة (Deployed: في الموقع / Retrieved: مسترجع)
);

-- ==============================================================================
-- 7. قسم الصندوق واليومية (Treasury & Cash Flow)
-- ==============================================================================

CREATE TABLE Fund_Transactions (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للحركة المالية
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- تاريخ ووقت الحركة
    transaction_type VARCHAR(10) NOT NULL,          -- نوع الحركة (In: قبض / Out: صرف)
    source_type VARCHAR(50) NOT NULL,               -- مصدر العملية (فاتورة / تصفية / مصروف / مشتريات)
    source_id INT,                                  -- رقم المستند المرجعي في جدوله الأصلي
    amount NUMERIC(10,2) NOT NULL,                  -- المبلغ المتعلق بهذه الحركة
    current_balance NUMERIC(15,2) NOT NULL          -- رصيد الصندوق التراكمي اللحظي بعد هذه العملية
);

CREATE TABLE Cash_Closings (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد لعملية الإقفال
    closing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,-- تاريخ ووقت الإقفال اليومي
    opening_balance NUMERIC(15,2) NOT NULL,         -- الرصيد الافتتاحي (المرحل من إقفال الأمس)
    expected_amount NUMERIC(15,2) NOT NULL,         -- المبلغ المفترض وجوده في الصندوق حسب النظام
    actual_amount NUMERIC(15,2) NOT NULL,           -- المبلغ الفعلي الموجود وتم عده يدوياً
    difference NUMERIC(15,2) DEFAULT 0.00,          -- الفارق إن وجد (عجز أو زيادة)
    closed_by INT REFERENCES Users(id)              -- المحاسب/المستخدم الذي قام بالإقفال
);

-- ==============================================================================
-- 8. قسم الدورات المالية (Financial Periods)
-- ==============================================================================

CREATE TABLE Financial_Periods (
    id SERIAL PRIMARY KEY,                          -- المعرف الفريد للدورة المالية
    period_name VARCHAR(100) NOT NULL,              -- اسم الفترة (مثال: يناير 2025)
    start_date DATE NOT NULL,                       -- تاريخ بداية الفترة
    end_date DATE NOT NULL,                         -- تاريخ نهاية الفترة
    is_closed BOOLEAN DEFAULT FALSE                 -- هل تم إقفال الفترة؟
);

CREATE TABLE Period_Snapshots (
    id SERIAL PRIMARY KEY,
    period_id INT REFERENCES Financial_Periods(id), -- ربط بالدورة المالية (شهر/سنة)
    entity_type VARCHAR(50),                        -- نوع الكيان (Customer, Item, Fund)
    entity_id INT,                                  -- رقم الزبون أو رقم الصنف أو رقم الصندوق
    opening_balance NUMERIC(15,2) DEFAULT 0.00,     -- الرصيد الافتتاحي (المورّد من الفترة السابقة)
    closing_balance NUMERIC(15,2) DEFAULT 0.00,     -- الرصيد الختامي (عند نهاية هذه الفترة)
    total_in NUMERIC(15,2) DEFAULT 0.00,            -- إجمالي الداخل خلال الفترة (مبيعات/توريد)
    total_out NUMERIC(15,2) DEFAULT 0.00            -- إجمالي الخارج خلال الفترة (مصاريف/صرف)
);

-- ==============================================================================
-- 9. إدخال البيانات الافتراضية
-- ==============================================================================

-- إنشاء مستخدم مدير افتراضي (كلمة المرور: admin123)
INSERT INTO Users (username, password, role, is_active) VALUES 
('admin', '$2b$12$6lA5RPyqQIdebZh0nj2JLOYuAEz6OxubCHCtwkeG3ogiGJP2.SrC.', 'Admin', TRUE);

-- إعدادات افتراضية
INSERT INTO Settings (setting_key, setting_value) VALUES 
('commission_6_00m3', '50'),
('commission_12_00m3', '80'),
('price_per_m3', '30'),
('station_name', 'محطة المياه'),
('station_phone', '0500000000');

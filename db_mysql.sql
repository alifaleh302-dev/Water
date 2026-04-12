-- ==============================================================================
-- Water Management System - MySQL Database Schema
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==============================================================================
-- 1. المستخدمين والإعدادات (Users & Settings)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `Users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'Accountant',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL UNIQUE,
    `setting_value` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 2. البيانات الأساسية (Master Data)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `Drivers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20),
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Trucks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `plate_number` VARCHAR(50) NOT NULL UNIQUE,
    `capacity_m3` DECIMAL(5,2) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Customers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20),
    `neighborhood` VARCHAR(100),
    `balance` DECIMAL(10,2) DEFAULT 0.00,
    `total_lifetime_paid` DECIMAL(15,2) DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 3. العمليات اليومية (Daily Operations)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `Trips` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `driver_id` INT,
    `truck_id` INT,
    `trip_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `commission_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(50) DEFAULT 'Open',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`driver_id`) REFERENCES `Drivers`(`id`),
    FOREIGN KEY (`truck_id`) REFERENCES `Trucks`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Invoices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `trip_id` INT,
    `customer_id` INT,
    `invoice_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `quantity_m3` DECIMAL(10,2) NOT NULL,
    `total_amount` DECIMAL(10,2) NOT NULL,
    `discount_amount` DECIMAL(10,2) DEFAULT 0.00,
    `net_amount` DECIMAL(10,2) NOT NULL,
    `paid_amount` DECIMAL(10,2) DEFAULT 0.00,
    `due_amount` DECIMAL(10,2) DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`trip_id`) REFERENCES `Trips`(`id`),
    FOREIGN KEY (`customer_id`) REFERENCES `Customers`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 4. التحصيل وتصفية السائق (Collections & Settlements)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `Driver_Settlements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `driver_id` INT,
    `settlement_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `total_amount_received` DECIMAL(10,2) NOT NULL,
    `accountant_id` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`driver_id`) REFERENCES `Drivers`(`id`),
    FOREIGN KEY (`accountant_id`) REFERENCES `Users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Settlement_Details` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `settlement_id` INT,
    `customer_id` INT,
    `amount_paid` DECIMAL(10,2) NOT NULL,
    `payment_type` VARCHAR(50) NOT NULL DEFAULT 'سداد دين سابق',
    `discount_amount` DECIMAL(10,2) DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`settlement_id`) REFERENCES `Driver_Settlements`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`customer_id`) REFERENCES `Customers`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 5. المصروفات (Expenses)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `Expense_Categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Expenses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `expense_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `category_id` INT,
    `driver_id` INT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `Expense_Categories`(`id`),
    FOREIGN KEY (`driver_id`) REFERENCES `Drivers`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 6. المخزون والأصول (Inventory & Assets)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `Items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `item_type` VARCHAR(50) NOT NULL,
    `capacity` VARCHAR(50),
    `unit` VARCHAR(50) NOT NULL,
    `min_limit` INT DEFAULT 0,
    `current_stock` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Inventory_Purchases` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `item_id` INT,
    `purchase_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `quantity` INT NOT NULL,
    `unit_price` DECIMAL(10,2) NOT NULL,
    `total_amount` DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (`item_id`) REFERENCES `Items`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Inventory_Transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `item_id` INT,
    `transaction_type` VARCHAR(50) NOT NULL,
    `quantity` INT NOT NULL,
    `transaction_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`item_id`) REFERENCES `Items`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Customer_Assets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT,
    `item_id` INT,
    `quantity` INT NOT NULL,
    `placement_date` DATE DEFAULT (CURRENT_DATE),
    `status` VARCHAR(50) DEFAULT 'Deployed',
    FOREIGN KEY (`customer_id`) REFERENCES `Customers`(`id`),
    FOREIGN KEY (`item_id`) REFERENCES `Items`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 7. الصندوق واليومية (Treasury & Cash Flow)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `Fund_Transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `transaction_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `transaction_type` VARCHAR(10) NOT NULL,
    `source_type` VARCHAR(50) NOT NULL,
    `source_id` INT,
    `amount` DECIMAL(10,2) NOT NULL,
    `current_balance` DECIMAL(15,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Cash_Closings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `closing_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `opening_balance` DECIMAL(15,2) NOT NULL,
    `expected_amount` DECIMAL(15,2) NOT NULL,
    `actual_amount` DECIMAL(15,2) NOT NULL,
    `difference` DECIMAL(15,2) DEFAULT 0.00,
    `closed_by` INT,
    FOREIGN KEY (`closed_by`) REFERENCES `Users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 8. الفترات المالية (Financial Periods)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `Financial_Periods` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `period_name` VARCHAR(100) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `is_closed` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Period_Snapshots` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `period_id` INT,
    `entity_type` VARCHAR(50),
    `entity_id` INT,
    `opening_balance` DECIMAL(15,2) DEFAULT 0.00,
    `closing_balance` DECIMAL(15,2) DEFAULT 0.00,
    `total_in` DECIMAL(15,2) DEFAULT 0.00,
    `total_out` DECIMAL(15,2) DEFAULT 0.00,
    FOREIGN KEY (`period_id`) REFERENCES `Financial_Periods`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- بيانات أولية (Seed Data)
-- ==============================================================================

-- مستخدم افتراضي (كلمة المرور: admin123)
INSERT INTO `Users` (`username`, `password`, `role`, `is_active`) VALUES
('admin', '$2y$12$LJ3m4ys3MzH9JU6xXOqfTeGrV7rQ0G9j5xzDKq8FsW8aYqzKmVGiO', 'Admin', 1);

-- إعدادات العمولات الافتراضية
INSERT INTO `Settings` (`setting_key`, `setting_value`) VALUES
('commission_6_00m3', '50'),
('commission_12_00m3', '80'),
('company_name', 'محطة المياه'),
('company_phone', '0500000000'),
('vat_rate', '0');

-- تصنيفات مصروفات افتراضية
INSERT INTO `Expense_Categories` (`category_name`) VALUES
('ديزل'),
('بنشر'),
('صيانة'),
('غسيل'),
('مصاريف إدارية'),
('رواتب'),
('متفرقات');

SET FOREIGN_KEY_CHECKS = 1;

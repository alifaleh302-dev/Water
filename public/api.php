<?php
/**
 * API Entry Point
 * Water Management System
 */

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Timezone
date_default_timezone_set('Asia/Riyadh');

// Session
session_name('water_session');
session_start();

// Autoload core files
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Model.php';
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../core/Router.php';

// Initialize Router
$router = new Router();

// ========================
// Authentication Routes
// ========================
$router->post('/api/auth/login', 'AuthController', 'login');
$router->post('/api/auth/logout', 'AuthController', 'logout');
$router->get('/api/auth/me', 'AuthController', 'me');

// ========================
// Dashboard
// ========================
$router->get('/api/dashboard', 'ReportController', 'dashboard');

// ========================
// Users (Admin only)
// ========================
$router->get('/api/users', 'UserController', 'index');
$router->get('/api/users/show', 'UserController', 'show');
$router->get('/api/users/search', 'UserController', 'search');
$router->post('/api/users', 'UserController', 'store');
$router->put('/api/users', 'UserController', 'update');
$router->delete('/api/users', 'UserController', 'destroy');

// ========================
// Settings
// ========================
$router->get('/api/settings', 'SettingsController', 'index');
$router->post('/api/settings', 'SettingsController', 'store');
$router->post('/api/settings/generate-commissions', 'SettingsController', 'generateCommissions');
$router->get('/api/settings/commission', 'SettingsController', 'getCommission');

// ========================
// Drivers
// ========================
$router->get('/api/drivers', 'DriverController', 'index');
$router->get('/api/drivers/active', 'DriverController', 'active');
$router->get('/api/drivers/show', 'DriverController', 'show');
$router->get('/api/drivers/search', 'DriverController', 'search');
$router->get('/api/drivers/daily-summary', 'DriverController', 'dailySummary');
$router->post('/api/drivers', 'DriverController', 'store');
$router->put('/api/drivers', 'DriverController', 'update');
$router->delete('/api/drivers', 'DriverController', 'destroy');

// ========================
// Trucks
// ========================
$router->get('/api/trucks', 'TruckController', 'index');
$router->get('/api/trucks/active', 'TruckController', 'active');
$router->get('/api/trucks/show', 'TruckController', 'show');
$router->get('/api/trucks/search', 'TruckController', 'search');
$router->post('/api/trucks', 'TruckController', 'store');
$router->put('/api/trucks', 'TruckController', 'update');
$router->delete('/api/trucks', 'TruckController', 'destroy');

// ========================
// Customers
// ========================
$router->get('/api/customers', 'CustomerController', 'index');
$router->get('/api/customers/show', 'CustomerController', 'show');
$router->get('/api/customers/search', 'CustomerController', 'search');
$router->get('/api/customers/debtors', 'CustomerController', 'debtors');
$router->get('/api/customers/debt-aging', 'CustomerController', 'debtAging');
$router->get('/api/customers/statement', 'CustomerController', 'statement');
$router->post('/api/customers', 'CustomerController', 'store');
$router->put('/api/customers', 'CustomerController', 'update');
$router->delete('/api/customers', 'CustomerController', 'destroy');

// ========================
// Trips
// ========================
$router->get('/api/trips', 'TripController', 'index');
$router->get('/api/trips/show', 'TripController', 'show');
$router->get('/api/trips/open', 'TripController', 'openTrips');
$router->get('/api/trips/commission', 'TripController', 'getCommission');
$router->post('/api/trips', 'TripController', 'store');
$router->put('/api/trips', 'TripController', 'update');
$router->post('/api/trips/close', 'TripController', 'close');
$router->delete('/api/trips', 'TripController', 'destroy');

// ========================
// Invoices
// ========================
$router->get('/api/invoices', 'InvoiceController', 'index');
$router->get('/api/invoices/show', 'InvoiceController', 'show');
$router->get('/api/invoices/by-trip', 'InvoiceController', 'byTrip');
$router->get('/api/invoices/driver-cash', 'InvoiceController', 'driverCashSales');
$router->get('/api/invoices/sales-summary', 'InvoiceController', 'salesSummary');
$router->get('/api/invoices/water-consumption', 'InvoiceController', 'waterConsumption');
$router->post('/api/invoices', 'InvoiceController', 'store');
$router->put('/api/invoices', 'InvoiceController', 'update');
$router->delete('/api/invoices', 'InvoiceController', 'destroy');

// ========================
// Settlements
// ========================
$router->get('/api/settlements', 'SettlementController', 'index');
$router->get('/api/settlements/show', 'SettlementController', 'show');
$router->get('/api/settlements/prepare', 'SettlementController', 'prepare');
$router->get('/api/settlements/print', 'SettlementController', 'printReceipt');
$router->post('/api/settlements', 'SettlementController', 'store');
$router->post('/api/settlements/add-detail', 'SettlementController', 'addDetail');

// ========================
// Expenses
// ========================
$router->get('/api/expenses', 'ExpenseController', 'index');
$router->get('/api/expenses/show', 'ExpenseController', 'show');
$router->get('/api/expenses/categories', 'ExpenseController', 'categories');
$router->post('/api/expenses', 'ExpenseController', 'store');
$router->put('/api/expenses', 'ExpenseController', 'update');
$router->delete('/api/expenses', 'ExpenseController', 'destroy');
$router->post('/api/expenses/categories', 'ExpenseController', 'storeCategory');
$router->put('/api/expenses/categories', 'ExpenseController', 'updateCategory');
$router->delete('/api/expenses/categories', 'ExpenseController', 'destroyCategory');

// ========================
// Fund / Treasury
// ========================
$router->get('/api/fund', 'FundController', 'index');
$router->get('/api/fund/today', 'FundController', 'today');
$router->get('/api/fund/balance', 'FundController', 'balance');
$router->get('/api/fund/closings', 'FundController', 'closings');
$router->post('/api/fund/close', 'FundController', 'close');

// ========================
// Inventory
// ========================
$router->get('/api/inventory/items', 'InventoryController', 'index');
$router->get('/api/inventory/items/show', 'InventoryController', 'show');
$router->get('/api/inventory/items/search', 'InventoryController', 'search');
$router->get('/api/inventory/items/low-stock', 'InventoryController', 'lowStock');
$router->post('/api/inventory/items', 'InventoryController', 'store');
$router->put('/api/inventory/items', 'InventoryController', 'update');
$router->delete('/api/inventory/items', 'InventoryController', 'destroy');

$router->get('/api/inventory/purchases', 'InventoryController', 'purchases');
$router->post('/api/inventory/purchases', 'InventoryController', 'storePurchase');

$router->get('/api/inventory/transactions', 'InventoryController', 'transactions');
$router->post('/api/inventory/transactions', 'InventoryController', 'storeTransaction');

$router->get('/api/inventory/assets', 'InventoryController', 'assets');
$router->post('/api/inventory/assets', 'InventoryController', 'storeAsset');
$router->put('/api/inventory/assets', 'InventoryController', 'updateAsset');

// ========================
// Reports
// ========================
$router->get('/api/reports/driver-daily', 'ReportController', 'driverDaily');
$router->get('/api/reports/customer-statement', 'ReportController', 'customerStatement');
$router->get('/api/reports/sales-summary', 'ReportController', 'salesSummary');
$router->get('/api/reports/water-consumption', 'ReportController', 'waterConsumption');

// ========================
// Financial Periods
// ========================
$router->get('/api/periods', 'ReportController', 'periods');
$router->post('/api/periods', 'ReportController', 'storePeriod');
$router->post('/api/periods/close', 'ReportController', 'closePeriod');
$router->get('/api/periods/snapshots', 'ReportController', 'periodSnapshots');

// Dispatch the request
$router->dispatch();

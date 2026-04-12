<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/DriverModel.php';
require_once __DIR__ . '/../models/CustomerModel.php';
require_once __DIR__ . '/../models/InvoiceModel.php';
require_once __DIR__ . '/../models/FinancialPeriodModel.php';

class ReportController extends Controller {
    private DriverModel $driverModel;
    private CustomerModel $customerModel;
    private InvoiceModel $invoiceModel;
    private FinancialPeriodModel $periodModel;

    public function __construct() {
        $this->driverModel = new DriverModel();
        $this->customerModel = new CustomerModel();
        $this->invoiceModel = new InvoiceModel();
        $this->periodModel = new FinancialPeriodModel();
    }

    /**
     * Driver daily report
     */
    public function driverDaily(): void {
        $this->requireAuth();
        $driverId = (int)$this->getParam('driver_id');
        $date = $this->getParam('date', date('Y-m-d'));
        
        $summary = $this->driverModel->getDailySummary($driverId, $date);
        $driver = $this->driverModel->find($driverId);
        
        $this->success([
            'driver' => $driver,
            'date' => $date,
            'report' => $summary
        ]);
    }

    /**
     * Customer statement
     */
    public function customerStatement(): void {
        $this->requireAuth();
        $customerId = (int)$this->getParam('customer_id');
        $fromDate = $this->getParam('from_date');
        $toDate = $this->getParam('to_date');
        
        $customer = $this->customerModel->find($customerId);
        if (!$customer) {
            $this->error('الزبون غير موجود', 404);
        }

        $transactions = $this->customerModel->getStatement($customerId, $fromDate, $toDate);
        
        $runningBalance = 0;
        foreach ($transactions as &$tx) {
            $runningBalance += (float)$tx['debit'] - (float)$tx['credit'];
            $tx['running_balance'] = $runningBalance;
        }

        $this->success([
            'customer' => $customer,
            'transactions' => $transactions,
            'final_balance' => $runningBalance
        ]);
    }

    /**
     * Total sales report
     */
    public function salesSummary(): void {
        $this->requireAuth();
        $groupBy = $this->getParam('group_by', 'day');
        $fromDate = $this->getParam('from_date');
        $toDate = $this->getParam('to_date');
        
        $data = $this->invoiceModel->getSalesSummary($groupBy, $fromDate, $toDate);
        $this->success($data);
    }

    /**
     * Water consumption report
     */
    public function waterConsumption(): void {
        $this->requireAuth();
        $fromDate = $this->getParam('from_date');
        $toDate = $this->getParam('to_date');
        
        $data = $this->invoiceModel->getWaterConsumption($fromDate, $toDate);
        $this->success($data);
    }

    // ---- Financial Periods ----
    public function periods(): void {
        $this->requireAuth();
        $data = $this->periodModel->getAll();
        $this->success($data);
    }

    public function storePeriod(): void {
        $this->requireAdmin();
        $input = $this->getInput();
        $this->validateRequired($input, ['period_name', 'start_date', 'end_date']);
        $input['is_closed'] = 0;
        $result = $this->periodModel->create($input);
        $this->json($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function closePeriod(): void {
        $this->requireAdmin();
        $id = (int)$this->getParam('id');
        $result = $this->periodModel->closePeriod($id);
        $this->json($result);
    }

    public function periodSnapshots(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $data = $this->periodModel->getSnapshots($id);
        $this->success($data);
    }

    /**
     * Dashboard summary
     */
    public function dashboard(): void {
        $this->requireAuth();
        $db = Database::getInstance();
        
        $today = date('Y-m-d');
        
        // Today's sales
        $todaySales = $db->fetch(
            "SELECT COALESCE(SUM(net_amount), 0) as total, COALESCE(SUM(paid_amount), 0) as cash, COALESCE(SUM(due_amount), 0) as credit, COUNT(*) as count FROM Invoices WHERE DATE(invoice_date) = ?",
            [$today]
        );
        
        // Today's trips
        $todayTrips = $db->fetch(
            "SELECT COUNT(*) as count FROM Trips WHERE DATE(trip_date) = ?",
            [$today]
        );
        
        // Total customer debt
        $totalDebt = $db->fetch(
            "SELECT COALESCE(SUM(balance), 0) as total FROM Customers WHERE balance > 0"
        );
        
        // Fund balance
        $fundBalance = $db->fetch(
            "SELECT current_balance FROM Fund_Transactions ORDER BY id DESC LIMIT 1"
        );
        
        // Today's expenses
        $todayExpenses = $db->fetch(
            "SELECT COALESCE(SUM(amount), 0) as total FROM Expenses WHERE DATE(expense_date) = ?",
            [$today]
        );
        
        // Low stock alerts
        $lowStockCount = $db->fetch(
            "SELECT COUNT(*) as count FROM Items WHERE current_stock <= min_limit AND min_limit > 0"
        );
        
        // Overdue customers (>15 days)
        $overdueCount = $db->fetch(
            "SELECT COUNT(DISTINCT customer_id) as count FROM Invoices WHERE due_amount > 0 AND DATEDIFF(NOW(), invoice_date) > 15"
        );

        $this->success([
            'today_sales' => $todaySales,
            'today_trips' => (int)$todayTrips['count'],
            'total_customer_debt' => (float)$totalDebt['total'],
            'fund_balance' => $fundBalance ? (float)$fundBalance['current_balance'] : 0,
            'today_expenses' => (float)$todayExpenses['total'],
            'low_stock_count' => (int)$lowStockCount['count'],
            'overdue_customer_count' => (int)$overdueCount['count']
        ]);
    }
}

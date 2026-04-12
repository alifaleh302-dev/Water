<?php
require_once __DIR__ . '/../core/Model.php';

class DriverModel extends Model {
    protected string $table = 'Drivers';
    protected array $fillable = ['name', 'phone', 'is_active'];
    protected array $searchable = ['name', 'phone'];

    /**
     * Get active drivers only (PostgreSQL boolean)
     */
    public function getActive(): array {
        return $this->db->fetchAll(
            "SELECT * FROM {$this->table} WHERE is_active = true ORDER BY name ASC"
        );
    }

    /**
     * Get driver daily summary (PostgreSQL DATE cast)
     */
    public function getDailySummary(int $driverId, string $date): array {
        // Total trips and sales
        $tripSummary = $this->db->fetch(
            "SELECT 
                COUNT(t.id) as trip_count,
                COALESCE(SUM(t.commission_amount), 0) as total_commission
             FROM Trips t 
             WHERE t.driver_id = ? AND t.trip_date::date = ?::date",
            [$driverId, $date]
        );

        // Invoice totals
        $invoiceSummary = $this->db->fetch(
            "SELECT 
                COALESCE(SUM(i.total_amount), 0) as total_sales,
                COALESCE(SUM(i.paid_amount), 0) as total_cash,
                COALESCE(SUM(i.due_amount), 0) as total_due,
                COALESCE(SUM(i.net_amount), 0) as total_net
             FROM Invoices i
             JOIN Trips t ON i.trip_id = t.id
             WHERE t.driver_id = ? AND i.invoice_date::date = ?::date",
            [$driverId, $date]
        );

        // Expenses paid from driver
        $expenses = $this->db->fetch(
            "SELECT COALESCE(SUM(amount), 0) as total_expenses
             FROM Expenses 
             WHERE driver_id = ? AND expense_date::date = ?::date",
            [$driverId, $date]
        );

        return [
            'trip_count' => (int)($tripSummary['trip_count'] ?? 0),
            'total_commission' => (float)($tripSummary['total_commission'] ?? 0),
            'total_sales' => (float)($invoiceSummary['total_sales'] ?? 0),
            'total_cash' => (float)($invoiceSummary['total_cash'] ?? 0),
            'total_due' => (float)($invoiceSummary['total_due'] ?? 0),
            'total_net' => (float)($invoiceSummary['total_net'] ?? 0),
            'total_expenses' => (float)($expenses['total_expenses'] ?? 0),
        ];
    }
}

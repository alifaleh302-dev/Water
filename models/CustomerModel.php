<?php
require_once __DIR__ . '/../core/Model.php';

class CustomerModel extends Model {
    protected string $table = 'Customers';
    protected array $fillable = ['name', 'phone', 'neighborhood'];
    protected array $searchable = ['name', 'phone', 'neighborhood'];

    /**
     * Get customers with debt (balance > 0)
     */
    public function getDebtors(): array {
        return $this->db->fetchAll(
            "SELECT * FROM {$this->table} WHERE balance > 0 ORDER BY balance DESC"
        );
    }

    /**
     * Get debt aging - customers with invoices overdue > N days (PostgreSQL)
     */
    public function getDebtAging(int $days = 15): array {
        return $this->db->fetchAll(
            "SELECT c.*, 
                    MIN(i.invoice_date) as oldest_unpaid_date,
                    (CURRENT_DATE - MIN(i.invoice_date)::date) as days_overdue,
                    COUNT(i.id) as unpaid_invoice_count,
                    SUM(i.due_amount) as total_overdue_amount
             FROM Customers c
             JOIN Invoices i ON c.id = i.customer_id
             WHERE i.due_amount > 0 
               AND (CURRENT_DATE - i.invoice_date::date) > ?
             GROUP BY c.id
             ORDER BY days_overdue DESC",
            [$days]
        );
    }

    /**
     * Update customer balance (add to balance)
     */
    public function addToBalance(int $customerId, float $amount): void {
        $this->db->query(
            "UPDATE {$this->table} SET balance = balance + ? WHERE id = ?",
            [$amount, $customerId]
        );
    }

    /**
     * Deduct from customer balance
     */
    public function deductFromBalance(int $customerId, float $amount): void {
        $this->db->query(
            "UPDATE {$this->table} SET balance = balance - ? WHERE id = ?",
            [$amount, $customerId]
        );
    }

    /**
     * Add to total_lifetime_paid
     */
    public function addToLifetimePaid(int $customerId, float $amount): void {
        $this->db->query(
            "UPDATE {$this->table} SET total_lifetime_paid = total_lifetime_paid + ? WHERE id = ?",
            [$amount, $customerId]
        );
    }

    /**
     * Get customer statement (account ledger) - PostgreSQL compatible
     */
    public function getStatement(int $customerId, ?string $fromDate = null, ?string $toDate = null): array {
        $params = [$customerId, $customerId];
        $dateFilter1 = '';
        $dateFilter2 = '';
        
        if ($fromDate) {
            $dateFilter1 .= " AND i.invoice_date >= ?";
            $params[] = $fromDate;
        }
        if ($toDate) {
            $dateFilter1 .= " AND i.invoice_date <= (? || ' 23:59:59')::timestamp";
            $params[] = $toDate;
        }
        if ($fromDate) {
            $dateFilter2 .= " AND ds.settlement_date >= ?";
            $params[] = $fromDate;
        }
        if ($toDate) {
            $dateFilter2 .= " AND ds.settlement_date <= (? || ' 23:59:59')::timestamp";
            $params[] = $toDate;
        }

        // Combine invoices (debit) and payments (credit)
        $sql = "
            SELECT * FROM (
                SELECT 
                    i.invoice_date as transaction_date,
                    'فاتورة #' || i.id as description,
                    'debit' as type,
                    i.due_amount as debit,
                    0 as credit
                FROM Invoices i
                WHERE i.customer_id = ? AND i.due_amount > 0 {$dateFilter1}
                
                UNION ALL
                
                SELECT 
                    ds.settlement_date as transaction_date,
                    'سداد - سند #' || sd.settlement_id as description,
                    'credit' as type,
                    0 as debit,
                    sd.amount_paid as credit
                FROM Settlement_Details sd
                JOIN Driver_Settlements ds ON sd.settlement_id = ds.id
                WHERE sd.customer_id = ? {$dateFilter2}
            ) combined
            ORDER BY transaction_date ASC
        ";

        return $this->db->fetchAll($sql, $params);
    }
}

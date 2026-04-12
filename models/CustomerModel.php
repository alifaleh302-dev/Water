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
     * Get debt aging - customers with invoices overdue > 15 days
     */
    public function getDebtAging(int $days = 15): array {
        return $this->db->fetchAll(
            "SELECT c.*, 
                    MIN(i.invoice_date) as oldest_unpaid_date,
                    DATEDIFF(NOW(), MIN(i.invoice_date)) as days_overdue,
                    COUNT(i.id) as unpaid_invoice_count,
                    SUM(i.due_amount) as total_overdue_amount
             FROM Customers c
             JOIN Invoices i ON c.id = i.customer_id
             WHERE i.due_amount > 0 
               AND DATEDIFF(NOW(), i.invoice_date) > ?
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
     * Get customer statement (account ledger)
     */
    public function getStatement(int $customerId, ?string $fromDate = null, ?string $toDate = null): array {
        $params = [$customerId, $customerId];
        $dateFilter = '';
        
        if ($fromDate) {
            $dateFilter .= " AND transaction_date >= ?";
            $params[] = $fromDate;
            $params[] = $fromDate;
        }
        if ($toDate) {
            $dateFilter .= " AND transaction_date <= ?";
            $params[] = $toDate . ' 23:59:59';
            $params[] = $toDate . ' 23:59:59';
        }

        // Combine invoices (debit) and payments (credit)
        $sql = "
            SELECT * FROM (
                SELECT 
                    i.invoice_date as transaction_date,
                    CONCAT('فاتورة #', i.id) as description,
                    'debit' as type,
                    i.due_amount as debit,
                    0 as credit
                FROM Invoices i
                WHERE i.customer_id = ? AND i.due_amount > 0 {$dateFilter}
                
                UNION ALL
                
                SELECT 
                    ds.settlement_date as transaction_date,
                    CONCAT('سداد - سند #', sd.settlement_id) as description,
                    'credit' as type,
                    0 as debit,
                    sd.amount_paid as credit
                FROM Settlement_Details sd
                JOIN Driver_Settlements ds ON sd.settlement_id = ds.id
                WHERE sd.customer_id = ? {$dateFilter}
            ) combined
            ORDER BY transaction_date ASC
        ";

        return $this->db->fetchAll($sql, $params);
    }
}

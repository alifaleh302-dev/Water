<?php
require_once __DIR__ . '/../core/Model.php';

class SettlementModel extends Model {
    protected string $table = 'Driver_Settlements';
    protected array $fillable = ['driver_id', 'settlement_date', 'total_amount_received', 'accountant_id'];

    /**
     * Get settlements with driver info
     */
    public function getAllWithDetails(array $filters = []): array {
        $sql = "SELECT ds.*, d.name as driver_name, u.username as accountant_name
                FROM {$this->table} ds
                LEFT JOIN Drivers d ON ds.driver_id = d.id
                LEFT JOIN Users u ON ds.accountant_id = u.id";
        
        $params = [];
        $conditions = [];
        
        if (isset($filters['driver_id'])) {
            $conditions[] = "ds.driver_id = ?";
            $params[] = $filters['driver_id'];
        }
        if (isset($filters['date'])) {
            $conditions[] = "DATE(ds.settlement_date) = ?";
            $params[] = $filters['date'];
        }
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $sql .= " ORDER BY ds.id DESC";
        
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Get settlement details
     */
    public function getDetails(int $settlementId): array {
        return $this->db->fetchAll(
            "SELECT sd.*, c.name as customer_name, c.balance as customer_balance
             FROM Settlement_Details sd
             LEFT JOIN Customers c ON sd.customer_id = c.id
             WHERE sd.settlement_id = ?
             ORDER BY sd.id ASC",
            [$settlementId]
        );
    }

    /**
     * Add settlement detail
     */
    public function addDetail(array $data): int {
        $this->db->query(
            "INSERT INTO Settlement_Details (settlement_id, customer_id, amount_paid, payment_type, discount_amount) 
             VALUES (?, ?, ?, ?, ?)",
            [
                $data['settlement_id'],
                $data['customer_id'],
                $data['amount_paid'],
                $data['payment_type'],
                $data['discount_amount'] ?? 0
            ]
        );
        return (int)$this->db->lastInsertId();
    }
}

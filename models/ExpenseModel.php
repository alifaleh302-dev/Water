<?php
require_once __DIR__ . '/../core/Model.php';

class ExpenseModel extends Model {
    protected string $table = 'Expenses';
    protected array $fillable = ['expense_date', 'category_id', 'driver_id', 'amount', 'notes'];

    /**
     * Get expenses with details (PostgreSQL)
     */
    public function getAllWithDetails(array $filters = []): array {
        $sql = "SELECT e.*, ec.category_name, d.name as driver_name
                FROM {$this->table} e
                LEFT JOIN Expense_Categories ec ON e.category_id = ec.id
                LEFT JOIN Drivers d ON e.driver_id = d.id";
        
        $params = [];
        $conditions = [];
        
        if (isset($filters['date'])) {
            $conditions[] = "e.expense_date::date = ?::date";
            $params[] = $filters['date'];
        }
        if (isset($filters['driver_id'])) {
            $conditions[] = "e.driver_id = ?";
            $params[] = $filters['driver_id'];
        }
        if (isset($filters['category_id'])) {
            $conditions[] = "e.category_id = ?";
            $params[] = $filters['category_id'];
        }
        if (isset($filters['from_date'])) {
            $conditions[] = "e.expense_date::date >= ?::date";
            $params[] = $filters['from_date'];
        }
        if (isset($filters['to_date'])) {
            $conditions[] = "e.expense_date::date <= ?::date";
            $params[] = $filters['to_date'];
        }
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $sql .= " ORDER BY e.id DESC";
        
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Get driver expenses for a specific date (PostgreSQL)
     */
    public function getDriverExpenses(int $driverId, string $date): array {
        return $this->db->fetchAll(
            "SELECT e.*, ec.category_name
             FROM {$this->table} e
             LEFT JOIN Expense_Categories ec ON e.category_id = ec.id
             WHERE e.driver_id = ? AND e.expense_date::date = ?::date
             ORDER BY e.id ASC",
            [$driverId, $date]
        );
    }
}

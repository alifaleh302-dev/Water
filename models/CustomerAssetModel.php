<?php
require_once __DIR__ . '/../core/Model.php';

class CustomerAssetModel extends Model {
    protected string $table = 'Customer_Assets';
    protected array $fillable = ['customer_id', 'item_id', 'quantity', 'placement_date', 'status'];

    /**
     * Get assets with details
     */
    public function getAllWithDetails(array $filters = []): array {
        $sql = "SELECT ca.*, c.name as customer_name, i.name as item_name, i.capacity as item_capacity
                FROM {$this->table} ca
                LEFT JOIN Customers c ON ca.customer_id = c.id
                LEFT JOIN Items i ON ca.item_id = i.id";
        
        $params = [];
        $conditions = [];
        
        if (isset($filters['customer_id'])) {
            $conditions[] = "ca.customer_id = ?";
            $params[] = $filters['customer_id'];
        }
        if (isset($filters['status'])) {
            $conditions[] = "ca.status = ?";
            $params[] = $filters['status'];
        }
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $sql .= " ORDER BY ca.id DESC";
        
        return $this->db->fetchAll($sql, $params);
    }
}

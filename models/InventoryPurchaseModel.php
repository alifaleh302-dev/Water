<?php
require_once __DIR__ . '/../core/Model.php';

class InventoryPurchaseModel extends Model {
    protected string $table = 'Inventory_Purchases';
    protected array $fillable = ['item_id', 'purchase_date', 'quantity', 'unit_price', 'total_amount'];

    /**
     * Get purchases with item details
     */
    public function getAllWithDetails(array $filters = []): array {
        $sql = "SELECT ip.*, i.name as item_name, i.unit
                FROM {$this->table} ip
                LEFT JOIN Items i ON ip.item_id = i.id";
        
        $params = [];
        $conditions = [];
        
        if (isset($filters['item_id'])) {
            $conditions[] = "ip.item_id = ?";
            $params[] = $filters['item_id'];
        }
        if (isset($filters['from_date'])) {
            $conditions[] = "DATE(ip.purchase_date) >= ?";
            $params[] = $filters['from_date'];
        }
        if (isset($filters['to_date'])) {
            $conditions[] = "DATE(ip.purchase_date) <= ?";
            $params[] = $filters['to_date'];
        }
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $sql .= " ORDER BY ip.id DESC";
        
        return $this->db->fetchAll($sql, $params);
    }
}

<?php
require_once __DIR__ . '/../core/Model.php';

class InventoryTransactionModel extends Model {
    protected string $table = 'Inventory_Transactions';
    protected array $fillable = ['item_id', 'transaction_type', 'quantity', 'transaction_date'];

    /**
     * Get transactions with item details
     */
    public function getAllWithDetails(array $filters = []): array {
        $sql = "SELECT it.*, i.name as item_name, i.unit, i.current_stock
                FROM {$this->table} it
                LEFT JOIN Items i ON it.item_id = i.id";
        
        $params = [];
        $conditions = [];
        
        if (isset($filters['item_id'])) {
            $conditions[] = "it.item_id = ?";
            $params[] = $filters['item_id'];
        }
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $sql .= " ORDER BY it.id DESC";
        
        return $this->db->fetchAll($sql, $params);
    }
}

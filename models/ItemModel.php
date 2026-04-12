<?php
require_once __DIR__ . '/../core/Model.php';

class ItemModel extends Model {
    protected string $table = 'Items';
    protected array $fillable = ['name', 'item_type', 'capacity', 'unit', 'min_limit', 'current_stock'];
    protected array $searchable = ['name'];

    /**
     * Get items below minimum limit
     */
    public function getLowStock(): array {
        return $this->db->fetchAll(
            "SELECT * FROM {$this->table} WHERE current_stock <= min_limit AND min_limit > 0 ORDER BY current_stock ASC"
        );
    }

    /**
     * Increase stock
     */
    public function increaseStock(int $itemId, int $quantity): void {
        $this->db->query(
            "UPDATE {$this->table} SET current_stock = current_stock + ? WHERE id = ?",
            [$quantity, $itemId]
        );
    }

    /**
     * Decrease stock
     */
    public function decreaseStock(int $itemId, int $quantity): void {
        $this->db->query(
            "UPDATE {$this->table} SET current_stock = current_stock - ? WHERE id = ?",
            [$quantity, $itemId]
        );
    }
}

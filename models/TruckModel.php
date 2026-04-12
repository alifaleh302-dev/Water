<?php
require_once __DIR__ . '/../core/Model.php';

class TruckModel extends Model {
    protected string $table = 'Trucks';
    protected array $fillable = ['plate_number', 'capacity_m3', 'is_active'];
    protected array $searchable = ['plate_number'];

    /**
     * Get active trucks (PostgreSQL boolean)
     */
    public function getActive(): array {
        return $this->db->fetchAll(
            "SELECT * FROM {$this->table} WHERE is_active = true ORDER BY plate_number ASC"
        );
    }
}

<?php
require_once __DIR__ . '/../core/Model.php';

class TripModel extends Model {
    protected string $table = 'Trips';
    protected array $fillable = ['driver_id', 'truck_id', 'trip_date', 'commission_amount', 'status'];

    /**
     * Get trips with driver and truck info
     */
    public function getAllWithDetails(array $filters = [], string $date = ''): array {
        $sql = "SELECT t.*, d.name as driver_name, tr.plate_number, tr.capacity_m3
                FROM {$this->table} t
                LEFT JOIN Drivers d ON t.driver_id = d.id
                LEFT JOIN Trucks tr ON t.truck_id = tr.id";
        
        $params = [];
        $conditions = [];

        if (!empty($date)) {
            $conditions[] = "DATE(t.trip_date) = ?";
            $params[] = $date;
        }
        if (isset($filters['driver_id'])) {
            $conditions[] = "t.driver_id = ?";
            $params[] = $filters['driver_id'];
        }
        if (isset($filters['status'])) {
            $conditions[] = "t.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $sql .= " ORDER BY t.id DESC";
        
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Get open trips for a driver
     */
    public function getOpenTrips(int $driverId = 0): array {
        $sql = "SELECT t.*, d.name as driver_name, tr.plate_number, tr.capacity_m3
                FROM {$this->table} t
                LEFT JOIN Drivers d ON t.driver_id = d.id
                LEFT JOIN Trucks tr ON t.truck_id = tr.id
                WHERE t.status = 'Open'";
        $params = [];
        
        if ($driverId > 0) {
            $sql .= " AND t.driver_id = ?";
            $params[] = $driverId;
        }
        
        $sql .= " ORDER BY t.id DESC";
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Close a trip
     */
    public function closeTrip(int $tripId): array {
        return $this->update($tripId, ['status' => 'Closed']);
    }
}

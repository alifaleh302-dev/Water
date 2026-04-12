<?php
require_once __DIR__ . '/../core/Model.php';

class InvoiceModel extends Model {
    protected string $table = 'Invoices';
    protected array $fillable = ['trip_id', 'customer_id', 'invoice_date', 'quantity_m3', 'total_amount', 'discount_amount', 'net_amount', 'paid_amount', 'due_amount'];

    /**
     * Get invoices with full details
     */
    public function getAllWithDetails(array $filters = []): array {
        $sql = "SELECT i.*, c.name as customer_name, c.phone as customer_phone,
                       t.driver_id, d.name as driver_name, tr.plate_number
                FROM {$this->table} i
                LEFT JOIN Customers c ON i.customer_id = c.id
                LEFT JOIN Trips t ON i.trip_id = t.id
                LEFT JOIN Drivers d ON t.driver_id = d.id
                LEFT JOIN Trucks tr ON t.truck_id = tr.id";
        
        $params = [];
        $conditions = [];
        
        if (isset($filters['trip_id'])) {
            $conditions[] = "i.trip_id = ?";
            $params[] = $filters['trip_id'];
        }
        if (isset($filters['customer_id'])) {
            $conditions[] = "i.customer_id = ?";
            $params[] = $filters['customer_id'];
        }
        if (isset($filters['date'])) {
            $conditions[] = "DATE(i.invoice_date) = ?";
            $params[] = $filters['date'];
        }
        if (isset($filters['from_date'])) {
            $conditions[] = "DATE(i.invoice_date) >= ?";
            $params[] = $filters['from_date'];
        }
        if (isset($filters['to_date'])) {
            $conditions[] = "DATE(i.invoice_date) <= ?";
            $params[] = $filters['to_date'];
        }

        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $sql .= " ORDER BY i.id DESC";
        
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Get invoices for a specific trip
     */
    public function getByTrip(int $tripId): array {
        return $this->getAllWithDetails(['trip_id' => $tripId]);
    }

    /**
     * Get cash sales for driver on a date
     */
    public function getDriverCashSales(int $driverId, string $date): array {
        return $this->db->fetchAll(
            "SELECT i.*, c.name as customer_name
             FROM {$this->table} i
             JOIN Trips t ON i.trip_id = t.id
             LEFT JOIN Customers c ON i.customer_id = c.id
             WHERE t.driver_id = ? AND DATE(i.invoice_date) = ?
             ORDER BY i.id ASC",
            [$driverId, $date]
        );
    }

    /**
     * Get sales summary grouped by day or month
     */
    public function getSalesSummary(string $groupBy = 'day', ?string $fromDate = null, ?string $toDate = null): array {
        $dateFormat = $groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
        
        $sql = "SELECT 
                    DATE_FORMAT(invoice_date, '{$dateFormat}') as period,
                    COUNT(*) as invoice_count,
                    SUM(total_amount) as total,
                    SUM(discount_amount) as discount,
                    SUM(net_amount) as net,
                    SUM(paid_amount) as paid,
                    SUM(due_amount) as due,
                    SUM(quantity_m3) as total_quantity_m3
                FROM {$this->table}";
        
        $params = [];
        $conditions = [];
        
        if ($fromDate) {
            $conditions[] = "DATE(invoice_date) >= ?";
            $params[] = $fromDate;
        }
        if ($toDate) {
            $conditions[] = "DATE(invoice_date) <= ?";
            $params[] = $toDate;
        }
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $sql .= " GROUP BY period ORDER BY period DESC";
        
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Get water consumption report
     */
    public function getWaterConsumption(?string $fromDate = null, ?string $toDate = null): array {
        $sql = "SELECT 
                    DATE_FORMAT(invoice_date, '%Y-%m-%d') as date,
                    SUM(quantity_m3) as total_m3,
                    COUNT(*) as invoice_count
                FROM {$this->table}";
        
        $params = [];
        $conditions = [];
        
        if ($fromDate) {
            $conditions[] = "DATE(invoice_date) >= ?";
            $params[] = $fromDate;
        }
        if ($toDate) {
            $conditions[] = "DATE(invoice_date) <= ?";
            $params[] = $toDate;
        }
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $sql .= " GROUP BY date ORDER BY date DESC";
        
        return $this->db->fetchAll($sql, $params);
    }
}

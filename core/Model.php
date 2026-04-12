<?php
/**
 * Base Model Class
 * Provides common CRUD operations for all models (PostgreSQL compatible)
 */
class Model {
    protected Database $db;
    protected string $table;
    protected string $primaryKey = 'id';
    protected array $fillable = [];
    protected array $searchable = [];

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get all records with optional filtering
     */
    public function getAll(array $filters = [], string $orderBy = 'id DESC', int $limit = 0, int $offset = 0): array {
        $sql = "SELECT * FROM {$this->table}";
        $params = [];
        
        if (!empty($filters)) {
            $conditions = [];
            foreach ($filters as $key => $value) {
                if ($value === null) {
                    $conditions[] = "{$key} IS NULL";
                } else {
                    $conditions[] = "{$key} = ?";
                    $params[] = $value;
                }
            }
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $sql .= " ORDER BY {$orderBy}";
        
        if ($limit > 0) {
            $sql .= " LIMIT {$limit}";
            if ($offset > 0) {
                $sql .= " OFFSET {$offset}";
            }
        }
        
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Find a record by ID
     */
    public function find(int $id): ?array {
        return $this->db->fetch(
            "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ?",
            [$id]
        );
    }

    /**
     * Create a new record (PostgreSQL - uses RETURNING id)
     */
    public function create(array $data): array {
        $filtered = $this->filterFillable($data);
        
        if (empty($filtered)) {
            return ['status' => 'error', 'message' => 'لا توجد بيانات صالحة للإدخال'];
        }

        $columns = implode(', ', array_keys($filtered));
        $placeholders = implode(', ', array_fill(0, count($filtered), '?'));
        
        $sql = "INSERT INTO {$this->table} ({$columns}) VALUES ({$placeholders}) RETURNING {$this->primaryKey}";
        
        try {
            $stmt = $this->db->query($sql, array_values($filtered));
            $row = $stmt->fetch();
            $id = $row[$this->primaryKey] ?? 0;
            $record = $this->find((int)$id);
            return ['status' => 'success', 'data' => $record, 'message' => 'تم الإضافة بنجاح'];
        } catch (\PDOException $e) {
            return ['status' => 'error', 'message' => 'خطأ في الإضافة: ' . $this->parseError($e)];
        }
    }

    /**
     * Update a record
     */
    public function update(int $id, array $data): array {
        $filtered = $this->filterFillable($data);
        
        if (empty($filtered)) {
            return ['status' => 'error', 'message' => 'لا توجد بيانات صالحة للتحديث'];
        }

        $sets = [];
        foreach (array_keys($filtered) as $col) {
            $sets[] = "{$col} = ?";
        }
        $setStr = implode(', ', $sets);
        
        $sql = "UPDATE {$this->table} SET {$setStr} WHERE {$this->primaryKey} = ?";
        $params = array_values($filtered);
        $params[] = $id;
        
        try {
            $this->db->query($sql, $params);
            $record = $this->find($id);
            return ['status' => 'success', 'data' => $record, 'message' => 'تم التحديث بنجاح'];
        } catch (\PDOException $e) {
            return ['status' => 'error', 'message' => 'خطأ في التحديث: ' . $this->parseError($e)];
        }
    }

    /**
     * Delete a record
     */
    public function delete(int $id): array {
        try {
            $this->db->query(
                "DELETE FROM {$this->table} WHERE {$this->primaryKey} = ?",
                [$id]
            );
            return ['status' => 'success', 'message' => 'تم الحذف بنجاح'];
        } catch (\PDOException $e) {
            return ['status' => 'error', 'message' => 'خطأ في الحذف: ' . $this->parseError($e)];
        }
    }

    /**
     * Search records (PostgreSQL ILIKE for case-insensitive search)
     */
    public function search(string $query, array $additionalFilters = []): array {
        if (empty($this->searchable)) {
            return [];
        }

        $conditions = [];
        $params = [];
        
        foreach ($this->searchable as $col) {
            $conditions[] = "{$col} ILIKE ?";
            $params[] = "%{$query}%";
        }
        
        $sql = "SELECT * FROM {$this->table} WHERE (" . implode(' OR ', $conditions) . ")";
        
        if (!empty($additionalFilters)) {
            foreach ($additionalFilters as $key => $value) {
                $sql .= " AND {$key} = ?";
                $params[] = $value;
            }
        }
        
        $sql .= " ORDER BY {$this->primaryKey} DESC";
        
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Count records
     */
    public function count(array $filters = []): int {
        $sql = "SELECT COUNT(*) as total FROM {$this->table}";
        $params = [];
        
        if (!empty($filters)) {
            $conditions = [];
            foreach ($filters as $key => $value) {
                $conditions[] = "{$key} = ?";
                $params[] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $result = $this->db->fetch($sql, $params);
        return (int)($result['total'] ?? 0);
    }

    /**
     * Filter data to only include fillable fields
     */
    protected function filterFillable(array $data): array {
        if (empty($this->fillable)) {
            return $data;
        }
        return array_intersect_key($data, array_flip($this->fillable));
    }

    /**
     * Parse PDO error into user-friendly message (PostgreSQL compatible)
     */
    protected function parseError(\PDOException $e): string {
        $code = $e->getCode();
        $message = $e->getMessage();
        // PostgreSQL unique violation
        if ($code == 23505 || strpos($message, 'unique constraint') !== false || strpos($message, 'duplicate key') !== false) {
            return 'القيمة موجودة مسبقاً (تكرار)';
        }
        // PostgreSQL foreign key violation
        if ($code == 23503 || strpos($message, 'foreign key constraint') !== false) {
            return 'لا يمكن الحذف لارتباط البيانات بسجلات أخرى';
        }
        // PostgreSQL not null violation
        if ($code == 23502) {
            return 'حقل مطلوب فارغ';
        }
        return 'خطأ في قاعدة البيانات';
    }
}

<?php
/**
 * Base Model Class
 * Provides common CRUD operations for all models
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
     * Create a new record
     */
    public function create(array $data): array {
        $filtered = $this->filterFillable($data);
        
        if (empty($filtered)) {
            return ['status' => 'error', 'message' => 'لا توجد بيانات صالحة للإدخال'];
        }

        $columns = implode(', ', array_keys($filtered));
        $placeholders = implode(', ', array_fill(0, count($filtered), '?'));
        
        $sql = "INSERT INTO {$this->table} ({$columns}) VALUES ({$placeholders})";
        
        try {
            $this->db->query($sql, array_values($filtered));
            $id = $this->db->lastInsertId();
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
     * Search records
     */
    public function search(string $query, array $additionalFilters = []): array {
        if (empty($this->searchable)) {
            return [];
        }

        $conditions = [];
        $params = [];
        
        foreach ($this->searchable as $col) {
            $conditions[] = "{$col} LIKE ?";
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
     * Parse PDO error into user-friendly message
     */
    protected function parseError(\PDOException $e): string {
        $code = $e->getCode();
        if ($code == 23000) {
            if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
                return 'القيمة موجودة مسبقاً (تكرار)';
            }
            if (strpos($e->getMessage(), 'foreign key') !== false) {
                return 'لا يمكن الحذف لارتباط البيانات بسجلات أخرى';
            }
        }
        return 'خطأ في قاعدة البيانات';
    }
}

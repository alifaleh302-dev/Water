<?php
require_once __DIR__ . '/../core/Model.php';

class SettingModel extends Model {
    protected string $table = 'Settings';
    protected array $fillable = ['setting_key', 'setting_value'];

    /**
     * Get setting by key
     */
    public function getByKey(string $key): ?string {
        $result = $this->db->fetch(
            "SELECT setting_value FROM {$this->table} WHERE setting_key = ?",
            [$key]
        );
        return $result ? $result['setting_value'] : null;
    }

    /**
     * Set a setting (upsert)
     */
    public function set(string $key, string $value): array {
        $existing = $this->db->fetch(
            "SELECT id FROM {$this->table} WHERE setting_key = ?",
            [$key]
        );

        try {
            if ($existing) {
                $this->db->query(
                    "UPDATE {$this->table} SET setting_value = ? WHERE setting_key = ?",
                    [$value, $key]
                );
            } else {
                $this->db->query(
                    "INSERT INTO {$this->table} (setting_key, setting_value) VALUES (?, ?)",
                    [$key, $value]
                );
            }
            return ['status' => 'success', 'message' => 'تم حفظ الإعداد بنجاح'];
        } catch (\PDOException $e) {
            return ['status' => 'error', 'message' => 'خطأ في حفظ الإعداد'];
        }
    }

    /**
     * Get all settings as key-value pairs
     */
    public function getAllAsMap(): array {
        $rows = $this->db->fetchAll("SELECT setting_key, setting_value FROM {$this->table}");
        $map = [];
        foreach ($rows as $row) {
            $map[$row['setting_key']] = $row['setting_value'];
        }
        return $map;
    }

    /**
     * Bulk save settings
     */
    public function bulkSave(array $settings): array {
        try {
            $this->db->beginTransaction();
            foreach ($settings as $key => $value) {
                $this->set($key, $value);
            }
            $this->db->commit();
            return ['status' => 'success', 'message' => 'تم حفظ جميع الإعدادات بنجاح'];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return ['status' => 'error', 'message' => 'خطأ في حفظ الإعدادات'];
        }
    }

    /**
     * Generate default commission settings based on truck capacities
     */
    public function generateDefaultCommissions(): array {
        $db = $this->db;
        $trucks = $db->fetchAll("SELECT DISTINCT capacity_m3 FROM Trucks ORDER BY capacity_m3");
        
        $generated = [];
        foreach ($trucks as $truck) {
            $cap = $truck['capacity_m3'];
            $key = 'commission_' . str_replace('.', '_', $cap) . 'm3';
            $existing = $this->getByKey($key);
            if ($existing === null) {
                $this->set($key, '0');
                $generated[] = $key;
            }
        }
        
        return ['status' => 'success', 'data' => $generated, 'message' => 'تم توليد إعدادات العمولات الافتراضية'];
    }

    /**
     * Get commission for a specific capacity
     */
    public function getCommissionForCapacity(string $capacity): float {
        $key = 'commission_' . str_replace('.', '_', $capacity) . 'm3';
        $value = $this->getByKey($key);
        return $value !== null ? (float)$value : 0.0;
    }
}

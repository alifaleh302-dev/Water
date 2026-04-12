<?php
require_once __DIR__ . '/../core/Model.php';

class FinancialPeriodModel extends Model {
    protected string $table = 'Financial_Periods';
    protected array $fillable = ['period_name', 'start_date', 'end_date', 'is_closed'];

    /**
     * Check if a date falls within a closed period (PostgreSQL boolean)
     */
    public function isDateInClosedPeriod(string $date): bool {
        $result = $this->db->fetch(
            "SELECT id FROM {$this->table} 
             WHERE is_closed = true AND ?::date BETWEEN start_date AND end_date
             LIMIT 1",
            [$date]
        );
        return $result !== null;
    }

    /**
     * Close a period and take snapshots (PostgreSQL boolean)
     */
    public function closePeriod(int $periodId): array {
        $period = $this->find($periodId);
        if (!$period) {
            return ['status' => 'error', 'message' => 'الفترة غير موجودة'];
        }
        if ($period['is_closed']) {
            return ['status' => 'error', 'message' => 'الفترة مغلقة مسبقاً'];
        }

        try {
            $db = $this->db;
            $db->beginTransaction();

            // Close the period
            $db->query("UPDATE {$this->table} SET is_closed = true WHERE id = ?", [$periodId]);

            // Snapshot customer balances
            $customers = $db->fetchAll("SELECT id, balance FROM Customers");
            foreach ($customers as $c) {
                $db->query(
                    "INSERT INTO Period_Snapshots (period_id, entity_type, entity_id, closing_balance, opening_balance) 
                     VALUES (?, 'Customer', ?, ?, ?)",
                    [$periodId, $c['id'], $c['balance'], $c['balance']]
                );
            }

            // Snapshot item stocks
            $items = $db->fetchAll("SELECT id, current_stock FROM Items");
            foreach ($items as $item) {
                $db->query(
                    "INSERT INTO Period_Snapshots (period_id, entity_type, entity_id, closing_balance, opening_balance) 
                     VALUES (?, 'Item', ?, ?, ?)",
                    [$periodId, $item['id'], $item['current_stock'], $item['current_stock']]
                );
            }

            // Snapshot fund balance
            $fundBalance = $db->fetch("SELECT current_balance FROM Fund_Transactions ORDER BY id DESC LIMIT 1");
            $balance = $fundBalance ? $fundBalance['current_balance'] : 0;
            $db->query(
                "INSERT INTO Period_Snapshots (period_id, entity_type, entity_id, closing_balance, opening_balance) 
                 VALUES (?, 'Fund', 1, ?, ?)",
                [$periodId, $balance, $balance]
            );

            $db->commit();
            return ['status' => 'success', 'message' => 'تم إغلاق الفترة وأخذ اللقطة بنجاح'];
        } catch (\Exception $e) {
            $db->rollBack();
            return ['status' => 'error', 'message' => 'خطأ في إغلاق الفترة: ' . $e->getMessage()];
        }
    }

    /**
     * Get snapshots for a period
     */
    public function getSnapshots(int $periodId): array {
        return $this->db->fetchAll(
            "SELECT * FROM Period_Snapshots WHERE period_id = ? ORDER BY entity_type, entity_id",
            [$periodId]
        );
    }
}

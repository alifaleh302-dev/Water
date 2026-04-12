<?php
require_once __DIR__ . '/../core/Model.php';

class CashClosingModel extends Model {
    protected string $table = 'Cash_Closings';
    protected array $fillable = ['closing_date', 'opening_balance', 'expected_amount', 'actual_amount', 'difference', 'closed_by'];

    /**
     * Get last closing
     */
    public function getLastClosing(): ?array {
        return $this->db->fetch(
            "SELECT * FROM {$this->table} ORDER BY id DESC LIMIT 1"
        );
    }

    /**
     * Get opening balance for today
     */
    public function getTodayOpeningBalance(): float {
        $lastClosing = $this->getLastClosing();
        if ($lastClosing) {
            return (float)$lastClosing['actual_amount'];
        }
        return 0.0;
    }
}

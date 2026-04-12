<?php
require_once __DIR__ . '/../core/Model.php';

class FundTransactionModel extends Model {
    protected string $table = 'Fund_Transactions';
    protected array $fillable = ['transaction_date', 'transaction_type', 'source_type', 'source_id', 'amount', 'current_balance'];

    /**
     * Get current fund balance
     */
    public function getCurrentBalance(): float {
        $result = $this->db->fetch(
            "SELECT current_balance FROM {$this->table} ORDER BY id DESC LIMIT 1"
        );
        return $result ? (float)$result['current_balance'] : 0.0;
    }

    /**
     * Record a fund transaction (Observer pattern)
     */
    public function record(string $type, string $sourceType, int $sourceId, float $amount): array {
        $currentBalance = $this->getCurrentBalance();
        
        if ($type === 'In') {
            $newBalance = $currentBalance + $amount;
        } else {
            $newBalance = $currentBalance - $amount;
        }

        return $this->create([
            'transaction_type' => $type,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'amount' => $amount,
            'current_balance' => $newBalance
        ]);
    }

    /**
     * Get transactions for a date range
     */
    public function getByDateRange(string $fromDate, string $toDate): array {
        return $this->db->fetchAll(
            "SELECT * FROM {$this->table} 
             WHERE DATE(transaction_date) >= ? AND DATE(transaction_date) <= ?
             ORDER BY id ASC",
            [$fromDate, $toDate]
        );
    }

    /**
     * Get today's transactions
     */
    public function getToday(): array {
        return $this->db->fetchAll(
            "SELECT * FROM {$this->table} WHERE DATE(transaction_date) = CURDATE() ORDER BY id ASC"
        );
    }

    /**
     * Get summary for date
     */
    public function getDaySummary(string $date): array {
        $result = $this->db->fetch(
            "SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'In' THEN amount ELSE 0 END), 0) as total_in,
                COALESCE(SUM(CASE WHEN transaction_type = 'Out' THEN amount ELSE 0 END), 0) as total_out
             FROM {$this->table}
             WHERE DATE(transaction_date) = ?",
            [$date]
        );
        return $result ?: ['total_in' => 0, 'total_out' => 0];
    }
}

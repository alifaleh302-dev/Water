<?php
/**
 * Fund Service (Observer Pattern)
 * Listens to financial operations and records fund transactions
 */
require_once __DIR__ . '/../models/FundTransactionModel.php';

class FundService {
    private FundTransactionModel $fundModel;

    public function __construct() {
        $this->fundModel = new FundTransactionModel();
    }

    /**
     * Record income from cash invoice
     */
    public function onCashInvoice(int $invoiceId, float $paidAmount): void {
        if ($paidAmount > 0) {
            $this->fundModel->record('In', 'فاتورة', $invoiceId, $paidAmount);
        }
    }

    /**
     * Record income from settlement
     */
    public function onSettlement(int $settlementId, float $amount): void {
        if ($amount > 0) {
            $this->fundModel->record('In', 'تصفية', $settlementId, $amount);
        }
    }

    /**
     * Record expense outflow
     */
    public function onExpense(int $expenseId, float $amount): void {
        if ($amount > 0) {
            $this->fundModel->record('Out', 'مصروف', $expenseId, $amount);
        }
    }

    /**
     * Record purchase outflow
     */
    public function onPurchase(int $purchaseId, float $amount): void {
        if ($amount > 0) {
            $this->fundModel->record('Out', 'مشتريات', $purchaseId, $amount);
        }
    }

    /**
     * Get current balance
     */
    public function getCurrentBalance(): float {
        return $this->fundModel->getCurrentBalance();
    }
}

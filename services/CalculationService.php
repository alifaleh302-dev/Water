<?php
/**
 * Smart Calculation Service — Server-side Calculation Engine
 * Phase 1: Smart Calculations (mirror of frontend calc-engine.js)
 *
 * Single source of truth for all financial calculations.
 * Frontend pre-computes for UX; backend recomputes for integrity.
 */
require_once __DIR__ . '/../models/SettingModel.php';

class CalculationService {
    protected SettingModel $settings;
    protected array $cache = [];

    public function __construct() {
        $this->settings = new SettingModel();
    }

    private function cfg(string $key, $default = null) {
        if (!isset($this->cache[$key])) {
            $this->cache[$key] = $this->settings->getByKey($key) ?? $default;
        }
        return $this->cache[$key];
    }

    /**
     * Calculate full invoice from raw inputs.
     * Returns canonical structure; never trusts client-supplied derived fields.
     */
    public function calculateInvoice(array $input): array {
        $qty       = (float)($input['quantity_m3']     ?? 0);
        $price     = (float)($input['price_per_m3']    ?? $this->cfg('price_per_m3', 0));
        $totalRaw  = isset($input['total_amount']) ? (float)$input['total_amount'] : null;
        $discount  = max(0, (float)($input['discount_amount'] ?? 0));
        $paid      = max(0, (float)($input['paid_amount']     ?? 0));
        $vatRate   = (float)$this->cfg('vat_rate', 0);

        // If client didn't provide total → compute from qty * price
        $total = $totalRaw !== null && $totalRaw > 0 ? $totalRaw : ($qty * $price);
        $total = max(0, $total);

        // VAT applies on (total - discount)
        $taxableBase = max(0, $total - $discount);
        $vatAmount   = round($taxableBase * ($vatRate / 100), 2);
        $netAmount   = round($taxableBase + $vatAmount, 2);
        $dueAmount   = round(max(0, $netAmount - $paid), 2);

        return [
            'quantity_m3'     => round($qty, 2),
            'price_per_m3'    => round($price, 2),
            'total_amount'    => round($total, 2),
            'discount_amount' => round($discount, 2),
            'vat_rate'        => $vatRate,
            'vat_amount'      => $vatAmount,
            'net_amount'      => $netAmount,
            'paid_amount'     => round($paid, 2),
            'due_amount'      => $dueAmount,
        ];
    }

    /**
     * Calculate driver settlement totals
     */
    public function calculateSettlement(array $cashSales, array $expenses, float $commission): array {
        $totalCash = 0; $totalDue = 0;
        foreach ($cashSales as $s) {
            $totalCash += (float)($s['paid_amount'] ?? 0);
            $totalDue  += (float)($s['due_amount']  ?? 0);
        }
        $totalExpenses = 0;
        foreach ($expenses as $e) {
            $totalExpenses += (float)($e['amount'] ?? 0);
        }
        $netReceivable = $totalCash - $commission - $totalExpenses;
        return [
            'total_cash'      => round($totalCash, 2),
            'total_due'       => round($totalDue, 2),
            'total_commission'=> round($commission, 2),
            'total_expenses'  => round($totalExpenses, 2),
            'net_receivable'  => round($netReceivable, 2)
        ];
    }

    /**
     * Get a smart-default snapshot for the front-end's invoice modal
     */
    public function invoiceDefaults(): array {
        return [
            'price_per_m3' => (float)$this->cfg('price_per_m3', 0),
            'vat_rate'     => (float)$this->cfg('vat_rate', 0),
            'currency'     => (string)$this->cfg('currency', 'ريال'),
        ];
    }
}

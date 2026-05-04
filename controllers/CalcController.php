<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../services/CalculationService.php';

/**
 * Calculation Controller — Real-time calc API
 * Phase 1: Smart Calculations
 */
class CalcController extends Controller {
    private CalculationService $svc;

    public function __construct() {
        $this->svc = new CalculationService();
    }

    /**
     * POST /api/calc/invoice — preview invoice totals
     */
    public function invoice(): void {
        $this->requireAuth();
        $input = $this->getInput();
        $result = $this->svc->calculateInvoice($input);
        $this->success($result);
    }

    /**
     * GET /api/calc/defaults — fetch all smart defaults at once
     */
    public function defaults(): void {
        $this->requireAuth();
        $this->success($this->svc->invoiceDefaults());
    }
}

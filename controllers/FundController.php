<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/FundTransactionModel.php';
require_once __DIR__ . '/../models/CashClosingModel.php';

class FundController extends Controller {
    private FundTransactionModel $fundModel;
    private CashClosingModel $closingModel;

    public function __construct() {
        $this->fundModel = new FundTransactionModel();
        $this->closingModel = new CashClosingModel();
    }

    public function index(): void {
        $this->requireAuth();
        $fromDate = $this->getParam('from_date', date('Y-m-d'));
        $toDate = $this->getParam('to_date', date('Y-m-d'));
        $data = $this->fundModel->getByDateRange($fromDate, $toDate);
        $this->success($data);
    }

    public function today(): void {
        $this->requireAuth();
        $data = $this->fundModel->getToday();
        $balance = $this->fundModel->getCurrentBalance();
        $summary = $this->fundModel->getDaySummary(date('Y-m-d'));
        $openingBalance = $this->closingModel->getTodayOpeningBalance();
        
        $this->success([
            'transactions' => $data,
            'current_balance' => $balance,
            'opening_balance' => $openingBalance,
            'total_in' => $summary['total_in'],
            'total_out' => $summary['total_out']
        ]);
    }

    public function balance(): void {
        $this->requireAuth();
        $balance = $this->fundModel->getCurrentBalance();
        $this->success(['balance' => $balance]);
    }

    /**
     * Daily cash closing
     */
    public function close(): void {
        $user = $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['actual_amount']);
        $this->validatePositiveAmounts($input, ['actual_amount']);

        $openingBalance = $this->closingModel->getTodayOpeningBalance();
        $summary = $this->fundModel->getDaySummary(date('Y-m-d'));
        $expectedAmount = $openingBalance + (float)$summary['total_in'] - (float)$summary['total_out'];
        $actualAmount = (float)$input['actual_amount'];
        $difference = $actualAmount - $expectedAmount;

        $result = $this->closingModel->create([
            'opening_balance' => $openingBalance,
            'expected_amount' => $expectedAmount,
            'actual_amount' => $actualAmount,
            'difference' => $difference,
            'closed_by' => $user['id']
        ]);

        if ($result['status'] === 'success') {
            $result['data']['opening_balance'] = $openingBalance;
            $result['data']['expected_amount'] = $expectedAmount;
            $result['data']['difference'] = $difference;
        }

        $this->json($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function closings(): void {
        $this->requireAuth();
        $data = $this->closingModel->getAll();
        $this->success($data);
    }

    public function show(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $record = $this->fundModel->find($id);
        $record ? $this->success($record) : $this->error('الحركة غير موجودة', 404);
    }

    public function search(): void {
        $this->requireAuth();
        $this->index();
    }

    public function store(): void {
        $this->error('لا يمكن إضافة حركة يدوياً - الحركات تسجل آلياً');
    }

    public function update(): void {
        $this->error('لا يمكن تعديل حركات الصندوق');
    }

    public function destroy(): void {
        $this->error('لا يمكن حذف حركات الصندوق');
    }
}

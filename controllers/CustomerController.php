<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/CustomerModel.php';

class CustomerController extends Controller {
    private CustomerModel $model;

    public function __construct() {
        $this->model = new CustomerModel();
    }

    public function index(): void {
        $this->requireAuth();
        $data = $this->model->getAll();
        $this->success($data);
    }

    public function show(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $record = $this->model->find($id);
        $record ? $this->success($record) : $this->error('الزبون غير موجود', 404);
    }

    public function store(): void {
        $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['name']);
        // balance and total_lifetime_paid are NOT in fillable - auto-managed
        $result = $this->model->create($input);
        $this->json($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $input = $this->getInput();
        // Remove read-only fields
        unset($input['balance'], $input['total_lifetime_paid']);
        $result = $this->model->update($id, $input);
        $this->json($result);
    }

    public function destroy(): void {
        $this->requireAdmin();
        $id = (int)$this->getParam('id');
        $result = $this->model->delete($id);
        $this->json($result);
    }

    public function search(): void {
        $this->requireAuth();
        $q = $this->getParam('q', '');
        $data = $this->model->search($q);
        $this->success($data);
    }

    public function debtors(): void {
        $this->requireAuth();
        $data = $this->model->getDebtors();
        $this->success($data);
    }

    public function debtAging(): void {
        $this->requireAuth();
        $days = (int)$this->getParam('days', 15);
        $data = $this->model->getDebtAging($days);
        $this->success($data);
    }

    public function statement(): void {
        $this->requireAuth();
        $customerId = (int)$this->getParam('id');
        $fromDate = $this->getParam('from_date');
        $toDate = $this->getParam('to_date');
        
        $customer = $this->model->find($customerId);
        if (!$customer) {
            $this->error('الزبون غير موجود', 404);
        }

        $transactions = $this->model->getStatement($customerId, $fromDate, $toDate);
        
        // Calculate running balance
        $runningBalance = 0;
        foreach ($transactions as &$tx) {
            $runningBalance += (float)$tx['debit'] - (float)$tx['credit'];
            $tx['running_balance'] = $runningBalance;
        }

        $this->success([
            'customer' => $customer,
            'transactions' => $transactions,
            'final_balance' => $runningBalance
        ]);
    }
}

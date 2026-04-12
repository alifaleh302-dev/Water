<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/ExpenseModel.php';
require_once __DIR__ . '/../models/ExpenseCategoryModel.php';
require_once __DIR__ . '/../services/FundService.php';

class ExpenseController extends Controller {
    private ExpenseModel $model;
    private ExpenseCategoryModel $categoryModel;
    private FundService $fundService;

    public function __construct() {
        $this->model = new ExpenseModel();
        $this->categoryModel = new ExpenseCategoryModel();
        $this->fundService = new FundService();
    }

    public function index(): void {
        $this->requireAuth();
        $filters = [];
        if ($this->getParam('date')) $filters['date'] = $this->getParam('date');
        if ($this->getParam('driver_id')) $filters['driver_id'] = $this->getParam('driver_id');
        if ($this->getParam('category_id')) $filters['category_id'] = $this->getParam('category_id');
        if ($this->getParam('from_date')) $filters['from_date'] = $this->getParam('from_date');
        if ($this->getParam('to_date')) $filters['to_date'] = $this->getParam('to_date');
        
        $data = $this->model->getAllWithDetails($filters);
        $this->success($data);
    }

    public function show(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $record = $this->model->find($id);
        $record ? $this->success($record) : $this->error('المصروف غير موجود', 404);
    }

    public function store(): void {
        $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['category_id', 'amount']);
        $this->validatePositiveAmounts($input, ['amount']);

        $db = Database::getInstance();

        try {
            $db->beginTransaction();

            $result = $this->model->create($input);
            
            if ($result['status'] === 'success') {
                $expenseId = $result['data']['id'];
                
                // If no driver_id = station expense, deduct from fund
                // If driver_id set = paid from driver, will show in settlement
                if (empty($input['driver_id'])) {
                    $this->fundService->onExpense($expenseId, (float)$input['amount']);
                }
            }

            $db->commit();
            $this->json($result, $result['status'] === 'success' ? 201 : 400);

        } catch (\Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            $this->error('خطأ في حفظ المصروف: ' . $e->getMessage(), 500);
        }
    }

    public function update(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $input = $this->getInput();
        if (isset($input['amount'])) {
            $this->validatePositiveAmounts($input, ['amount']);
        }
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
        $this->index();
    }

    // Expense Categories
    public function categories(): void {
        $this->requireAuth();
        $data = $this->categoryModel->getAll([], 'category_name ASC');
        $this->success($data);
    }

    public function storeCategory(): void {
        $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['category_name']);
        $result = $this->categoryModel->create($input);
        $this->json($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function updateCategory(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $input = $this->getInput();
        $result = $this->categoryModel->update($id, $input);
        $this->json($result);
    }

    public function destroyCategory(): void {
        $this->requireAdmin();
        $id = (int)$this->getParam('id');
        $result = $this->categoryModel->delete($id);
        $this->json($result);
    }
}

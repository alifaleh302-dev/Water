<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/ItemModel.php';
require_once __DIR__ . '/../models/InventoryPurchaseModel.php';
require_once __DIR__ . '/../models/InventoryTransactionModel.php';
require_once __DIR__ . '/../models/CustomerAssetModel.php';
require_once __DIR__ . '/../services/FundService.php';

class InventoryController extends Controller {
    private ItemModel $itemModel;
    private InventoryPurchaseModel $purchaseModel;
    private InventoryTransactionModel $transactionModel;
    private CustomerAssetModel $assetModel;
    private FundService $fundService;

    public function __construct() {
        $this->itemModel = new ItemModel();
        $this->purchaseModel = new InventoryPurchaseModel();
        $this->transactionModel = new InventoryTransactionModel();
        $this->assetModel = new CustomerAssetModel();
        $this->fundService = new FundService();
    }

    // ---- Items ----
    public function index(): void {
        $this->requireAuth();
        $data = $this->itemModel->getAll();
        $this->success($data);
    }

    public function show(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $record = $this->itemModel->find($id);
        $record ? $this->success($record) : $this->error('الصنف غير موجود', 404);
    }

    public function store(): void {
        $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['name', 'item_type', 'unit']);
        $result = $this->itemModel->create($input);
        $this->json($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $input = $this->getInput();
        $result = $this->itemModel->update($id, $input);
        $this->json($result);
    }

    public function destroy(): void {
        $this->requireAdmin();
        $id = (int)$this->getParam('id');
        $result = $this->itemModel->delete($id);
        $this->json($result);
    }

    public function search(): void {
        $this->requireAuth();
        $q = $this->getParam('q', '');
        $data = $this->itemModel->search($q);
        $this->success($data);
    }

    public function lowStock(): void {
        $this->requireAuth();
        $data = $this->itemModel->getLowStock();
        $this->success($data);
    }

    // ---- Purchases ----
    public function purchases(): void {
        $this->requireAuth();
        $filters = [];
        if ($this->getParam('item_id')) $filters['item_id'] = $this->getParam('item_id');
        if ($this->getParam('from_date')) $filters['from_date'] = $this->getParam('from_date');
        if ($this->getParam('to_date')) $filters['to_date'] = $this->getParam('to_date');
        $data = $this->purchaseModel->getAllWithDetails($filters);
        $this->success($data);
    }

    public function storePurchase(): void {
        $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['item_id', 'quantity', 'unit_price', 'total_amount']);
        $this->validatePositiveAmounts($input, ['quantity', 'unit_price', 'total_amount']);

        $db = Database::getInstance();

        try {
            $db->beginTransaction();

            $result = $this->purchaseModel->create($input);
            
            if ($result['status'] === 'success') {
                $purchaseId = $result['data']['id'];
                
                // Increase item stock
                $this->itemModel->increaseStock((int)$input['item_id'], (int)$input['quantity']);
                
                // Deduct cost from fund
                $this->fundService->onPurchase($purchaseId, (float)$input['total_amount']);
            }

            $db->commit();
            $this->json($result, $result['status'] === 'success' ? 201 : 400);

        } catch (\Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            $this->error('خطأ في حفظ عملية الشراء: ' . $e->getMessage(), 500);
        }
    }

    // ---- Inventory Transactions (Issue/Usage) ----
    public function transactions(): void {
        $this->requireAuth();
        $filters = [];
        if ($this->getParam('item_id')) $filters['item_id'] = $this->getParam('item_id');
        $data = $this->transactionModel->getAllWithDetails($filters);
        $this->success($data);
    }

    public function storeTransaction(): void {
        $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['item_id', 'transaction_type', 'quantity']);
        $this->validatePositiveAmounts($input, ['quantity']);

        $db = Database::getInstance();

        try {
            $db->beginTransaction();

            // Check stock availability for Issue
            if ($input['transaction_type'] === 'Issue') {
                $item = $this->itemModel->find((int)$input['item_id']);
                if (!$item) {
                    $db->rollBack();
                    $this->error('الصنف غير موجود');
                }
                if ($item['current_stock'] < (int)$input['quantity']) {
                    $db->rollBack();
                    $this->error('الكمية المطلوبة أكبر من المتوفر في المخزون');
                }
            }

            $result = $this->transactionModel->create($input);
            
            if ($result['status'] === 'success') {
                if ($input['transaction_type'] === 'Issue') {
                    $this->itemModel->decreaseStock((int)$input['item_id'], (int)$input['quantity']);
                }
            }

            $db->commit();
            
            // Check if stock is low after transaction
            $item = $this->itemModel->find((int)$input['item_id']);
            $result['low_stock_alert'] = ($item && $item['current_stock'] <= $item['min_limit'] && $item['min_limit'] > 0);
            $result['current_stock'] = $item ? $item['current_stock'] : 0;
            
            $this->json($result, $result['status'] === 'success' ? 201 : 400);

        } catch (\Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            $this->error('خطأ في حفظ حركة المخزون: ' . $e->getMessage(), 500);
        }
    }

    // ---- Customer Assets ----
    public function assets(): void {
        $this->requireAuth();
        $filters = [];
        if ($this->getParam('customer_id')) $filters['customer_id'] = $this->getParam('customer_id');
        if ($this->getParam('status')) $filters['status'] = $this->getParam('status');
        $data = $this->assetModel->getAllWithDetails($filters);
        $this->success($data);
    }

    public function storeAsset(): void {
        $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['customer_id', 'item_id', 'quantity']);
        $result = $this->assetModel->create($input);
        $this->json($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function updateAsset(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $input = $this->getInput();
        $result = $this->assetModel->update($id, $input);
        $this->json($result);
    }
}

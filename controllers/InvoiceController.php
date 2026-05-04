<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/InvoiceModel.php';
require_once __DIR__ . '/../models/TripModel.php';
require_once __DIR__ . '/../models/CustomerModel.php';
require_once __DIR__ . '/../services/FundService.php';
require_once __DIR__ . '/../services/CalculationService.php';

class InvoiceController extends Controller {
    private InvoiceModel $model;
    private TripModel $tripModel;
    private CustomerModel $customerModel;
    private FundService $fundService;
    private CalculationService $calc;

    public function __construct() {
        $this->model = new InvoiceModel();
        $this->tripModel = new TripModel();
        $this->customerModel = new CustomerModel();
        $this->fundService = new FundService();
        $this->calc = new CalculationService();
    }

    public function index(): void {
        $this->requireAuth();
        $filters = [];
        if ($this->getParam('trip_id')) $filters['trip_id'] = $this->getParam('trip_id');
        if ($this->getParam('customer_id')) $filters['customer_id'] = $this->getParam('customer_id');
        if ($this->getParam('date')) $filters['date'] = $this->getParam('date');
        if ($this->getParam('from_date')) $filters['from_date'] = $this->getParam('from_date');
        if ($this->getParam('to_date')) $filters['to_date'] = $this->getParam('to_date');
        
        $data = $this->model->getAllWithDetails($filters);
        $this->success($data);
    }

    public function show(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $record = $this->model->find($id);
        $record ? $this->success($record) : $this->error('الفاتورة غير موجودة', 404);
    }

    public function store(): void {
        $user = $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['trip_id', 'customer_id', 'quantity_m3']);
        $this->validatePositiveAmounts($input, ['quantity_m3', 'total_amount', 'discount_amount', 'net_amount', 'paid_amount', 'due_amount']);

        // Validate: Trip must be Open
        $trip = $this->tripModel->find((int)$input['trip_id']);
        if (!$trip) {
            $this->error('الرحلة غير موجودة');
        }
        if ($trip['status'] !== 'Open') {
            $this->error('لا يمكن إضافة فاتورة لرحلة مغلقة');
        }

        // Validate customer exists
        $customer = $this->customerModel->find((int)$input['customer_id']);
        if (!$customer) {
            $this->error('الزبون غير موجود');
        }

        // Smart Calculation Service: server-side single source of truth
        $calculated = $this->calc->calculateInvoice($input);
        foreach ($calculated as $k => $v) { $input[$k] = $v; }
        $paidAmount = $calculated['paid_amount'];
        $dueAmount  = $calculated['due_amount'];
        $input['created_by'] = (int)$user['id'];

        $db = Database::getInstance();
        
        try {
            $db->beginTransaction();

            // Create invoice
            $result = $this->model->create($input);
            
            if ($result['status'] !== 'success') {
                $db->rollBack();
                $this->json($result, 400);
            }

            $invoiceId = $result['data']['id'];

            // Update customer balance if there's a due amount
            if ($dueAmount > 0) {
                $this->customerModel->addToBalance((int)$input['customer_id'], $dueAmount);
            }

            // Record cash payment in fund (if paid_amount > 0)
            if ($paidAmount > 0) {
                $this->fundService->onCashInvoice($invoiceId, $paidAmount);
            }

            // Update customer lifetime paid
            if ($paidAmount > 0) {
                $this->customerModel->addToLifetimePaid((int)$input['customer_id'], $paidAmount);
            }

            $db->commit();
            
            // Return fresh data
            $result['data'] = $this->model->find($invoiceId);
            $result['data']['customer_balance'] = $this->customerModel->find((int)$input['customer_id'])['balance'];
            $this->json($result, 201);

        } catch (\Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            $this->error('خطأ في حفظ الفاتورة: ' . $e->getMessage(), 500);
        }
    }

    public function update(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $input = $this->getInput();
        if (isset($input['total_amount']) || isset($input['paid_amount'])) {
            $this->validatePositiveAmounts($input, ['total_amount', 'discount_amount', 'net_amount', 'paid_amount', 'due_amount']);
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

    public function byTrip(): void {
        $this->requireAuth();
        $tripId = (int)$this->getParam('trip_id');
        $data = $this->model->getByTrip($tripId);
        $this->success($data);
    }

    public function driverCashSales(): void {
        $this->requireAuth();
        $driverId = (int)$this->getParam('driver_id');
        $date = $this->getParam('date', date('Y-m-d'));
        $data = $this->model->getDriverCashSales($driverId, $date);
        $this->success($data);
    }

    public function salesSummary(): void {
        $this->requireAuth();
        $groupBy = $this->getParam('group_by', 'day');
        $fromDate = $this->getParam('from_date');
        $toDate = $this->getParam('to_date');
        $data = $this->model->getSalesSummary($groupBy, $fromDate, $toDate);
        $this->success($data);
    }

    public function waterConsumption(): void {
        $this->requireAuth();
        $fromDate = $this->getParam('from_date');
        $toDate = $this->getParam('to_date');
        $data = $this->model->getWaterConsumption($fromDate, $toDate);
        $this->success($data);
    }
}

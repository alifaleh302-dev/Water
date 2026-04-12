<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/TripModel.php';
require_once __DIR__ . '/../models/TruckModel.php';
require_once __DIR__ . '/../models/SettingModel.php';

class TripController extends Controller {
    private TripModel $model;
    private TruckModel $truckModel;
    private SettingModel $settingModel;

    public function __construct() {
        $this->model = new TripModel();
        $this->truckModel = new TruckModel();
        $this->settingModel = new SettingModel();
    }

    public function index(): void {
        $this->requireAuth();
        $date = $this->getParam('date', '');
        $driverId = $this->getParam('driver_id');
        $status = $this->getParam('status');
        
        $filters = [];
        if ($driverId) $filters['driver_id'] = $driverId;
        if ($status) $filters['status'] = $status;
        
        $data = $this->model->getAllWithDetails($filters, $date);
        $this->success($data);
    }

    public function show(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $record = $this->model->find($id);
        $record ? $this->success($record) : $this->error('الرحلة غير موجودة', 404);
    }

    public function store(): void {
        $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['driver_id', 'truck_id']);
        $this->validatePositiveAmounts($input, ['commission_amount']);

        // Smart logic: auto-fetch commission from settings based on truck capacity
        $truck = $this->truckModel->find((int)$input['truck_id']);
        if (!$truck) {
            $this->error('الوايت غير موجود');
        }

        // If commission not provided, get from settings
        if (!isset($input['commission_amount']) || empty($input['commission_amount'])) {
            $input['commission_amount'] = $this->settingModel->getCommissionForCapacity($truck['capacity_m3']);
        }

        $input['status'] = 'Open';
        $result = $this->model->create($input);
        $this->json($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $input = $this->getInput();
        if (isset($input['commission_amount'])) {
            $this->validatePositiveAmounts($input, ['commission_amount']);
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

    public function openTrips(): void {
        $this->requireAuth();
        $driverId = (int)$this->getParam('driver_id', 0);
        $data = $this->model->getOpenTrips($driverId);
        $this->success($data);
    }

    public function close(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $result = $this->model->closeTrip($id);
        $this->json($result);
    }

    /**
     * Get commission for a truck (AJAX helper)
     */
    public function getCommission(): void {
        $this->requireAuth();
        $truckId = (int)$this->getParam('truck_id');
        $truck = $this->truckModel->find($truckId);
        
        if (!$truck) {
            $this->error('الوايت غير موجود');
        }

        $commission = $this->settingModel->getCommissionForCapacity($truck['capacity_m3']);
        $this->success([
            'capacity_m3' => $truck['capacity_m3'],
            'commission_amount' => $commission
        ]);
    }

    public function search(): void {
        $this->requireAuth();
        $this->index();
    }
}

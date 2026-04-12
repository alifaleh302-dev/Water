<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/SettingModel.php';

class SettingsController extends Controller {
    private SettingModel $model;

    public function __construct() {
        $this->model = new SettingModel();
    }

    public function index(): void {
        $this->requireAuth();
        $data = $this->model->getAllAsMap();
        $this->success($data);
    }

    public function store(): void {
        $this->requireAdmin();
        $input = $this->getInput();
        
        if (isset($input['settings']) && is_array($input['settings'])) {
            $result = $this->model->bulkSave($input['settings']);
        } elseif (isset($input['setting_key']) && isset($input['setting_value'])) {
            $result = $this->model->set($input['setting_key'], $input['setting_value']);
        } else {
            $this->error('بيانات غير صالحة');
        }
        
        $this->json($result);
    }

    public function generateCommissions(): void {
        $this->requireAdmin();
        $result = $this->model->generateDefaultCommissions();
        $this->json($result);
    }

    public function getCommission(): void {
        $this->requireAuth();
        $capacity = $this->getParam('capacity', '0');
        $commission = $this->model->getCommissionForCapacity($capacity);
        $this->success(['commission' => $commission]);
    }
}

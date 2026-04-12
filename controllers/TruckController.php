<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/TruckModel.php';

class TruckController extends Controller {
    private TruckModel $model;

    public function __construct() {
        $this->model = new TruckModel();
    }

    public function index(): void {
        $this->requireAuth();
        $data = $this->model->getAll();
        $this->success($data);
    }

    public function active(): void {
        $this->requireAuth();
        $data = $this->model->getActive();
        $this->success($data);
    }

    public function show(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $record = $this->model->find($id);
        $record ? $this->success($record) : $this->error('الوايت غير موجود', 404);
    }

    public function store(): void {
        $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['plate_number', 'capacity_m3']);
        $this->validatePositiveAmounts($input, ['capacity_m3']);
        $result = $this->model->create($input);
        $this->json($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $input = $this->getInput();
        if (isset($input['capacity_m3'])) {
            $this->validatePositiveAmounts($input, ['capacity_m3']);
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
        $q = $this->getParam('q', '');
        $data = $this->model->search($q);
        $this->success($data);
    }
}

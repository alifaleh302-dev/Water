<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/DriverModel.php';

class DriverController extends Controller {
    private DriverModel $model;

    public function __construct() {
        $this->model = new DriverModel();
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
        $record ? $this->success($record) : $this->error('السائق غير موجود', 404);
    }

    public function store(): void {
        $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['name']);
        $result = $this->model->create($input);
        $this->json($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update(): void {
        $this->requireAuth();
        $id = (int)$this->getParam('id');
        $input = $this->getInput();
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

    public function dailySummary(): void {
        $this->requireAuth();
        $driverId = (int)$this->getParam('driver_id');
        $date = $this->getParam('date', date('Y-m-d'));
        $data = $this->model->getDailySummary($driverId, $date);
        $this->success($data);
    }
}

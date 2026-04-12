<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/UserModel.php';

class UserController extends Controller {
    private UserModel $model;

    public function __construct() {
        $this->model = new UserModel();
    }

    public function index(): void {
        $this->requireAdmin();
        $data = $this->model->getAll();
        $this->success($data);
    }

    public function show(): void {
        $this->requireAdmin();
        $id = (int)$this->getParam('id');
        $record = $this->model->find($id);
        if ($record) {
            unset($record['password']);
            $this->success($record);
        }
        $this->error('المستخدم غير موجود', 404);
    }

    public function store(): void {
        $this->requireAdmin();
        $input = $this->getInput();
        $this->validateRequired($input, ['username', 'password', 'role']);
        
        $result = $this->model->createUser($input);
        if ($result['status'] === 'success' && isset($result['data'])) {
            unset($result['data']['password']);
        }
        $this->json($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update(): void {
        $this->requireAdmin();
        $id = (int)$this->getParam('id');
        $input = $this->getInput();
        
        // If password is being changed, hash it
        if (isset($input['password']) && !empty($input['password'])) {
            $result = $this->model->updatePassword($id, $input['password']);
            unset($input['password']);
        }
        
        if (!empty($input)) {
            $result = $this->model->update($id, $input);
        }
        
        if (isset($result['data'])) {
            unset($result['data']['password']);
        }
        $this->json($result ?? ['status' => 'success', 'message' => 'تم التحديث']);
    }

    public function destroy(): void {
        $this->requireAdmin();
        $id = (int)$this->getParam('id');
        $result = $this->model->delete($id);
        $this->json($result);
    }

    public function search(): void {
        $this->requireAdmin();
        $q = $this->getParam('q', '');
        $data = $this->model->search($q);
        $data = array_map(function($row) { unset($row['password']); return $row; }, $data);
        $this->success($data);
    }
}

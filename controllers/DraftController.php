<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/DraftModel.php';

/**
 * Draft Controller — Server-side Draft Sync API
 * Phase 2: Data Resilience
 */
class DraftController extends Controller {
    private DraftModel $model;

    public function __construct() {
        $this->model = new DraftModel();
    }

    /**
     * GET /api/drafts — list user drafts
     */
    public function index(): void {
        $user = $this->requireAuth();
        $data = $this->model->listDrafts((int)$user['id']);
        $this->success($data);
    }

    /**
     * GET /api/drafts/show?key=XXX — fetch specific draft
     */
    public function show(): void {
        $user = $this->requireAuth();
        $key = $this->getParam('key', '');
        if (!$key) $this->error('مفتاح المسودة مطلوب');
        $draft = $this->model->getDraft((int)$user['id'], $key);
        $draft ? $this->success($draft) : $this->success(null, 'لا توجد مسودة');
    }

    /**
     * POST /api/drafts — save/update a draft
     * body: {key: string, data: object}
     */
    public function store(): void {
        $user = $this->requireAuth();
        $input = $this->getInput();
        $this->validateRequired($input, ['key', 'data']);

        $key = (string)$input['key'];
        $data = is_string($input['data']) ? $input['data'] : json_encode($input['data'], JSON_UNESCAPED_UNICODE);

        if (strlen($data) > 100000) {
            $this->error('حجم المسودة كبير جداً (حد أقصى 100KB)');
        }

        $result = $this->model->saveDraft((int)$user['id'], $key, $data);
        $this->json($result);
    }

    /**
     * DELETE /api/drafts?key=XXX
     */
    public function destroy(): void {
        $user = $this->requireAuth();
        $key = $this->getParam('key', '');
        if (!$key) $this->error('مفتاح المسودة مطلوب');
        $result = $this->model->deleteDraft((int)$user['id'], $key);
        $this->json($result);
    }
}

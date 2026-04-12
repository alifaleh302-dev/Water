<?php
/**
 * Admin Authorization Middleware
 */
class AdminMiddleware {
    public function handle(): void {
        if (!isset($_SESSION['user'])) {
            http_response_code(401);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['status' => 'error', 'message' => 'يجب تسجيل الدخول أولاً'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        if ($_SESSION['user']['role'] !== 'Admin') {
            http_response_code(403);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['status' => 'error', 'message' => 'صلاحيات غير كافية - مسموح للإدارة فقط'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

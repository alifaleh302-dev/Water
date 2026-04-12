<?php
/**
 * Authentication Middleware
 */
class AuthMiddleware {
    public function handle(): void {
        if (!isset($_SESSION['user'])) {
            http_response_code(401);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['status' => 'error', 'message' => 'يجب تسجيل الدخول أولاً'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

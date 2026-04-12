<?php
/**
 * Base Controller Class
 * Provides common methods for all controllers
 */
class Controller {
    
    /**
     * Send JSON response
     */
    protected function json(array $data, int $statusCode = 200): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Send success response
     */
    protected function success($data = null, string $message = 'تمت العملية بنجاح'): void {
        $response = ['status' => 'success', 'message' => $message];
        if ($data !== null) {
            $response['data'] = $data;
        }
        $this->json($response);
    }

    /**
     * Send error response
     */
    protected function error(string $message = 'حدث خطأ', int $code = 400): void {
        $this->json(['status' => 'error', 'message' => $message], $code);
    }

    /**
     * Get JSON input from request body
     */
    protected function getInput(): array {
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->error('بيانات JSON غير صالحة', 400);
        }
        return $input ?? [];
    }

    /**
     * Validate required fields
     */
    protected function validateRequired(array $data, array $required): void {
        $missing = [];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $missing[] = $field;
            }
        }
        if (!empty($missing)) {
            $this->error('حقول مطلوبة مفقودة: ' . implode(', ', $missing));
        }
    }

    /**
     * Validate no negative financial values
     */
    protected function validatePositiveAmounts(array $data, array $fields): void {
        foreach ($fields as $field) {
            if (isset($data[$field]) && (float)$data[$field] < 0) {
                $this->error("القيمة السالبة غير مسموحة في الحقل: {$field}");
            }
        }
    }

    /**
     * Get authenticated user from session
     */
    protected function getAuthUser(): ?array {
        return $_SESSION['user'] ?? null;
    }

    /**
     * Check if user is authenticated
     */
    protected function requireAuth(): array {
        $user = $this->getAuthUser();
        if (!$user) {
            $this->error('يجب تسجيل الدخول أولاً', 401);
        }
        return $user;
    }

    /**
     * Require admin role
     */
    protected function requireAdmin(): array {
        $user = $this->requireAuth();
        if ($user['role'] !== 'Admin') {
            $this->error('صلاحيات غير كافية - مسموح للإدارة فقط', 403);
        }
        return $user;
    }

    /**
     * Get query parameter
     */
    protected function getParam(string $key, $default = null) {
        return $_GET[$key] ?? $default;
    }
}

<?php
/**
 * Period Lock Middleware
 * Prevents modifications to documents within closed financial periods
 */
class PeriodMiddleware {
    public function handle(): void {
        // Only check on POST, PUT, DELETE
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        // Check various date fields
        $dateFields = ['invoice_date', 'trip_date', 'expense_date', 'settlement_date', 'purchase_date', 'transaction_date'];
        $dateToCheck = null;
        
        foreach ($dateFields as $field) {
            if (isset($input[$field]) && !empty($input[$field])) {
                $dateToCheck = substr($input[$field], 0, 10); // Extract date part
                break;
            }
        }

        if ($dateToCheck) {
            require_once __DIR__ . '/../core/Database.php';
            $db = Database::getInstance();
            $result = $db->fetch(
                "SELECT id FROM Financial_Periods WHERE is_closed = 1 AND ? BETWEEN start_date AND end_date LIMIT 1",
                [$dateToCheck]
            );
            
            if ($result) {
                http_response_code(403);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'status' => 'error', 
                    'message' => 'لا يمكن إجراء تعديلات على فترة مالية مغلقة'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
    }
}

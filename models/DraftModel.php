<?php
require_once __DIR__ . '/../core/Model.php';

/**
 * User Drafts Model — Server-side Draft Persistence
 * Backs Phase 2: Data Resilience (cross-device draft sync)
 */
class DraftModel extends Model {
    protected string $table = 'user_drafts';
    protected array $fillable = ['user_id', 'draft_key', 'draft_data'];

    /**
     * Save or update a draft (UPSERT)
     */
    public function saveDraft(int $userId, string $key, string $data): array {
        try {
            $sql = "INSERT INTO user_drafts (user_id, draft_key, draft_data, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, draft_key)
                    DO UPDATE SET draft_data = EXCLUDED.draft_data, updated_at = CURRENT_TIMESTAMP";
            $this->db->query($sql, [$userId, $key, $data]);
            return ['status' => 'success', 'message' => 'تم حفظ المسودة'];
        } catch (\PDOException $e) {
            return ['status' => 'error', 'message' => 'فشل حفظ المسودة'];
        }
    }

    /**
     * List all drafts for a user
     */
    public function listDrafts(int $userId): array {
        return $this->db->fetchAll(
            "SELECT id, draft_key, draft_data, updated_at FROM user_drafts
             WHERE user_id = ? ORDER BY updated_at DESC",
            [$userId]
        );
    }

    /**
     * Get a specific draft
     */
    public function getDraft(int $userId, string $key): ?array {
        return $this->db->fetch(
            "SELECT * FROM user_drafts WHERE user_id = ? AND draft_key = ?",
            [$userId, $key]
        );
    }

    /**
     * Delete a draft (after successful save)
     */
    public function deleteDraft(int $userId, string $key): array {
        try {
            $this->db->query(
                "DELETE FROM user_drafts WHERE user_id = ? AND draft_key = ?",
                [$userId, $key]
            );
            return ['status' => 'success', 'message' => 'تم حذف المسودة'];
        } catch (\PDOException $e) {
            return ['status' => 'error', 'message' => 'فشل حذف المسودة'];
        }
    }

    /**
     * Cleanup drafts older than N days (housekeeping)
     */
    public function cleanupOld(int $days = 30): int {
        $stmt = $this->db->query(
            "DELETE FROM user_drafts WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '{$days} days'"
        );
        return $stmt->rowCount();
    }
}

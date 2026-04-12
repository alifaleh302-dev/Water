<?php
require_once __DIR__ . '/../core/Model.php';

class UserModel extends Model {
    protected string $table = 'Users';
    protected array $fillable = ['username', 'password', 'role', 'is_active'];
    protected array $searchable = ['username', 'role'];

    /**
     * Find user by username (for login)
     */
    public function findByUsername(string $username): ?array {
        return $this->db->fetch(
            "SELECT * FROM {$this->table} WHERE username = ?",
            [$username]
        );
    }

    /**
     * Authenticate user
     */
    public function authenticate(string $username, string $password): ?array {
        $user = $this->findByUsername($username);
        if ($user && password_verify($password, $user['password']) && $user['is_active']) {
            unset($user['password']); // Never expose password
            return $user;
        }
        return null;
    }

    /**
     * Create user with hashed password
     */
    public function createUser(array $data): array {
        $appConfig = require __DIR__ . '/../config/app.php';
        $data['password'] = password_hash($data['password'], $appConfig['password']['algo'], ['cost' => $appConfig['password']['cost']]);
        return $this->create($data);
    }

    /**
     * Update password
     */
    public function updatePassword(int $id, string $newPassword): array {
        $appConfig = require __DIR__ . '/../config/app.php';
        $hashed = password_hash($newPassword, $appConfig['password']['algo'], ['cost' => $appConfig['password']['cost']]);
        return $this->update($id, ['password' => $hashed]);
    }

    /**
     * Override getAll to never return passwords
     */
    public function getAll(array $filters = [], string $orderBy = 'id DESC', int $limit = 0, int $offset = 0): array {
        $results = parent::getAll($filters, $orderBy, $limit, $offset);
        return array_map(function($row) {
            unset($row['password']);
            return $row;
        }, $results);
    }
}

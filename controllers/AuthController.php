<?php
require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../models/UserModel.php';

class AuthController extends Controller {
    private UserModel $userModel;

    public function __construct() {
        $this->userModel = new UserModel();
    }

    /**
     * Login
     */
    public function login(): void {
        $input = $this->getInput();
        $this->validateRequired($input, ['username', 'password']);

        $user = $this->userModel->authenticate($input['username'], $input['password']);
        
        if ($user) {
            $_SESSION['user'] = $user;
            $this->success($user, 'تم تسجيل الدخول بنجاح');
        } else {
            $this->error('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
        }
    }

    /**
     * Logout
     */
    public function logout(): void {
        session_destroy();
        $this->success(null, 'تم تسجيل الخروج بنجاح');
    }

    /**
     * Get current session user
     */
    public function me(): void {
        $user = $this->getAuthUser();
        if ($user) {
            $this->success($user);
        } else {
            $this->error('غير مسجل الدخول', 401);
        }
    }
}

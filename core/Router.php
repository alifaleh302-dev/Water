<?php
/**
 * Custom Router Class
 * Routes API requests to appropriate controllers
 */
class Router {
    private array $routes = [];
    private array $middleware = [];

    /**
     * Register a GET route
     */
    public function get(string $path, string $controller, string $method): self {
        $this->routes['GET'][$path] = ['controller' => $controller, 'method' => $method];
        return $this;
    }

    /**
     * Register a POST route
     */
    public function post(string $path, string $controller, string $method): self {
        $this->routes['POST'][$path] = ['controller' => $controller, 'method' => $method];
        return $this;
    }

    /**
     * Register a PUT route
     */
    public function put(string $path, string $controller, string $method): self {
        $this->routes['PUT'][$path] = ['controller' => $controller, 'method' => $method];
        return $this;
    }

    /**
     * Register a DELETE route
     */
    public function delete(string $path, string $controller, string $method): self {
        $this->routes['DELETE'][$path] = ['controller' => $controller, 'method' => $method];
        return $this;
    }

    /**
     * Add middleware to the last registered route
     */
    public function middleware(string $middlewareName): self {
        foreach (['DELETE', 'PUT', 'POST', 'GET'] as $httpMethod) {
            if (!empty($this->routes[$httpMethod])) {
                $lastPath = array_key_last($this->routes[$httpMethod]);
                $this->middleware[$httpMethod][$lastPath][] = $middlewareName;
                break;
            }
        }
        return $this;
    }

    /**
     * Register CRUD routes for a resource
     */
    public function resource(string $basePath, string $controller): self {
        $this->get($basePath, $controller, 'index');
        $this->get($basePath . '/show', $controller, 'show');
        $this->get($basePath . '/search', $controller, 'search');
        $this->post($basePath, $controller, 'store');
        $this->put($basePath, $controller, 'update');
        $this->delete($basePath, $controller, 'destroy');
        return $this;
    }

    /**
     * Dispatch the current request
     */
    public function dispatch(): void {
        $requestMethod = $_SERVER['REQUEST_METHOD'];
        $requestUri = $this->getRequestPath();

        // Handle CORS preflight
        if ($requestMethod === 'OPTIONS') {
            $this->sendCorsHeaders();
            http_response_code(204);
            exit;
        }

        $this->sendCorsHeaders();

        // Find matching route
        $matchedRoute = null;
        $matchedPath = null;

        if (isset($this->routes[$requestMethod])) {
            foreach ($this->routes[$requestMethod] as $path => $route) {
                $pattern = $this->pathToRegex($path);
                if (preg_match($pattern, $requestUri, $matches)) {
                    $matchedRoute = $route;
                    $matchedPath = $path;
                    array_shift($matches);
                    $_GET = array_merge($_GET, $matches);
                    break;
                }
            }
        }

        if (!$matchedRoute) {
            http_response_code(404);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'status' => 'error',
                'message' => 'المسار غير موجود',
                'debug_path' => $requestUri
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Run middleware
        if (isset($this->middleware[$requestMethod][$matchedPath])) {
            foreach ($this->middleware[$requestMethod][$matchedPath] as $mw) {
                $this->runMiddleware($mw);
            }
        }

        // Instantiate controller and call method
        $controllerName = $matchedRoute['controller'];
        $methodName = $matchedRoute['method'];

        if (!class_exists($controllerName)) {
            require_once __DIR__ . "/../controllers/{$controllerName}.php";
        }

        $controller = new $controllerName();
        
        if (!method_exists($controller, $methodName)) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['status' => 'error', 'message' => 'الدالة غير موجودة'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $controller->$methodName();
    }

    /**
     * Convert path pattern to regex
     */
    private function pathToRegex(string $path): string {
        $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $path);
        return '#^' . $pattern . '$#';
    }

    /**
     * Get the request path - robust version for Render/Docker/Apache
     */
    private function getRequestPath(): string {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        
        // Remove query string
        if (($pos = strpos($uri, '?')) !== false) {
            $uri = substr($uri, 0, $pos);
        }
        
        // Decode URL
        $uri = rawurldecode($uri);
        
        // Remove api.php prefix if present (handles: /api.php/api/... or api.php/api/...)
        $uri = preg_replace('#/?(api\.php)#', '', $uri);
        
        // Remove SCRIPT_NAME base path if not root
        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
        $basePath = dirname($scriptName);
        if ($basePath !== '/' && $basePath !== '\\' && $basePath !== '.' && !empty($basePath)) {
            if (strpos($uri, $basePath) === 0) {
                $uri = substr($uri, strlen($basePath));
            }
        }
        
        // Clean up: ensure starts with / and no trailing slash (except root)
        $uri = '/' . trim($uri, '/');
        
        // Ensure /api prefix is there
        if ($uri !== '/' && strpos($uri, '/api') !== 0) {
            // If path doesn't start with /api, try prepending it
            if (strpos($uri, '/auth') === 0 || strpos($uri, '/drivers') === 0 || 
                strpos($uri, '/trucks') === 0 || strpos($uri, '/customers') === 0 ||
                strpos($uri, '/trips') === 0 || strpos($uri, '/invoices') === 0 ||
                strpos($uri, '/settlements') === 0 || strpos($uri, '/expenses') === 0 ||
                strpos($uri, '/fund') === 0 || strpos($uri, '/inventory') === 0 ||
                strpos($uri, '/reports') === 0 || strpos($uri, '/settings') === 0 ||
                strpos($uri, '/users') === 0 || strpos($uri, '/dashboard') === 0 ||
                strpos($uri, '/periods') === 0) {
                $uri = '/api' . $uri;
            }
        }
        
        return $uri;
    }

    /**
     * Send CORS headers
     */
    private function sendCorsHeaders(): void {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
    }

    /**
     * Run a named middleware
     */
    private function runMiddleware(string $name): void {
        $middlewareFile = __DIR__ . "/../middleware/{$name}.php";
        if (file_exists($middlewareFile)) {
            require_once $middlewareFile;
            $className = ucfirst($name) . 'Middleware';
            if (class_exists($className)) {
                $mw = new $className();
                $mw->handle();
            }
        }
    }
}

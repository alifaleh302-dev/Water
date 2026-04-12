<?php
/**
 * Database Configuration
 * Water Management System - PostgreSQL
 */

// Parse DATABASE_URL if available (Render format)
$databaseUrl = getenv('DATABASE_URL');
if ($databaseUrl) {
    $parsed = parse_url($databaseUrl);
    $host = $parsed['host'] ?? 'localhost';
    $port = $parsed['port'] ?? '5432';
    $dbname = ltrim($parsed['path'] ?? '/waterdb', '/');
    $username = $parsed['user'] ?? 'postgres';
    $password = $parsed['pass'] ?? '';
} else {
    $host = getenv('DB_HOST') ?: 'localhost';
    $port = getenv('DB_PORT') ?: '5432';
    $dbname = getenv('DB_NAME') ?: 'waterdb';
    $username = getenv('DB_USER') ?: 'postgres';
    $password = getenv('DB_PASS') ?: '';
}

return [
    'driver'   => 'pgsql',
    'host'     => $host,
    'port'     => $port,
    'dbname'   => $dbname,
    'username' => $username,
    'password' => $password,
    'options'  => [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]
];

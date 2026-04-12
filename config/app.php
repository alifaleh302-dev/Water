<?php
/**
 * Application Configuration
 * Water Management System
 */
return [
    'name'      => 'نظام إدارة المياه',
    'version'   => '1.0.0',
    'debug'     => getenv('APP_DEBUG') ?: true,
    'timezone'  => 'Asia/Riyadh',
    'base_url'  => getenv('APP_URL') ?: 'http://localhost/water',
    'session'   => [
        'name'     => 'water_session',
        'lifetime' => 28800, // 8 hours
    ],
    'password'  => [
        'algo' => PASSWORD_BCRYPT,
        'cost' => 12
    ]
];

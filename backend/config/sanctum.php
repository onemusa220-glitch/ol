<?php

return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost:5173,127.0.0.1:5173')),
    'guard' => ['sanctum'],
    'expiration' => null,
    'token' => [
        'name' => 'auth_token',
        'abilities' => ['*'],
    ],
];

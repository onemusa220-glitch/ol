<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();
        if (! $user || ! in_array($permission, self::permissionsFor($user->role), true)) {
            abort(403, 'You do not have permission to perform this action.');
        }

        return $next($request);
    }

    public static function permissionsFor(string $role): array
    {
        return match ($role) {
            'super_admin' => ['*'],
            'manager' => ['pos', 'pos_discount', 'pos_void', 'reports', 'inventory', 'purchasing', 'users', 'stock_take', 'cashier', 'branches', 'customers', 'settings'],
            'cashier' => ['pos', 'cashier', 'customers'],
            'storekeeper' => ['inventory', 'stock_take'],
            'procurement' => ['purchasing', 'inventory'],
            'stock_take_agent' => ['stock_take'],
            default => [],
        };
    }
}

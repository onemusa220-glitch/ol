<?php

namespace App\Services;

use App\Models\InventoryBalance;
use App\Models\Movement;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Ulid\Ulid;

class InventoryService
{
    public static function balance(string $productId, string $branchId): float
    {
        return (float) (InventoryBalance::where('product_id', $productId)
            ->where('branch_id', $branchId)
            ->value('qty') ?? 0);
    }

    public static function applyMovement(
        string $productId,
        string $branchId,
        string $type,
        float $qtyChange,
        string $ref,
        ?string $userId = null,
    ): Movement {
        return DB::transaction(function () use ($productId, $branchId, $type, $qtyChange, $ref, $userId) {
            $row = InventoryBalance::firstOrCreate(
                ['product_id' => $productId, 'branch_id' => $branchId],
                ['qty' => 0],
            );
            $before = (float) $row->qty;
            $after = round($before + $qtyChange, 3);

            if ($after < -0.001) {
                throw new \DomainException("Insufficient stock for product {$productId} at branch {$branchId}");
            }

            $row->update(['qty' => $after]);

            return Movement::create([
                'id' => (string) Ulid::generate(),
                'product_id' => $productId,
                'branch_id' => $branchId,
                'type' => $type,
                'qty_before' => $before,
                'qty_change' => round($qtyChange, 3),
                'qty_after' => $after,
                'ref' => $ref,
                'user_id' => $userId,
                'at' => now(),
            ]);
        });
    }

    public static function nextRef(string $prefix): string
    {
        $count = (int) Setting::get("counter.{$prefix}", 0) + 1;
        Setting::set("counter.{$prefix}", $count);

        return strtoupper($prefix).'-'.str_pad((string) $count, 5, '0', STR_PAD_LEFT);
    }
}

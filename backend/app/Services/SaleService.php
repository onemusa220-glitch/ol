<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;
use Ulid\Ulid;

class SaleService
{
    public static function evaluate(Sale $sale): void
    {
        $paid = (float) $sale->payments()->where('status', 'SUCCESS')->sum('amount');
        $total = (float) $sale->total;

        if ($total > 0 && $paid + 0.001 >= $total) {
            $sale->status = 'PAID';
            if (! $sale->receipt_no) {
                $sale->receipt_no = 'BRM-'.self::nextRef('SALE');
            }
            self::commitInventory($sale);
            $sale->status = 'COMPLETED';
            $sale->completed_at = now();
        } elseif ($paid > 0) {
            $sale->status = 'PARTIALLY_PAID';
        } else {
            $sale->status = 'PENDING_PAYMENT';
        }
        $sale->save();
    }

    public static function commitInventory(Sale $sale): void
    {
        if ($sale->inventory_committed) {
            return;
        }
        DB::transaction(function () use ($sale) {
            foreach ($sale->items as $item) {
                $qty = $item->mode === 'piece'
                    ? (float) $item->pieces
                    : (float) $item->qty_kg;
                InventoryService::applyMovement(
                    $item->product_id,
                    $sale->branch_id,
                    'SALE',
                    -$qty,
                    $sale->receipt_no ?? $sale->id,
                    $sale->user_id,
                );
            }
            $sale->inventory_committed = true;
            $sale->save();
        });
    }

    public static function audit(string $action, string $detail, ?string $userId = null): void
    {
        AuditLog::create([
            'id' => (string) Ulid::generate(),
            'user_id' => $userId,
            'action' => $action,
            'detail' => $detail,
            'at' => now(),
        ]);
    }

    public static function nextRef(string $prefix): string
    {
        return InventoryService::nextRef($prefix);
    }

    public static function auditWrap(callable $fn)
    {
        try {
            return $fn();
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}

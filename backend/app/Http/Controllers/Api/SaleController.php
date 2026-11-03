<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\SaleService;
use Illuminate\Http\Request;
use Ulid\Ulid;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $query = Sale::query()->with(['items', 'payments', 'customer', 'branch']);

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }
        if ($branch = $request->string('branch_id')->toString()) {
            $query->where('branch_id', $branch);
        }

        return response()->json($query->orderByDesc('created_at')->limit(200)->get());
    }

    public function show(Sale $sale)
    {
        return response()->json($sale->load(['items', 'payments', 'customer', 'branch']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'branch_id' => ['required', 'ulid', 'exists:branches,id'],
            'customer_id' => ['nullable', 'ulid', 'exists:customers,id'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'ulid', 'exists:products,id'],
            'items.*.product_name' => ['required', 'string'],
            'items.*.emoji' => ['nullable', 'string'],
            'items.*.mode' => ['required', 'in:weight,piece,amount'],
            'items.*.qty_kg' => ['nullable', 'numeric', 'min:0'],
            'items.*.pieces' => ['nullable', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.unit_price_label' => ['required', 'string'],
            'items.*.qty_label' => ['required', 'string'],
            'items.*.total' => ['required', 'numeric', 'min:0'],
            'items.*.note' => ['nullable', 'string'],
        ]);

        return SaleService::auditWrap(function () use ($data, $request) {
            $sale = Sale::create([
                'id' => (string) Ulid::generate(),
                'branch_id' => $data['branch_id'],
                'customer_id' => $data['customer_id'] ?? null,
                'user_id' => $request->user()?->id,
                'discount' => $data['discount'] ?? 0,
                'total' => collect($data['items'])->sum('total') - ($data['discount'] ?? 0),
                'status' => 'DRAFT',
                'inventory_committed' => false,
                'created_at' => now(),
            ]);

            foreach ($data['items'] as $item) {
                SaleItem::create([
                    'id' => (string) Ulid::generate(),
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'],
                    'product_name' => $item['product_name'],
                    'emoji' => $item['emoji'] ?? '🍗',
                    'mode' => $item['mode'],
                    'qty_kg' => $item['qty_kg'] ?? null,
                    'pieces' => $item['pieces'] ?? null,
                    'unit_price' => $item['unit_price'],
                    'unit_price_label' => $item['unit_price_label'],
                    'qty_label' => $item['qty_label'],
                    'total' => $item['total'],
                    'note' => $item['note'] ?? null,
                ]);
            }

            return response()->json($sale->load('items'), 201);
        });
    }

    public function cancel(Sale $sale)
    {
        if (in_array($sale->status, ['COMPLETED', 'CANCELLED'], true)) {
            return response()->json(['message' => 'Cannot cancel a completed or already cancelled sale'], 422);
        }
        $sale->update(['status' => 'CANCELLED']);

        return response()->json($sale->fresh());
    }
}

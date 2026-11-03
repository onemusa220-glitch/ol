<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Payment;
use App\Models\Movement;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $branchId = $request->string('branch_id')->toString();

        $sales = Sale::query()
            ->where('status', 'COMPLETED')
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->whereDate('completed_at', today())
            ->get();

        return response()->json([
            'sales_today' => $sales->count(),
            'revenue_today' => (float) $sales->sum('total'),
            'avg_basket' => $sales->count() ? (float) $sales->sum('total') / $sales->count() : 0,
        ]);
    }

    public function salesOverTime(Request $request)
    {
        $days = min(90, max(1, (int) $request->integer('days', 7)));
        $branchId = $request->string('branch_id')->toString();

        $rows = Sale::query()
            ->selectRaw("DATE(completed_at) as day, COUNT(*) as count, SUM(total) as revenue")
            ->where('status', 'COMPLETED')
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->where('completed_at', '>=', now()->subDays($days))
            ->groupByRaw('DATE(completed_at)')
            ->orderByRaw('DATE(completed_at)')
            ->get();

        return response()->json($rows);
    }

    public function topProducts(Request $request)
    {
        $limit = min(50, max(1, (int) $request->integer('limit', 10)));
        $branchId = $request->string('branch_id')->toString();

        $rows = \DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', 'COMPLETED')
            ->when($branchId, fn ($q) => $q->where('sales.branch_id', $branchId))
            ->selectRaw("sale_items.product_name, SUM(sale_items.total) as revenue, SUM(COALESCE(sale_items.pieces,0) + COALESCE(sale_items.qty_kg,0)) as units")
            ->groupBy('sale_items.product_name')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get();

        return response()->json($rows);
    }
}

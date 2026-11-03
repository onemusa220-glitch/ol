<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryBalance;
use App\Models\Movement;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function balances(Request $request)
    {
        $query = InventoryBalance::query()->with(['product', 'branch']);

        if ($branch = $request->string('branch_id')->toString()) {
            $query->where('branch_id', $branch);
        }

        return response()->json($query->get());
    }

    public function movements(Request $request)
    {
        $query = Movement::query()->with(['product', 'branch']);

        if ($branch = $request->string('branch_id')->toString()) {
            $query->where('branch_id', $branch);
        }
        if ($type = $request->string('type')->toString()) {
            $query->where('type', $type);
        }

        return response()->json($query->orderByDesc('at')->limit(500)->get());
    }
}

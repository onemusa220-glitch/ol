<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function branches()
    {
        return response()->json(Branch::all());
    }

    public function categories()
    {
        return response()->json(Category::all());
    }

    public function products(Request $request)
    {
        $query = Product::query()->with('category');

        if ($request->boolean('active_only')) {
            $query->where('active', true);
        }
        if ($cat = $request->string('category_id')->toString()) {
            $query->where('category_id', $cat);
        }
        if ($search = $request->string('q')->toString()) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('sku', 'like', "%{$search}%"));
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function storeProduct(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'sku' => ['required', 'string', 'max:64', 'unique:products,sku'],
            'category_id' => ['required', 'ulid', 'exists:categories,id'],
            'emoji' => ['nullable', 'string', 'max:8'],
            'base_unit' => ['required', 'in:KG,PIECE'],
            'selling_modes' => ['required', 'array'],
            'selling_modes.*' => ['in:weight,piece,amount'],
            'price_per_kg' => ['nullable', 'numeric'],
            'price_per_piece' => ['nullable', 'numeric'],
            'piece_weight_kg' => ['nullable', 'numeric'],
            'cost_per_kg' => ['nullable', 'numeric'],
            'cost_per_piece' => ['nullable', 'numeric'],
            'reorder_level' => ['nullable', 'numeric'],
            'active' => ['boolean'],
        ]);

        $product = Product::create($data);

        return response()->json($product, 201);
    }

    public function updateProduct(Request $request, Product $product)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'category_id' => ['sometimes', 'ulid', 'exists:categories,id'],
            'emoji' => ['nullable', 'string', 'max:8'],
            'base_unit' => ['sometimes', 'in:KG,PIECE'],
            'selling_modes' => ['sometimes', 'array'],
            'selling_modes.*' => ['in:weight,piece,amount'],
            'price_per_kg' => ['nullable', 'numeric'],
            'price_per_piece' => ['nullable', 'numeric'],
            'piece_weight_kg' => ['nullable', 'numeric'],
            'cost_per_kg' => ['nullable', 'numeric'],
            'cost_per_piece' => ['nullable', 'numeric'],
            'reorder_level' => ['nullable', 'numeric'],
            'active' => ['boolean'],
        ]);

        $product->update($data);

        return response()->json($product->fresh());
    }
}

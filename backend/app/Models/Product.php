<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'selling_modes' => 'array',
            'price_per_kg' => 'decimal:2',
            'price_per_piece' => 'decimal:2',
            'piece_weight_kg' => 'decimal:3',
            'cost_per_kg' => 'decimal:2',
            'cost_per_piece' => 'decimal:2',
            'reorder_level' => 'decimal:3',
            'active' => 'boolean',
        ];
    }

    public function category(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function balances(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(InventoryBalance::class);
    }

    public function movements(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Movement::class);
    }
}

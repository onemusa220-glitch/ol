<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashierShift extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'opening_float' => 'decimal:2',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'expected_cash' => 'decimal:2',
            'actual_cash' => 'decimal:2',
            'variance' => 'decimal:2',
        ];
    }

    public function cashMovements(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(CashMovement::class, 'shift_id');
    }
}

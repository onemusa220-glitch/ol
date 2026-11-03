<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Movement extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'at' => 'datetime',
            'qty_before' => 'decimal:3',
            'qty_change' => 'decimal:3',
            'qty_after' => 'decimal:3',
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversion extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'input' => 'array',
            'outputs' => 'array',
            'waste_qty' => 'decimal:3',
            'at' => 'datetime',
        ];
    }
}

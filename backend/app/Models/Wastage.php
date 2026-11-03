<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wastage extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $table = 'wastage';
    protected $guarded = [];

    protected function casts(): array
    {
        return ['qty' => 'decimal:3', 'at' => 'datetime'];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaybillInbox extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $table = 'paybill_inbox';
    protected $guarded = [];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'at' => 'datetime'];
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->string('method', 16); // CASH | STK | PAYBILL | CARD
            $table->decimal('amount', 12, 2);
            $table->string('status', 16)->default('PENDING');
            $table->string('ref');
            $table->string('phone')->nullable();
            $table->string('checkout_id')->nullable();
            $table->string('mpesa_ref')->nullable();
            $table->string('paybill_account')->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->boolean('demo')->default(true);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('confirmed_at')->nullable();
        });

        Schema::create('sale_returns', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('ref');
            $table->foreignUlid('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->string('receipt_no');
            $table->json('items');
            $table->decimal('total', 12, 2)->default(0);
            $table->foreignUlid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_returns');
        Schema::dropIfExists('payments');
    }
};

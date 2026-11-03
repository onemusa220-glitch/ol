<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('wastage', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->decimal('qty', 14, 3);
            $table->string('reason', 32);
            $table->text('notes')->nullable();
            $table->foreignUlid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('ref');
            $table->foreignUlid('from_branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignUlid('to_branch_id')->constrained('branches')->cascadeOnDelete();
            $table->json('items');
            $table->foreignUlid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('ref');
            $table->foreignUlid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->decimal('qty', 14, 3);
            $table->string('reason');
            $table->foreignUlid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('conversions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('ref');
            $table->foreignUlid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->json('input');
            $table->json('outputs');
            $table->decimal('waste_qty', 14, 3)->default(0);
            $table->string('status', 24)->default('COMPLETED');
            $table->foreignUlid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversions');
        Schema::dropIfExists('stock_adjustments');
        Schema::dropIfExists('stock_transfers');
        Schema::dropIfExists('wastage');
    }
};

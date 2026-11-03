<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->string('sku')->unique();
            $table->foreignUlid('category_id')->constrained('categories')->cascadeOnDelete();
            $table->string('emoji')->default('🍗');
            $table->string('base_unit')->default('KG'); // KG | PIECE
            $table->json('selling_modes'); // ["weight","piece","amount"]
            $table->decimal('price_per_kg', 12, 2)->nullable();
            $table->decimal('price_per_piece', 12, 2)->nullable();
            $table->decimal('piece_weight_kg', 8, 3)->nullable();
            $table->decimal('cost_per_kg', 12, 2)->nullable();
            $table->decimal('cost_per_piece', 12, 2)->nullable();
            $table->decimal('reorder_level', 12, 3)->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('inventory_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->decimal('qty', 14, 3)->default(0);
            $table->unique(['product_id', 'branch_id']);
            $table->timestamps();
        });

        Schema::create('movements', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('type', 32);
            $table->decimal('qty_before', 14, 3);
            $table->decimal('qty_change', 14, 3);
            $table->decimal('qty_after', 14, 3);
            $table->string('ref');
            $table->foreignUlid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movements');
        Schema::dropIfExists('inventory_balances');
        Schema::dropIfExists('products');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_takes', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('ref');
            $table->foreignUlid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignUlid('agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 24)->default('DRAFT');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignUlid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_notes')->nullable();
            $table->json('items');
            $table->timestamps();
        });

        Schema::create('cashier_shifts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('ref');
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->decimal('opening_float', 12, 2)->default(0);
            $table->timestamp('opened_at')->useCurrent();
            $table->string('status', 24)->default('OPEN');
            $table->timestamp('closed_at')->nullable();
            $table->decimal('expected_cash', 12, 2)->nullable();
            $table->decimal('actual_cash', 12, 2)->nullable();
            $table->decimal('variance', 12, 2)->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();
        });

        Schema::create('cash_movements', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('shift_id')->constrained('cashier_shifts')->cascadeOnDelete();
            $table->string('type', 8); // IN | OUT
            $table->decimal('amount', 12, 2);
            $table->string('reason');
            $table->foreignUlid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('paybill_inbox', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('paybill_number');
            $table->string('account');
            $table->decimal('amount', 12, 2);
            $table->string('status', 16)->default('UNMATCHED');
            $table->foreignUlid('matched_payment_id')->nullable();
            $table->timestamp('at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->text('detail');
            $table->timestamp('at')->useCurrent();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('paybill_inbox');
        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('cashier_shifts');
        Schema::dropIfExists('stock_takes');
    }
};

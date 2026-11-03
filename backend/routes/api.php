<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\MpesaCallbackController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use Illuminate\Support\Facades\Route;

// Public auth
Route::post('/auth/login', [AuthController::class, 'login']);

// M-Pesa callbacks (public, verified via Safaricom signature in production)
Route::prefix('mpesa')->group(function () {
    Route::post('/callback', [MpesaCallbackController::class, 'stkCallback']);
    Route::post('/paybill/confirmation', [MpesaCallbackController::class, 'paybillConfirmation']);
    Route::post('/paybill/validation', [MpesaCallbackController::class, 'paybillValidation']);
});

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Catalog
    Route::get('/branches', [CatalogController::class, 'branches']);
    Route::get('/categories', [CatalogController::class, 'categories']);
    Route::get('/products', [CatalogController::class, 'products']);
    Route::post('/products', [CatalogController::class, 'storeProduct'])->middleware('permission:inventory');
    Route::put('/products/{product}', [CatalogController::class, 'updateProduct'])->middleware('permission:inventory');

    // Inventory
    Route::get('/inventory/balances', [InventoryController::class, 'balances'])->middleware('permission:inventory');
    Route::get('/inventory/movements', [InventoryController::class, 'movements'])->middleware('permission:inventory');

    // Customers
    Route::get('/customers', [CustomerController::class, 'index'])->middleware('permission:customers');
    Route::post('/customers', [CustomerController::class, 'store'])->middleware('permission:customers');
    Route::get('/customers/{customer}', [CustomerController::class, 'show'])->middleware('permission:customers');
    Route::put('/customers/{customer}', [CustomerController::class, 'update'])->middleware('permission:customers');

    // Sales
    Route::get('/sales', [SaleController::class, 'index'])->middleware('permission:pos');
    Route::post('/sales', [SaleController::class, 'store'])->middleware('permission:pos');
    Route::get('/sales/{sale}', [SaleController::class, 'show'])->middleware('permission:pos');
    Route::post('/sales/{sale}/cancel', [SaleController::class, 'cancel'])->middleware('permission:pos_void');

    // Payments
    Route::get('/payments', [PaymentController::class, 'index'])->middleware('permission:pos');
    Route::post('/sales/{sale}/payments/cash', [PaymentController::class, 'cash'])->middleware('permission:pos');
    Route::post('/sales/{sale}/payments/card', [PaymentController::class, 'card'])->middleware('permission:pos');
    Route::post('/sales/{sale}/payments/stk', [PaymentController::class, 'stkPush'])->middleware('permission:pos');
    Route::post('/payments/{payment}/stk/resolve', [PaymentController::class, 'stkResolve'])->middleware('permission:pos');
    Route::post('/sales/{sale}/payments/paybill', [PaymentController::class, 'paybillExpectation'])->middleware('permission:pos');
    Route::post('/payments/{payment}/paybill/confirm', [PaymentController::class, 'paybillConfirm'])->middleware('permission:pos');

    // Reports
    Route::get('/reports/dashboard', [ReportController::class, 'dashboard'])->middleware('permission:reports');
    Route::get('/reports/sales', [ReportController::class, 'salesOverTime'])->middleware('permission:reports');
    Route::get('/reports/top-products', [ReportController::class, 'topProducts'])->middleware('permission:reports');
});

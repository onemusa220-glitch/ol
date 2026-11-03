<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Sale;
use App\Services\SaleService;
use Illuminate\Http\Request;
use Ulid\Ulid;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::query()->with('sale');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }
        if ($method = $request->string('method')->toString()) {
            $query->where('method', $method);
        }

        return response()->json($query->orderByDesc('created_at')->limit(200)->get());
    }

    public function cash(Request $request, Sale $sale)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $amount = (float) $data['amount'];
        $paid = (float) $sale->payments()->where('status', 'SUCCESS')->sum('amount');
        if ($amount > ((float) $sale->total - $paid) + 0.01) {
            return response()->json(['message' => 'Amount exceeds remaining balance'], 422);
        }

        $pay = $this->recordPayment($sale, 'CASH', $amount, ['status' => 'SUCCESS']);
        SaleService::evaluate($sale->fresh());
        SaleService::audit('CASH_PAYMENT', "{$sale->receipt_no ?? $sale->id} KSh {$amount}", $request->user()?->id);

        return response()->json($sale->fresh()->load(['items', 'payments']));
    }

    public function card(Request $request, Sale $sale)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'last4' => ['required', 'string', 'size:4'],
        ]);

        $pay = $this->recordPayment($sale, 'CARD', (float) $data['amount'], [
            'status' => 'SUCCESS',
            'ref' => 'CARD-'.substr((string) Ulid::generate(), 0, 8),
        ]);
        SaleService::evaluate($sale->fresh());
        SaleService::audit('CARD_PAYMENT', "{$sale->receipt_no ?? $sale->id} KSh {$data['amount']}", $request->user()?->id);

        return response()->json($sale->fresh()->load(['items', 'payments']));
    }

    public function stkPush(Request $request, Sale $sale)
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        $pay = $this->recordPayment($sale, 'STK', (float) $data['amount'], [
            'phone' => $data['phone'],
            'checkout_id' => 'ws-co_'.substr((string) Ulid::generate(), 0, 10),
        ]);

        SaleService::audit('STK_PUSH', "{$pay->ref} → {$data['phone']} KSh {$data['amount']}", $request->user()?->id);

        return response()->json(['payment' => $pay, 'message' => 'STK push sent — waiting for customer approval']);
    }

    public function stkResolve(Request $request, Payment $payment)
    {
        $data = $request->validate([
            'outcome' => ['required', 'in:SUCCESS,FAILED'],
        ]);

        if ($payment->status !== 'PENDING') {
            return response()->json(['message' => 'Payment already resolved'], 422);
        }

        $payment->status = $data['outcome'];
        $payment->attempts += 1;
        if ($data['outcome'] === 'SUCCESS') {
            $payment->mpesa_ref = 'DEMO'.random_int(100000, 999999);
            $payment->confirmed_at = now();
        }
        $payment->save();

        SaleService::evaluate($payment->sale->fresh());

        return response()->json($payment->fresh()->load('sale'));
    }

    public function paybillExpectation(Request $request, Sale $sale)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $account = 'BRM-SALE-'.str_pad((string) SaleService::nextRef('paybillRef'), 5, '0', STR_PAD_LEFT);
        $pay = $this->recordPayment($sale, 'PAYBILL', (float) $data['amount'], [
            'paybill_account' => $account,
        ]);

        return response()->json(['payment' => $pay, 'account' => $account]);
    }

    public function paybillConfirm(Request $request, Payment $payment)
    {
        if ($payment->status !== 'PENDING' || ! $payment->paybill_account) {
            return response()->json(['message' => 'No pending PayBill expectation'], 422);
        }

        $payment->status = 'SUCCESS';
        $payment->mpesa_ref = 'DEMO'.random_int(100000, 999999);
        $payment->confirmed_at = now();
        $payment->attempts += 1;
        $payment->save();

        SaleService::evaluate($payment->sale->fresh());
        SaleService::audit('PAYBILL_MATCHED', "{$payment->paybill_account} KSh {$payment->amount}", $request->user()?->id);

        return response()->json($payment->fresh()->load('sale'));
    }

    private function recordPayment(Sale $sale, string $method, float $amount, array $overrides = []): Payment
    {
        return Payment::create(array_merge([
            'id' => (string) Ulid::generate(),
            'sale_id' => $sale->id,
            'method' => $method,
            'amount' => $amount,
            'status' => 'PENDING',
            'ref' => 'BRM-PAY-'.substr((string) Ulid::generate(), 0, 8),
            'attempts' => 0,
            'demo' => true,
            'created_at' => now(),
        ], $overrides));
    }
}

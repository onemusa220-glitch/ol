<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\SaleService;
use Illuminate\Http\Request;

class MpesaCallbackController extends Controller
{
    /**
     * Receive Safaricom Daraja STK push / C2B PayBill callbacks.
     * Verifies the BodystkCallback.ResultCode and resolves the matching payment.
     */
    public function stkCallback(Request $request)
    {
        $data = $request->input('Body.stkCallback');
        if (! $data) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid payload']);
        }

        $checkoutId = $data['CheckoutRequestID'] ?? null;
        $resultCode = (int) ($data['ResultCode'] ?? 1);

        $payment = Payment::where('checkout_id', $checkoutId)->first();
        if (! $payment) {
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted — no matching payment']);
        }

        if ($payment->status !== 'PENDING') {
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Already resolved']);
        }

        if ($resultCode === 0) {
            $payment->status = 'SUCCESS';
            $payment->mpesa_ref = $data['CallbackMetadata']['Item'][1]['Value'] ?? ('DEMO'.random_int(100000, 999999));
            $payment->confirmed_at = now();
        } else {
            $payment->status = 'FAILED';
        }
        $payment->attempts += 1;
        $payment->save();

        SaleService::evaluate($payment->sale->fresh());

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Success']);
    }

    public function paybillConfirmation(Request $request)
    {
        // C2B confirmation URL — acknowledge receipt
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    public function paybillValidation(Request $request)
    {
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }
}

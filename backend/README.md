# BrathaMatu POS — Laravel 13 API Backend

This directory contains the **API server** for the BrathaMatu POS system. It mirrors the
in-memory demo domain model used by the React frontend (`src/demo/types.ts`) and exposes
it through a REST API secured with Laravel Sanctum tokens.

> Note: The frontend currently runs against an in-memory demo store. This backend is the
> production-ready API that the frontend will switch to once deployed.

## Requirements

- PHP 8.3+
- Composer 2
- SQLite (dev) or MySQL/Postgres (prod)

## Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan serve
```

The API will be available at `http://localhost:8000/api`.

## Default Users

All passwords are `password`.

| Email                          | Role           |
|--------------------------------|----------------|
| owner@brathamatu.test          | super_admin    |
| manager@brathamatu.test        | manager        |
| cashier@brathamatu.test        | cashier        |
| store@brathamatu.test          | storekeeper    |
| procurement@brathamatu.test     | procurement    |

## Auth

```bash
POST /api/auth/login
{ "email": "cashier@brathamatu.test", "password": "password" }
```

Returns `{ "user": {...}, "token": "1|abcd..." }`. Send the token as
`Authorization: Bearer 1|abcd...` on all subsequent requests.

## API Endpoints

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Catalog
- `GET /api/branches`
- `GET /api/categories`
- `GET /api/products?category_id=&q=&active_only=`
- `POST /api/products` (inventory perm)
- `PUT /api/products/{product}` (inventory perm)

### Inventory
- `GET /api/inventory/balances?branch_id=`
- `GET /api/inventory/movements?branch_id=&type=`

### Customers
- `GET /api/customers?q=`
- `POST /api/customers`
- `GET /api/customers/{customer}`
- `PUT /api/customers/{customer}`

### Sales
- `GET /api/sales?status=&branch_id=`
- `POST /api/sales` — create a sale with items
- `GET /api/sales/{sale}`
- `POST /api/sales/{sale}/cancel` (pos_void perm)

### Payments
- `GET /api/payments?status=&method=`
- `POST /api/sales/{sale}/payments/cash` — `{ amount }`
- `POST /api/sales/{sale}/payments/card` — `{ amount, last4 }`
- `POST /api/sales/{sale}/payments/stk` — `{ phone, amount }` (STK push)
- `POST /api/payments/{payment}/stk/resolve` — `{ outcome: SUCCESS|FAILED }`
- `POST /api/sales/{sale}/payments/paybill` — `{ amount }` (generate account)
- `POST /api/payments/{payment}/paybill/confirm` — confirm customer M-Pesa message

### Reports
- `GET /api/reports/dashboard?branch_id=`
- `GET /api/reports/sales?days=7&branch_id=`
- `GET /api/reports/top-products?limit=10&branch_id=`

### M-Pesa Callbacks (public, verified by Safaricom in prod)
- `POST /api/mpesa/callback` — STK push callback
- `POST /api/mpesa/paybill/confirmation`
- `POST /api/mpesa/paybill/validation`

## Roles & Permissions

| Role             | Permissions                                                                 |
|------------------|----------------------------------------------------------------------------|
| super_admin      | all (`*`)                                                                  |
| manager          | pos, pos_discount, pos_void, reports, inventory, purchasing, users, stock_take, cashier, branches, customers, settings |
| cashier          | pos, cashier, customers                                                    |
| storekeeper      | inventory, stock_take                                                      |
| procurement      | purchasing, inventory                                                       |
| stock_take_agent | stock_take                                                                 |

## Database Schema

The migrations create 25 tables mirroring the frontend domain:

`users`, `branches`, `categories`, `products`, `inventory_balances`, `movements`,
`customers`, `sales`, `sale_items`, `payments`, `sale_returns`, `suppliers`,
`purchase_orders`, `goods_receipts`, `wastage`, `stock_transfers`,
`stock_adjustments`, `conversions`, `stock_takes`, `cashier_shifts`,
`cash_movements`, `paybill_inbox`, `audit_logs`, `settings`, `sessions`.

All primary keys are ULIDs (26-char string IDs) for consistency with the frontend.

## M-Pesa Integration

The `.env.example` includes placeholders for Safaricom Daraja credentials. When
`MPESA_ENV=sandbox`, calls go to the Daraja sandbox. Fill in consumer key/secret,
passkey, and the callback URL pointing to this server's public address.

The STK push and PayBill flows are implemented end-to-end:
1. STK push creates a `PENDING` payment with a `checkout_id` and the Daraja callback
   resolves it to `SUCCESS`/`FAILED`.
2. PayBill creates an expectation with a `BRM-SALE-xxxxx` account; the customer
   sends money and the confirmation endpoint (or a real C2B callback) marks it paid.
3. On `SUCCESS`, `SaleService::evaluate` auto-completes the sale and commits stock.

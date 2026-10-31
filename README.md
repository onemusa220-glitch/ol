# BrathaMatu Poultry POS

# 🐔 BRATHAMATU KUKU POS & INVENTORY MANAGEMENT SYSTEM

## MISSION

Build a **complete, production-grade, premium poultry/meat POS and business management system for BrathaMatu**.

This is **NOT** a generic supermarket POS.

The business sells poultry products in complicated real-world ways:

- By **Kilogram (KG)**
- By **Grams**
- By **Piece**
- By a **fixed configured piece price**
- By the **amount of money the customer can afford**

Examples:

> “Nipe drumstick moja.”

> “Nipe liver ya 200.”

> “Nina KSh 500, nipatie kuku ya hiyo pesa.”

> “Nipe drumsticks 2 KG.”

The POS must make these transactions extremely fast while maintaining **accurate inventory, costing, sales, payment and audit records**.

---

# 🚨 ABSOLUTE RULES — READ BEFORE BUILDING

## DO NOT BUILD A DEMO

Do NOT create:

- Fake dashboards
- Fake payment success
- Simulated M-Pesa payments
- Fake API responses
- Hardcoded stock
- Hardcoded reports
- Buttons that do nothing
- Placeholder checkout flows pretending to be production
- Duplicate inventory systems
- Negative stock caused by abandoned transactions

Every implemented screen must be backed by a clear data model and working application logic.

If a real backend/API is not yet connected, clearly label the integration state instead of pretending it is live.

---

# 🎯 PRIMARY GOAL

Create the **best POS user experience possible** for:

1. Fast chicken/meat sales
2. Weight-based products
3. Gram-based products
4. Piece-based products
5. Customer-budget sales
6. Inventory management
7. Supplier purchasing
8. Goods receiving
9. Stock transfers
10. Wastage
11. Stock taking
12. Cashier shifts
13. M-Pesa STK Push
14. M-Pesa PayBill
15. Split payments
16. Sales reports
17. Profit reporting
18. Management dashboards
19. Mobile/tablet POS usage

The UI must feel like a **premium modern commercial POS**, not a basic admin dashboard.

---

# 🎨 DESIGN SYSTEM

## Brand

Business:

**BRATHAMATU**

Primary context:

Poultry / Chicken / Fresh Food / Retail / Wholesale

Create a premium, clean and energetic visual identity.

### Design principles

- Extremely fast
- Large touch targets
- Minimal clicks
- High contrast
- Easy for cashiers
- Excellent on touchscreen
- Excellent on tablets
- Excellent on desktop
- Excellent on mobile
- No clutter
- Important totals always visible

Use:

- Modern cards
- Clear spacing
- Strong typography hierarchy
- Smooth but subtle transitions
- Excellent loading states
- Empty states
- Error states
- Confirmation states

Do not sacrifice speed for excessive animations.

---

# 🖥️ APPLICATION STRUCTURE

Create a complete application with the following main modules.

```text
BRATHAMATU
│
├── Dashboard
│
├── POS
│   ├── New Sale
│   ├── Suspended Sales
│   ├── Returns
│   └── Receipts
│
├── Products
│   ├── Products
│   ├── Categories
│   ├── Units
│   ├── Prices
│   └── Selling Modes
│
├── Inventory
│   ├── Stock Overview
│   ├── Stock Movements
│   ├── Batches
│   ├── Transfers
│   ├── Wastage
│   └── Adjustments
│
├── Purchasing
│   ├── Suppliers
│   ├── Purchase Orders
│   └── Goods Receiving
│
├── Stock Taking
│   ├── Stock Take Sessions
│   ├── Assignments
│   ├── Variances
│   └── Approvals
│
├── Customers
│
├── Payments
│   ├── Transactions
│   ├── STK Payments
│   ├── PayBill Payments
│   └── Reconciliation
│
├── Cashier
│   ├── Shifts
│   ├── Cash Movements
│   └── Reconciliation
│
├── Reports
│   ├── Sales
│   ├── Products
│   ├── Inventory
│   ├── Wastage
│   ├── Payments
│   ├── Profit
│   └── Stock Variance
│
├── Users & Roles
│
├── Branches
│
└── Settings
```

---

# 🔥 MODULE 1 — THE MAIN POS

This is the most important screen in the entire application.

## Desktop layout

Use a three-column POS experience.

### LEFT

Product categories.

Examples:

- 🐔 Whole Chicken
- 🍗 Chicken Cuts
- 🫀 Organs
- 📦 Other Products

### CENTER

Large searchable product grid.

Every product card should show:

```text
PRODUCT IMAGE
PRODUCT NAME
AVAILABLE STOCK
PRICE
```

Examples:

```text
🍗 DRUMSTICKS

KSh 450 / KG

Stock: 25.6 KG
```

### RIGHT

Persistent shopping cart.

```text
CURRENT SALE

Drumsticks
500g
KSh 225

Liver
2 pieces
KSh 300

────────────────

SUBTOTAL
KSh 525

DISCOUNT
KSh 0

TOTAL

KSh 525

[ CHECKOUT ]
```

The total must always be visible.

---

# 🍗 PRODUCT SELLING MODES

When a cashier selects a product, do not immediately add it blindly.

Show the selling modes configured for that product.

Example:

# DRUMSTICKS

```text
How is the customer buying?

[ ⚖️ BY WEIGHT ]

[ 🍗 BY PIECE ]

[ 💰 BY AMOUNT ]
```

Only show modes enabled for that product.

---

# ⚖️ BY WEIGHT

Allow:

- KG
- Grams

Example:

```text
DRUMSTICKS

Enter Weight

[ 500 ]

[ GRAMS ▼ ]

Quick options:

[100g]
[250g]
[500g]
[750g]
[1KG]

Price:
KSh 450 / KG

TOTAL

KSh 225

[ ADD TO CART ]
```

Automatically calculate totals.

---

# 🍗 BY PIECE

Example:

```text
DRUMSTICKS

Price Per Piece

KSh 80

Quantity

[-]  3  [+]

TOTAL

KSh 240

[ ADD TO CART ]
```

The system must support products that have:

- Only piece pricing
- Only weight pricing
- Both piece and weight pricing

---

# 💰 SELL BY CUSTOMER AMOUNT — CRITICAL FEATURE

This is one of the most important features.

Customer says:

> “Nipe kuku ya KSh 300.”

The cashier selects:

```text
SELL BY AMOUNT

Product:
Drumsticks

Customer Budget:

KSh [300]

Price:
KSh 450 / KG
```

System calculates:

```text
CUSTOMER SHOULD RECEIVE

666 GRAMS

ESTIMATED TOTAL

KSh 299.70
```

Allow the cashier to:

- Accept the calculation
- Adjust the final weight
- Recalculate total
- Apply authorized rounding

Final actual weight must be stored.

---

# 🛒 CART

Each cart item must clearly show:

```text
Product Name

Selling Mode:
WEIGHT / PIECE / AMOUNT

Quantity:
500g

Unit Price:
KSh 450/KG

Line Total:
KSh 225
```

Allow:

- Increase
- Decrease
- Edit
- Remove
- Add note where permitted

Do not allow accidental deletion.

Use confirmation for destructive actions where appropriate.

---

# 💳 CHECKOUT

Create a beautiful payment selection screen.

```text
SALE TOTAL

KSh 2,500

SELECT PAYMENT METHOD

[ 💵 CASH ]

[ 📱 M-PESA STK ]

[ 🏦 PAYBILL ]

[ 💳 CARD ]

[ 🔀 SPLIT PAYMENT ]
```

---

# 💵 CASH PAYMENT

```text
TOTAL:
KSh 2,500

AMOUNT RECEIVED

KSh [3000]

CHANGE

KSh 500

[ COMPLETE PAYMENT ]
```

Cash payment should integrate with cashier shift accounting.

---

# 📱 M-PESA STK PUSH

Create the complete production-ready UX.

```text
M-PESA STK PUSH

Amount:
KSh 2,000

Phone Number:

[ 2547XXXXXXXX ]

[ SEND STK PUSH ]
```

After submission:

```text
PAYMENT REQUEST SENT

Check your phone and enter your M-Pesa PIN.

⏳ WAITING FOR PAYMENT

[ CHECK STATUS ]

[ CANCEL ]
```

When backend confirms:

```text
✓ PAYMENT RECEIVED

M-Pesa Reference:
XXXXXXXX

Amount:
KSh 2,000
```

## IMPORTANT

The frontend must never mark the payment successful merely because STK was initiated.

Success must come from the backend-confirmed payment status.

Use polling or real-time updates depending on backend capabilities.

---

# 🏦 PAYBILL PAYMENT

Create a clear manual PayBill payment experience.

```text
PAYBILL PAYMENT

Business Number:

XXXXXX

Account Number:

BRM-SALE-000123

Amount:

KSh 1,500
```

Display:

```text
1. Go to M-Pesa
2. Select Lipa na M-Pesa
3. Select PayBill
4. Enter Business Number
5. Enter Account Number
6. Enter Amount
7. Complete payment
```

Then:

```text
⏳ WAITING FOR PAYMENT

[ CHECK PAYMENT STATUS ]
```

Once backend confirms:

```text
✓ PAYBILL PAYMENT RECEIVED
```

Never fake confirmation.

---

# 🔀 SPLIT PAYMENT — CRITICAL

Allow multiple payments against one sale.

Example:

```text
TOTAL

KSh 2,500

PAYMENTS

💵 CASH

KSh 500

📱 M-PESA STK

KSh 2,000

────────────────

TOTAL PAID

KSh 2,500

BALANCE

KSh 0

[ COMPLETE SALE ]
```

Allow combinations such as:

- Cash + STK
- Cash + PayBill
- Cash + Card
- STK + Cash
- Multiple payment lines

Electronic payment portions should display:

```text
PENDING
SUCCESS
FAILED
EXPIRED
```

Do not complete the sale until required payment conditions are met.

---

# 🧾 PAYMENT PROGRESS SCREEN

During checkout, show:

```text
PAYMENT PROGRESS

TOTAL:
KSh 2,500

────────────────

✓ Cash

KSh 500

────────────────

⏳ M-Pesa STK

KSh 2,000

Waiting for customer...

────────────────

PAID:
KSh 500

BALANCE:
KSh 2,000
```

When confirmed:

```text
✓ PAYMENT COMPLETE

[ PRINT RECEIPT ]

[ NEW SALE ]
```

---

# 🧾 RECEIPTS

Create beautiful receipt views.

Support:

- Thermal receipt
- Printable invoice
- Receipt history

Example:

```text
━━━━━━━━━━━━━━━━━━━━

BRATHAMATU

KUKU POS

━━━━━━━━━━━━━━━━━━━━

Receipt:
BRM-00000125

Drumsticks

500g @ KSh 450/KG

KSh 225

Liver

2 × KSh 150

KSh 300

━━━━━━━━━━━━━━━━━━━━

TOTAL

KSh 525

PAYMENTS

Cash
KSh 200

M-Pesa
KSh 325

━━━━━━━━━━━━━━━━━━━━

PAID

KSh 525

Thank you!

━━━━━━━━━━━━━━━━━━━━
```

---

# 📦 MODULE 2 — PRODUCT MANAGEMENT

Product creation must support flexible configuration.

## Product Form

```text
Product Name

Category

SKU

Barcode

Base Inventory Unit

[KG]

Selling Modes

☑ KG

☑ GRAMS

☑ PIECE

☑ CUSTOMER AMOUNT

Pricing

Price Per KG

Price Per Piece

Minimum Stock

Reorder Level

[ SAVE PRODUCT ]
```

Examples:

### Drumsticks

```text
Base Inventory:
KG

Sell By:
KG
GRAMS
PIECE
AMOUNT
```

### Liver

```text
Base Inventory:
KG

Sell By:
GRAMS
AMOUNT
```

### Packaged Item

```text
Base Inventory:
PIECE

Sell By:
PIECE
```

---

# 📦 MODULE 3 — INVENTORY

Create a professional inventory management system.

## Inventory Overview

Display:

```text
PRODUCT

EXPECTED STOCK

AVAILABLE STOCK

RESERVED STOCK

LOW STOCK STATUS
```

Filters:

- Branch
- Category
- Low stock
- Product

---

# 📜 INVENTORY MOVEMENTS

Every inventory change must be traceable.

Movement types:

```text
PURCHASE_RECEIVED

SALE

SALE_RETURN

TRANSFER_OUT

TRANSFER_IN

WASTAGE

ADJUSTMENT

CONVERSION_INPUT

CONVERSION_OUTPUT
```

Movement detail should show:

- Product
- Branch
- Quantity before
- Quantity changed
- Quantity after
- Reference
- User
- Date/time

Do not create editable “magic stock totals” without movement history.

---

# 🗑️ WASTAGE

Allow:

```text
PRODUCT

Drumsticks

QUANTITY

1.2 KG

REASON

Spoilage / Damage / Expired / Other

NOTES

[Record Wastage]
```

Wastage should require the appropriate permission.

---

# 🚚 MODULE 4 — SUPPLIERS & PURCHASING

## Suppliers

Supplier profile:

- Name
- Phone
- Email
- Location
- Products supplied
- Purchase history
- Outstanding balance

---

# 📋 PURCHASE ORDERS

Create:

```text
PURCHASE ORDER

Supplier

Items

Product
Quantity
Unit
Cost

TOTAL COST

[ SAVE DRAFT ]

[ SEND / CONFIRM ]
```

Statuses:

```text
DRAFT

ORDERED

PARTIALLY RECEIVED

RECEIVED

CANCELLED
```

---

# 📥 GOODS RECEIVING

Example:

```text
EXPECTED

50 KG

RECEIVED

48.5 KG

DIFFERENCE

-1.5 KG

REASON

Supplier shortage

[ CONFIRM RECEIPT ]
```

Receiving stock must feed into real inventory records.

---

# ✂️ MODULE 5 — STOCK CONVERSION / CUTTING

Support conversion of products.

Example:

```text
INPUT

Whole Chicken

10 KG

OUTPUT

Drumsticks
2.5 KG

Wings
1.8 KG

Breast
3 KG

Thighs
2 KG

Waste
0.7 KG
```

Display:

```text
INPUT TOTAL

10 KG

OUTPUT

9.3 KG

WASTE

0.7 KG
```

Require validation and approval where configured.

---

# 🔎 MODULE 6 — STOCK TAKING

Create professional stock-taking functionality.

## Start Stock Take

```text
STOCK TAKE

Branch:
Main Branch

Date:
31/10/2026

Assigned Agent:

[ Select ]
```

---

## Stock Take Interface

Agent sees:

```text
DRUMSTICKS

System Expected:

42.5 KG

Actual Count:

[ 41.8 ]

UNIT:

KG
```

System calculates:

```text
VARIANCE

-0.7 KG
```

Then:

```text
REASON

[ Select Reason ]

[ SAVE ]

[ NEXT PRODUCT ]
```

---

# APPROVAL WORKFLOW

```text
DRAFT

↓

IN PROGRESS

↓

SUBMITTED

↓

UNDER REVIEW

↓

APPROVED

OR

REJECTED
```

Stock adjustment must not happen automatically without configured approval.

---

# 👤 MODULE 7 — CUSTOMER MANAGEMENT

Support:

- Walk-in customer
- Registered customer
- Customer name
- Phone number
- Purchase history

POS must make walk-in sales extremely fast.

Default option:

```text
🚶 WALK-IN CUSTOMER
```

Do not force customer registration for every sale.

---

# 💰 MODULE 8 — CASHIER SHIFTS

## Open Shift

```text
OPEN CASHIER SHIFT

Opening Float

KSh [5000]

[ OPEN SHIFT ]
```

---

## Close Shift

Show:

```text
EXPECTED CASH

KSh 25,400

ACTUAL CASH

KSh [25,350]

VARIANCE

-KSh 50

REASON

[____________]

[ SUBMIT CLOSING ]
```

Management should be able to review and approve discrepancies.

---

# 📊 MODULE 9 — OWNER DASHBOARD

Create a premium executive dashboard.

Show:

```text
TODAY'S SALES

KSh 45,600

PROFIT ESTIMATE

KSh 12,300

TRANSACTIONS

124

ITEMS SOLD

352
```

Additional sections:

- Sales trend
- Best-selling products
- Payment method breakdown
- Low-stock products
- Wastage alerts
- Recent sales

Do not use fake numbers in production mode.

---

# 📈 REPORTS

Build report pages for:

## Sales

- Today
- Yesterday
- Week
- Month
- Custom range

## Product Performance

- Quantity sold
- Revenue
- Cost
- Profit

## Inventory

- Opening stock
- Received
- Sold
- Wastage
- Adjustments
- Closing stock

## Payments

- Cash
- STK
- PayBill
- Card
- Split payments

## Wastage

- Product
- Quantity
- Value
- Reason
- User

## Stock Variance

- Expected
- Actual
- Difference
- Approval status

Provide filters and export-ready report layouts.

---

# 👥 USERS & ROLES

Support:

## SUPER ADMIN

Full system access.

## OWNER / MANAGER

- Reports
- Inventory approval
- Pricing
- Refund approvals
- Users where permitted

## CASHIER

- POS
- Assigned shifts
- Receipts
- Allowed returns

## STOREKEEPER

- Inventory
- Receiving
- Transfers

## PROCUREMENT

- Suppliers
- Purchase orders

## STOCK TAKE AGENT

- Assigned stock takes
- Counting
- Submission

Every action should respect permissions.

---

# 📱 MOBILE RESPONSIVENESS — NON-NEGOTIABLE

The application must work perfectly on:

- Desktop
- Laptop
- Tablet
- Android phone
- Touchscreen POS terminal

Rules:

- No horizontal page overflow
- No cut-off buttons
- No hidden totals
- Touch-friendly buttons
- Responsive tables
- Cards where tables become unusable on mobile
- Bottom sheets/modals for mobile forms where appropriate

The POS should feel exceptionally fast on tablets.

---

# 🔌 BACKEND/API INTEGRATION CONTRACT

Build the frontend around a clean API architecture.

Use:

```text
/api/v1/
```

Examples:

```text
GET    /products

POST   /products

GET    /inventory

POST   /sales

GET    /sales/{id}

POST   /sales/{id}/payments

POST   /payments/mpesa/stk

GET    /payments/{id}/status

GET    /paybill/payments

POST   /stock-takes

POST   /stock-takes/{id}/submit

POST   /stock-takes/{id}/approve
```

Do not duplicate backend business logic unnecessarily in the frontend.

The frontend should:

- Call real API endpoints
- Handle loading
- Handle errors
- Handle validation responses
- Refresh/query invalidate correctly
- Handle authentication
- Handle expired sessions

---

# 📱 REAL-TIME PAYMENT STATUS

For STK and PayBill payment status:

The frontend should support:

```text
PAYMENT INITIATED

↓

WAITING

↓

POLL STATUS / REALTIME EVENT

↓

SUCCESS / FAILED / EXPIRED
```

Do not rely on frontend timers to decide that a payment succeeded.

The backend is the source of truth.

---

# 🔐 SECURITY UX

Do not expose:

- M-Pesa secrets
- API secrets
- Passkeys
- Consumer secrets
- Database credentials

to the browser.

Sensitive payment operations must be backend-controlled.

---

# 🧠 UX REQUIREMENTS

The cashier must be able to complete a common sale in as few interactions as possible.

Target flow:

```text
SELECT PRODUCT

↓

SELECT SELLING MODE

↓

ENTER WEIGHT / PIECES / AMOUNT

↓

ADD TO CART

↓

CHECKOUT

↓

PAYMENT

↓

RECEIPT

↓

NEW SALE
```

The UI should prioritize speed over unnecessary data entry.

---

# 🚀 IMPLEMENTATION QUALITY CHECK

Before considering any module complete:

## Check every:

- Button
- Form
- Modal
- Dropdown
- Search field
- Filter
- Pagination
- API request
- Loading state
- Error state
- Empty state
- Mobile layout

Ensure there are no dead controls.

---

# FINAL ACCEPTANCE REQUIREMENT

Do a complete application audit before declaring the system complete.

Verify:

### POS

- [ ] Product selection works
- [ ] KG sales work
- [ ] Gram sales work
- [ ] Piece sales work
- [ ] Customer amount sales work
- [ ] Cart works
- [ ] Totals are accurate

### Payments

- [ ] Cash works
- [ ] STK flow is backend-confirmed
- [ ] PayBill flow is backend-confirmed
- [ ] Split payments calculate correctly
- [ ] Pending payment states work
- [ ] Duplicate confirmations do not duplicate payments

### Inventory

- [ ] Stock receiving works
- [ ] Sales affect inventory correctly
- [ ] Wastage works
- [ ] Stock taking works
- [ ] Variances work

### UX

- [ ] Desktop works
- [ ] Tablet works
- [ ] Mobile works
- [ ] No overflow
- [ ] No broken controls

### DATA

- [ ] No fake production data
- [ ] No fake successful payments
- [ ] No unwired UI actions

---

# FINAL INSTRUCTION

Build **BrathaMatu Kuku POS** as a premium, real business system.

The experience should feel:

**FAST.**

**PREMIUM.**

**SIMPLE FOR CASHIERS.**

**POWERFUL FOR MANAGEMENT.**

The complexity of chicken stock, kilograms, grams, pieces, customer budgets, suppliers, stock-taking and split payments must be handled by the system — not forced onto the cashier.

The POS must allow a real customer interaction such as:

> “Nina KSh 300, nipatie drumsticks.”

and complete the entire workflow quickly:

```text
SELECT DRUMSTICKS

↓

SELL BY AMOUNT

↓

ENTER KSh 300

↓

SYSTEM CALCULATES APPROXIMATE GRAMS

↓

CONFIRM ACTUAL WEIGHT

↓

ADD TO CART

↓

CUSTOMER PAYS

↓

CASH / STK / PAYBILL / SPLIT

↓

BACKEND CONFIRMS PAYMENT

↓

SALE COMPLETES

↓

INVENTORY IS UPDATED

↓

RECEIPT GENERATED
```

Do not stop at UI design.

Build every module as a connected working system and continuously audit the application for gaps, broken workflows, unwired buttons and inconsistent data.

**DO NOT DECLARE THE PROJECT COMPLETE UNTIL THE END-TO-END FLOWS WORK.**# 🐔 BRATHAMATU KUKU POS
# FULL WORKING DEMO + LARAVEL API BACKEND

## CRITICAL IMPLEMENTATION INSTRUCTION

Extend the BrathaMatu Kuku POS into a **fully working end-to-end application** with two clearly separated operating modes:

### MODE A — FULL DEMO MODE

A complete demonstration environment where every workflow can be tested safely.

### MODE B — REAL BACKEND MODE

A production-ready frontend connected to a real:

```text
Laravel 13 API
PHP 8.4
MariaDB/MySQL
Redis
Queues
Jobs
Events
Listeners
```

The architecture must allow switching between demo data adapters and the Laravel API **without rebuilding the UI**.

---

# 🏗️ REQUIRED ARCHITECTURE

```text
                    BRATHAMATU POS
                           │
                           ▼
                    REACT + TYPESCRIPT
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
         DEMO API MODE             LARAVEL API MODE
              │                         │
              ▼                         ▼
       Local Demo Repository       Laravel 13 Backend
                                        │
                           ┌────────────┼────────────┐
                           ▼            ▼            ▼
                        MariaDB       Redis       Queues
                           │
                           ▼
                    PAYMENT SERVICES
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
             CASH        M-PESA       PAYBILL
                         STK PUSH
```

---

# 🚨 DEMO MODE RULES

Demo mode must be clearly identified as:

```text
🟡 DEMO MODE
```

The system must never pretend that a demo payment is a real M-Pesa transaction.

Every demo payment must display:

```text
DEMO TRANSACTION

NOT A REAL PAYMENT
```

Demo mode exists so the entire business workflow can be tested.

---

# 🎯 DEMO MODE MUST BE FULLY FUNCTIONAL

Do not create static screenshots.

Every module must actually work.

The demo must include:

- Login
- Roles
- Dashboard
- Products
- Categories
- POS
- Weight sales
- Gram sales
- Piece sales
- Customer budget sales
- Cart
- Checkout
- Cash
- Demo STK
- Demo PayBill
- Split payments
- Receipts
- Suppliers
- Purchase orders
- Goods receiving
- Inventory
- Wastage
- Stock transfers
- Stock taking
- Stock adjustments
- Cashier shifts
- Reports
- Users and permissions

---

# 👤 DEMO ACCOUNTS

Create clearly documented demo accounts.

Example:

```text
SUPER ADMIN

Email:
admin@brathamatu.demo

Role:
Super Admin
```

```text
MANAGER

Email:
manager@brathamatu.demo

Role:
Manager
```

```text
CASHIER

Email:
cashier@brathamatu.demo

Role:
Cashier
```

```text
STOREKEEPER

Email:
store@brathamatu.demo

Role:
Storekeeper
```

Passwords should be configurable and documented for local/demo use.

---

# 📦 DEMO DATA

Create realistic BrathaMatu poultry inventory.

## PRODUCTS

Examples:

### 🐔 Whole Chicken

```text
Stock:
120 KG

Price:
KSh 420 / KG
```

### 🍗 Drumsticks

```text
Stock:
65 KG

Sell By:

✓ KG
✓ Gram
✓ Piece
✓ Customer Amount

Price Per KG:
KSh 450

Price Per Piece:
KSh 80
```

### 🫀 Liver

```text
Stock:
18 KG

Sell By:

✓ KG
✓ Gram
✓ Customer Amount

Price:
KSh 600 / KG
```

### 🍗 Wings

```text
Stock:
40 KG

Price:
KSh 400 / KG
```

### 🫀 Gizzards

```text
Stock:
25 KG

Price:
KSh 550 / KG
```

The data must be editable.

---

# ⚖️ DEMO POS MUST ACTUALLY CALCULATE

## Example — Sell by Weight

Cashier enters:

```text
500 grams
```

Product:

```text
Drumsticks
KSh 450 / KG
```

System calculates:

```text
0.5 KG × 450

=

KSh 225
```

---

# 💰 DEMO SELL BY AMOUNT

Customer says:

```text
Nipe drumsticks ya KSh 300
```

System:

```text
Price:
KSh 450/KG

Calculation:

300 ÷ 450

=

0.666 KG

=

666 grams
```

Allow final weight adjustment.

The final actual quantity must reduce demo inventory.

---

# 🍗 DEMO SELL BY PIECE

Example:

```text
Drumstick

KSh 80 / Piece

Quantity:

3
```

Total:

```text
KSh 240
```

The demo inventory engine must record the transaction.

---

# 🔀 DEMO SPLIT PAYMENT

Example:

```text
SALE TOTAL

KSh 2,500
```

Cash:

```text
KSh 500
```

Demo STK:

```text
KSh 1,500
```

Demo PayBill:

```text
KSh 500
```

System displays:

```text
TOTAL PAID

KSh 2,500

BALANCE

KSh 0
```

Then completes the demo sale.

Every payment record should have:

```text
Method
Amount
Status
Reference
Timestamp
Demo Flag
```

---

# 📱 DEMO M-PESA STK

Demo STK must simulate the **workflow**, but never pretend to be Safaricom.

Flow:

```text
SEND DEMO STK REQUEST

↓

PENDING

↓

PROCESSING

↓

DEMO PAYMENT APPROVED / FAILED
```

Allow testing:

- Success
- Failure
- Timeout
- Cancelled
- Duplicate callback simulation

Use this to test frontend payment states and backend idempotency.

---

# 🏦 DEMO PAYBILL

Allow a demo payment lifecycle:

```text
WAITING FOR PAYBILL PAYMENT

↓

PENDING

↓

PAYMENT RECEIVED

OR

↓

EXPIRED
```

Again clearly label:

```text
DEMO ONLY — NOT A REAL PAYMENT
```

---

# 🧠 DEMO INVENTORY ENGINE

Demo mode must maintain a real application inventory state.

Example:

```text
OPENING STOCK

Drumsticks

65 KG
```

Sale:

```text
500g
```

New stock:

```text
64.5 KG
```

The demo must support:

```text
PURCHASE RECEIPT
+ STOCK

SALE
- STOCK

RETURN
+ STOCK

WASTAGE
- STOCK

TRANSFER
- SOURCE
+ DESTINATION

STOCK ADJUSTMENT
+ / -

CONVERSION
INPUT -
OUTPUT +
```

Do not simply change numbers visually.

Record inventory movements.

---

# 🧾 DEMO RECEIPTS

Every completed demo sale should generate a receipt.

Example:

```text
BRATHAMATU

DEMO RECEIPT

Receipt:
BRM-DEMO-000001

Drumsticks

500g

KSh 225

────────────────

TOTAL

KSh 225

PAYMENT

DEMO CASH

KSh 225

────────────────

DEMO TRANSACTION
NOT A REAL PAYMENT
```

---

# 🔄 DEMO RESET SYSTEM

Create a safe demo reset.

Only Super Admin can access it.

```text
RESET DEMO DATA
```

Before reset:

```text
⚠ WARNING

This will restore:

Products
Inventory
Sales
Payments
Stock Takes
Reports

to the original demo state.
```

Require confirmation.

---

# 🚀 REAL BACKEND MODE

Build the Laravel backend as a proper production API.

## STACK

```text
Laravel 13

PHP 8.4

MariaDB / MySQL

Redis

Laravel Queue

Laravel Jobs

Events

Listeners

Scheduler
```

---

# 📁 BACKEND STRUCTURE

Use a clean modular architecture.

```text
app/

├── Http/
│   ├── Controllers/
│   │   └── Api/
│   │       └── V1/
│   │
│   ├── Requests/
│   │
│   └── Resources/
│
├── Models/
│
├── Services/
│
├── Actions/
│
├── Jobs/
│
├── Events/
│
├── Listeners/
│
├── Policies/
│
└── Enums/
```

---

# 🔌 API VERSIONING

All application APIs must use:

```text
/api/v1/
```

Examples:

```text
/api/v1/auth

/api/v1/products

/api/v1/categories

/api/v1/inventory

/api/v1/sales

/api/v1/payments

/api/v1/suppliers

/api/v1/purchase-orders

/api/v1/goods-receipts

/api/v1/stock-takes

/api/v1/reports
```

---

# 🗃️ CORE DATABASE TABLES

## ORGANIZATION

```text
businesses

branches

users

roles

permissions
```

---

# PRODUCTS

```text
categories

products

product_units

product_selling_modes

product_prices
```

---

# INVENTORY

```text
inventory_batches

inventory_balances

inventory_movements

inventory_reservations

stock_transfers

stock_transfer_items

wastage_records

stock_adjustments
```

---

# PURCHASING

```text
suppliers

purchase_orders

purchase_order_items

goods_receipts

goods_receipt_items
```

---

# SALES

```text
customers

sales

sale_items

sale_status_histories
```

---

# PAYMENTS

```text
payments

payment_attempts

payment_transactions

payment_status_histories

payment_webhooks
```

---

# CASHIER

```text
cashier_shifts

cash_movements
```

---

# STOCK TAKING

```text
stock_take_sessions

stock_take_items

stock_take_variances

stock_take_approvals
```

---

# AUDITING

```text
audit_logs
```

---

# 🔐 AUTHENTICATION

Implement secure authentication.

Support:

```text
Login

Logout

Current User

Role Permissions

Password Security
```

Use a suitable Laravel API authentication strategy consistently.

Do not expose sensitive data.

---

# ⚖️ INVENTORY SERVICE — CRITICAL

Create a dedicated:

```text
InventoryService
```

No controller should directly manipulate stock totals.

All inventory changes must go through a controlled inventory service.

Example operations:

```text
receiveStock()

reserveStock()

releaseReservation()

commitSale()

returnStock()

recordWastage()

transferStock()

adjustStock()

convertStock()
```

---

# 🔒 INVENTORY TRANSACTION RULE

Every inventory operation must use database transactions.

Example:

```text
DB TRANSACTION

↓

Validate Stock

↓

Lock Relevant Records

↓

Create Inventory Movement

↓

Update Inventory Balance

↓

Create Audit Log

↓

COMMIT
```

If anything fails:

```text
ROLLBACK
```

---

# 🧾 INVENTORY MOVEMENTS

Every stock change must create an immutable movement.

```text
Movement ID

Product

Branch

Batch

Type

Quantity Before

Quantity Change

Quantity After

Reference

User

Timestamp
```

Types:

```text
PURCHASE_RECEIVED

SALE

SALE_RETURN

TRANSFER_OUT

TRANSFER_IN

WASTAGE

ADJUSTMENT

CONVERSION_INPUT

CONVERSION_OUTPUT
```

---

# 💳 SALES LIFECYCLE

Use a proper state machine.

```text
DRAFT

↓

PENDING_PAYMENT

↓

PARTIALLY_PAID

↓

PAID

↓

COMPLETED
```

Alternative outcomes:

```text
CANCELLED

EXPIRED

REFUNDED
```

---

# 💰 SPLIT PAYMENT BACKEND

One sale can have many payment records.

Example:

```text
SALE

KSh 2,500
```

Payments:

```text
PAYMENT 1

Cash

KSh 500

SUCCESS
```

```text
PAYMENT 2

M-Pesa STK

KSh 1,500

SUCCESS
```

```text
PAYMENT 3

PayBill

KSh 500

SUCCESS
```

The backend calculates:

```text
SUM(SUCCESSFUL PAYMENTS)

=

SALE TOTAL
```

Only then:

```text
SALE → PAID
```

---

# 📱 REAL M-PESA STK PUSH

Create a payment provider abstraction.

Example:

```text
PaymentProviderInterface
```

Implementation:

```text
MpesaProvider
```

Required flow:

```text
CREATE PAYMENT

↓

PENDING

↓

CREATE PAYMENT ATTEMPT

↓

CALL SAFARICOM API

↓

STORE PROVIDER REQUEST ID

↓

WAIT FOR CALLBACK

↓

VERIFY CALLBACK

↓

UPDATE PAYMENT STATUS

↓

COMPLETE SALE IF PAID
```

---

# 🚨 STK SECURITY REQUIREMENTS

Implement:

- Phone normalization
- Amount validation
- Unique references
- Idempotency keys
- Callback validation
- Duplicate callback protection
- Provider transaction ID uniqueness
- Audit logging
- Secure credential storage

Never trust the frontend for payment confirmation.

---

# 🏦 PAYBILL BACKEND

Support incoming PayBill payments.

Each pending sale should have a unique payment reference.

Example:

```text
BRM-SALE-00000125
```

Flow:

```text
SALE CREATED

↓

PAYBILL PAYMENT EXPECTED

↓

CALLBACK RECEIVED

↓

PAYMENT MATCHED

↓

PAYMENT CONFIRMED

↓

SALE COMPLETED
```

Unmatched transactions must go to:

```text
PAYMENT RECONCILIATION QUEUE
```

Do not automatically attach uncertain payments.

---

# 🔁 PAYMENT IDEMPOTENCY

This is mandatory.

Duplicate:

```text
STK CALLBACK
```

must not:

```text
Duplicate Payment

Duplicate Sale

Duplicate Inventory Movement

Duplicate Receipt
```

Use:

- Unique provider references
- Database constraints
- Idempotency checks
- Transactions
- Row locking where appropriate

---

# 📦 CUSTOMER AMOUNT CALCULATION API

Example endpoint:

```text
POST

/api/v1/products/{product}/calculate-by-amount
```

Input:

```text
Amount:
300

Selling Mode:
amount
```

Response:

```text
Price Per KG:
450

Calculated KG:
0.666666

Calculated Grams:
666.666

Estimated Total:
300
```

The final sale must store actual confirmed quantity.

---

# ⚡ QUEUES AND JOBS

Use Redis queues where appropriate.

Jobs can include:

```text
ProcessPaymentCallback

ReconcilePendingPayments

ExpirePendingPayments

GenerateReceipt

SendLowStockAlert

GenerateReport

ProcessStockTakeApproval
```

---

# 📅 SCHEDULED TASKS

Create scheduled jobs for:

```text
Pending STK Reconciliation

Expired Payment Cleanup

Low Stock Monitoring

Daily Reports

Cashier Shift Checks
```

Do not use scheduled jobs to fake successful payments.

---

# 📡 EVENTS & LISTENERS

Examples:

```text
PaymentConfirmed

↓

CompleteSale
```

```text
SaleCompleted

↓

CommitInventory
```

```text
StockBelowReorderLevel

↓

NotifyManagement
```

```text
StockTakeApproved

↓

CreateStockAdjustment
```

Use events where they improve separation of responsibilities.

---

# 🔐 API SECURITY

Implement:

- Authentication middleware
- Authorization policies
- Role permissions
- Request validation
- Rate limiting where appropriate
- No secrets in API responses
- Correct CORS configuration
- Secure production environment configuration

---

# 🧪 DEMO + REAL BACKEND SWITCHING

The frontend must support:

```text
VITE_APP_MODE=demo
```

and:

```text
VITE_APP_MODE=api
```

Demo mode:

```text
React Data Adapter

↓

Demo Repository
```

API mode:

```text
React Data Adapter

↓

Laravel API Client
```

The UI must consume consistent interfaces.

Example:

```text
ProductRepository
```

Implementations:

```text
DemoProductRepository

LaravelProductRepository
```

Same concept for:

```text
Sales

Payments

Inventory

Suppliers

Reports
```

This prevents the application from having two completely different frontends.

---

# 🧪 REQUIRED TESTING

Laravel must include automated tests for critical workflows.

## POS

- Product sale by KG
- Product sale by grams
- Product sale by piece
- Customer amount calculation

## Inventory

- Purchase increases stock
- Sale decreases stock
- Wastage decreases stock
- Transfer updates branches correctly
- Negative stock prevented

## Payments

- Cash payment
- STK pending
- STK success
- STK failure
- PayBill matching
- Split payment
- Duplicate callback protection

## Stock Taking

- Variance calculation
- Submission
- Approval
- Adjustment

---

# 🔎 FINAL API AUDIT

Before declaring the backend complete:

Create and maintain:

```text
API_CONTRACT_MATRIX.md
```

Include:

```text
Frontend Screen

↓

Frontend Action

↓

API Endpoint

↓

Controller

↓

Request Validation

↓

Service/Action

↓

Database Tables

↓

Response

↓

Tests
```

Every frontend button that requires data must have a verified backend path.

---

# 🏁 FINAL ACCEPTANCE CRITERIA

The system is only considered complete when this works:

## EXAMPLE END-TO-END SALE

Customer:

> “Nipe drumsticks ya KSh 300.”

Cashier:

```text
Select Drumsticks

↓

Sell By Amount

↓

Enter KSh 300

↓

System calculates grams

↓

Cashier confirms actual weight

↓

Add to Cart

↓

Checkout
```

Customer pays:

```text
KSh 100 Cash

+

KSh 200 M-Pesa STK
```

System:

```text
Cash recorded

↓

STK initiated

↓

Backend waits for confirmation

↓

Payment confirmed

↓

Sale marked paid

↓

Inventory movement created

↓

Stock reduced

↓

Receipt generated

↓

Audit log created
```

Then management dashboard and reports must reflect the transaction.

---

# FINAL COMMAND

Build this system as a **real BrathaMatu business platform**.

There must be two clearly defined modes:

## 🟡 DEMO MODE

Fully functional.

Safe.

Testable.

Clearly marked as demo.

Never pretending to process real money.

## 🟢 LIVE API MODE

Connected to:

```text
Laravel 13 API
PHP 8.4
MariaDB
Redis
Queues
Real Payment Providers
```

Every important business action must have:

```text
Validation

↓

Authorization

↓

Database Transaction

↓

Auditability

↓

Error Handling
```

Do not declare anything “working” based only on UI appearance.

Verify every critical workflow end-to-end.

**THE FINAL PRODUCT MUST BE A REAL POS SYSTEM, NOT A BEAUTIFUL DEMO WITH DEAD BUTTONS.**

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/049f3c03-bbd3-42ac-a64d-3a61afcd79f6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

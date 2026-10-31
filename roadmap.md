# Roadmap — BrathaMatu Kuku POS

## Decisions (from user)
- Mode A (Demo) first: fully functional, clearly labelled 🟡 DEMO MODE.
- Mode B: Laravel 13 / PHP 8.4 backend delivered as downloadable source (API_CONTRACT_MATRIX.md included). Cannot run in Lovable preview.
- User profiles: yes (name, phone, role).
- M-Pesa: demo-only simulation for now (Daraja integration is scaffolded in Laravel source but not live).

## Tasks
- [x] Clarify scope (backend, mode priority, profiles, M-Pesa)
- [ ] Design system + app shell (sidebar, demo badge, role gating)
- [ ] Demo data layer: types, seed, engine (inventory ledger, sales, payments), demo auth
- [ ] POS module: categories, product grid, selling modes (weight/piece/amount), cart
- [ ] Checkout: cash, demo STK, demo PayBill, card, split payments, progress, receipts
- [ ] POS sub-views: suspended sales, returns, receipts
- [ ] Products module (products, categories, selling modes, pricing)
- [ ] Inventory module (overview, movements, transfers, wastage, adjustments, conversions)
- [ ] Purchasing (suppliers, purchase orders, goods receiving)
- [ ] Stock taking (sessions, counting, variances, approval workflow)
- [ ] Customers, Payments (transactions, reconciliation), Cashier shifts
- [ ] Reports (sales, products, inventory, payments, wastage, profit, variance)
- [ ] Users & Roles, Branches, Settings (incl. demo reset)
- [ ] Dashboard (owner KPIs from real demo data)
- [ ] Playwright end-to-end audit (POS flow, payments, inventory effects)
- [ ] Laravel backend source + tests + API_CONTRACT_MATRIX.md → deliverable ZIP

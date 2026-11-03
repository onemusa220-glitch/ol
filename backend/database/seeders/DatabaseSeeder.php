<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Customer;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Ulid\Ulid;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Owner', 'email' => 'owner@brathamatu.test', 'role' => 'super_admin', 'phone' => '0711000001'],
            ['name' => 'Manager Wanjiku', 'email' => 'manager@brathamatu.test', 'role' => 'manager', 'phone' => '0711000002'],
            ['name' => 'Cashier Kamau', 'email' => 'cashier@brathamatu.test', 'role' => 'cashier', 'phone' => '0711000003'],
            ['name' => 'Storekeeper Otieno', 'email' => 'store@brathamatu.test', 'role' => 'storekeeper', 'phone' => '0711000004'],
            ['name' => 'Procurement Achieng', 'email' => 'procurement@brathamatu.test', 'role' => 'procurement', 'phone' => '0711000005'],
        ];

        foreach ($users as $u) {
            User::create([
                'id' => (string) Ulid::generate(),
                'name' => $u['name'],
                'email' => $u['email'],
                'phone' => $u['phone'],
                'role' => $u['role'],
                'password' => Hash::make('password'),
                'active' => true,
            ]);
        }

        $branch = Branch::create([
            'id' => (string) Ulid::generate(),
            'name' => 'Thika Road',
            'location' => 'Thika Rd, Nairobi',
        ]);

        $categories = [
            ['name' => 'Whole Chicken', 'emoji' => '🐔'],
            ['name' => 'Parts', 'emoji' => '🍗'],
            ['name' => 'Offal', 'emoji' => '🫀'],
            ['name' => 'Marinated', 'emoji' => '🌶️'],
            ['name' => 'Eggs', 'emoji' => '🥚'],
        ];
        $catIds = [];
        foreach ($categories as $c) {
            $cat = Category::create(['id' => (string) Ulid::generate(), ...$c]);
            $catIds[$c['name']] = $cat->id;
        }

        $products = [
            ['name' => 'Whole Chicken (Live)', 'sku' => 'CH-WHOLE', 'cat' => 'Whole Chicken', 'emoji' => '🐔', 'base' => 'KG', 'modes' => ['weight'], 'priceKg' => 450, 'costKg' => 380, 'reorder' => 20],
            ['name' => 'Whole Chicken (Dressed)', 'sku' => 'CH-DRSD', 'cat' => 'Whole Chicken', 'emoji' => '🍗', 'base' => 'KG', 'modes' => ['weight', 'piece'], 'priceKg' => 520, 'pricePc' => 450, 'pieceWt' => 1.2, 'costKg' => 440, 'reorder' => 15],
            ['name' => 'Chicken Breast', 'sku' => 'PT-BRST', 'cat' => 'Parts', 'emoji' => '🍗', 'base' => 'KG', 'modes' => ['weight'], 'priceKg' => 680, 'costKg' => 560, 'reorder' => 10],
            ['name' => 'Chicken Drumsticks', 'sku' => 'PT-DRM', 'cat' => 'Parts', 'emoji' => '🍗', 'base' => 'KG', 'modes' => ['weight', 'piece'], 'priceKg' => 580, 'pricePc' => 120, 'pieceWt' => 0.25, 'costKg' => 480, 'reorder' => 15],
            ['name' => 'Chicken Wings', 'sku' => 'PT-WNG', 'cat' => 'Parts', 'emoji' => '🍗', 'base' => 'KG', 'modes' => ['weight'], 'priceKg' => 600, 'costKg' => 500, 'reorder' => 12],
            ['name' => 'Chicken Liver', 'sku' => 'OF-LVR', 'cat' => 'Offal', 'emoji' => '🫀', 'base' => 'KG', 'modes' => ['weight'], 'priceKg' => 350, 'costKg' => 260, 'reorder' => 8],
            ['name' => 'Chicken Gizzards', 'sku' => 'OF-GZD', 'cat' => 'Offal', 'emoji' => '🫀', 'base' => 'KG', 'modes' => ['weight'], 'priceKg' => 420, 'costKg' => 320, 'reorder' => 8],
            ['name' => 'Peri-Peri Marinated', 'sku' => 'MR-PPR', 'cat' => 'Marinated', 'emoji' => '🌶️', 'base' => 'KG', 'modes' => ['weight', 'amount'], 'priceKg' => 750, 'costKg' => 620, 'reorder' => 10],
            ['name' => 'Tray Eggs (30)', 'sku' => 'EG-TRAY', 'cat' => 'Eggs', 'emoji' => '🥚', 'base' => 'PIECE', 'modes' => ['piece'], 'pricePc' => 600, 'costPc' => 520, 'reorder' => 20],
        ];

        foreach ($products as $p) {
            $prod = Product::create([
                'id' => (string) Ulid::generate(),
                'name' => $p['name'],
                'sku' => $p['sku'],
                'category_id' => $catIds[$p['cat']],
                'emoji' => $p['emoji'],
                'base_unit' => $p['base'],
                'selling_modes' => $p['modes'],
                'price_per_kg' => $p['priceKg'] ?? null,
                'price_per_piece' => $p['pricePc'] ?? null,
                'piece_weight_kg' => $p['pieceWt'] ?? null,
                'cost_per_kg' => $p['costKg'] ?? null,
                'cost_per_piece' => $p['costPc'] ?? null,
                'reorder_level' => $p['reorder'],
                'active' => true,
            ]);

            $startQty = match ($p['base']) {
                'KG' => rand(15, 60),
                default => rand(20, 80),
            };

            InventoryBalance::create([
                'product_id' => $prod->id,
                'branch_id' => $branch->id,
                'qty' => $startQty,
            ]);
        }

        Customer::create([
            'id' => (string) Ulid::generate(),
            'name' => 'Walk-in Customer',
            'phone' => '',
        ]);

        Setting::set('business_name', 'BrathaMatu');
        Setting::set('paybill_number', '174379');
        Setting::set('stk_auto_approve_seconds', null);
        Setting::set('counter.SALE', 0);
        Setting::set('counter.paybillRef', 0);
        Setting::set('counter.gr', 0);
        Setting::set('counter.po', 0);
        Setting::set('counter.transfer', 0);
        Setting::set('counter.adjustment', 0);
        Setting::set('counter.conversion', 0);
        Setting::set('counter.wastage', 1000);
        Setting::set('counter.return', 0);
    }
}

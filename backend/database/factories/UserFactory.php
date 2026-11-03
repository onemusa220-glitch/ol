<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Ulid\Ulid;

class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => (string) Ulid::generate(),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '07'.fake()->numerify('########'),
            'role' => 'cashier',
            'password' => bcrypt('password'),
            'active' => true,
        ];
    }
}

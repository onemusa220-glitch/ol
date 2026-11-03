<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['name' => 'BrathaMatu API', 'version' => '1.0'];
});

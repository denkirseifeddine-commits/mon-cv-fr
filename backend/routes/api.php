<?php

use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\QuoteController;
use App\Http\Controllers\Api\V1\SolutionController;
use Illuminate\Support\Facades\Route;

// API publique v1 (docs/API-CONTRACT.md). POST /recommendations : lot ultérieur.
Route::prefix('v1')->group(function () {
    Route::middleware('cache.headers:public;max_age=60')->group(function () {
        Route::get('solutions', [SolutionController::class, 'index']);
        Route::get('solutions/{slug}', [SolutionController::class, 'show']);
        Route::get('solution-categories', [CategoryController::class, 'index']);
        Route::get('portfolio-projects', [ProjectController::class, 'index']);
        Route::get('portfolio-projects/{slug}', [ProjectController::class, 'show']);
    });

    // Ordre : origine, type et taille du corps, puis limitation de débit
    Route::post('quotes', [QuoteController::class, 'store'])->middleware(['quote.guard', 'throttle:quotes']);
});

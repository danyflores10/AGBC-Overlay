<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OverlayController;

// Página principal redirige al panel de control
Route::get('/', function () {
    return redirect('/control');
});

// Vista del overlay para OBS Browser Source
Route::get('/overlay', [OverlayController::class, 'overlay'])->name('overlay');

// Panel de control
Route::get('/control', [OverlayController::class, 'control'])->name('control');

// API para configuración
Route::prefix('api')->group(function () {
    Route::get('/config', [OverlayController::class, 'getConfig']);
    Route::post('/config', [OverlayController::class, 'updateConfig']);
    Route::post('/config/reset', [OverlayController::class, 'resetConfig']);
    Route::post('/slides/upload', [OverlayController::class, 'uploadSlide']);
    Route::delete('/slides/{filename}', [OverlayController::class, 'deleteSlide']);
    Route::get('/slides', [OverlayController::class, 'listSlides']);
});

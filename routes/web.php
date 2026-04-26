<?php

use App\Http\Controllers\DatasetController;
use App\Http\Controllers\Teams\TeamInvitationController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

// InsightFlow - Data Cleaning & Analytics (no auth required)
Route::get('/', [DatasetController::class, 'index'])->name('datasets.index');
Route::post('/datasets/upload', [DatasetController::class, 'upload'])->name('datasets.upload');
Route::get('/datasets/{dataset}', [DatasetController::class, 'show'])->name('datasets.show');
Route::delete('/datasets/{dataset}', [DatasetController::class, 'destroy'])->name('datasets.destroy');
Route::post('/datasets/{dataset}/relationships', [DatasetController::class, 'addRelationship'])->name('datasets.add-relationship');
Route::delete('/datasets/{dataset}/relationships/{related}', [DatasetController::class, 'removeRelationship'])->name('datasets.remove-relationship');
Route::get('/datasets/{dataset}/profile', [DatasetController::class, 'profile'])->name('datasets.profile');
Route::get('/datasets/{dataset}/clean', [DatasetController::class, 'clean'])->name('datasets.clean');
Route::post('/datasets/{dataset}/clean', [DatasetController::class, 'applyClean'])->name('datasets.apply-clean');
Route::post('/datasets/{dataset}/auto-clean', [DatasetController::class, 'autoClean'])->name('datasets.auto-clean');
Route::get('/datasets/{dataset}/compare', [DatasetController::class, 'compare'])->name('datasets.compare');
Route::get('/datasets/{dataset}/analyze', [DatasetController::class, 'analyze'])->name('datasets.analyze');
Route::get('/datasets/{dataset}/visualize', [DatasetController::class, 'visualize'])->name('datasets.visualize');
Route::get('/datasets/{dataset}/export/{format}', [DatasetController::class, 'export'])->name('datasets.export')->where('format', 'csv|xlsx');
Route::get('/datasets/merge/tool', [DatasetController::class, 'merge'])->name('datasets.merge');
Route::post('/datasets/merge/tool', [DatasetController::class, 'executeMerge'])->name('datasets.execute-merge');

Route::inertia('/welcome', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
});

require __DIR__.'/settings.php';

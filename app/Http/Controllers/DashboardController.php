<?php

namespace App\Http\Controllers;

use App\Models\Dataset;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $datasets = Dataset::latest()
            ->take(6)
            ->get(['id', 'name', 'row_count', 'column_count', 'file_type', 'created_at']);

        $totalDatasets = Dataset::count();
        $totalRows = (int) Dataset::sum('row_count');

        return Inertia::render('dashboard', [
            'datasets' => $datasets,
            'totalDatasets' => $totalDatasets,
            'totalRows' => $totalRows,
        ]);
    }
}

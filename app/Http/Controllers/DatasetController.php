<?php

namespace App\Http\Controllers;

use App\Imports\DatasetImport;
use App\Models\Dataset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\File;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DatasetController extends Controller
{
    public function index(Request $request): Response
    {
        $page = (int) $request->query('page', 1);
        $perPage = 10;
        $datasets = Dataset::latest()->paginate($perPage, ['id', 'name', 'original_filename', 'file_type', 'row_count', 'column_count', 'created_at']);

        return Inertia::render('datasets/upload', [
            'datasets' => $datasets,
        ]);
    }

    public function upload(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', File::types(['csv', 'xlsx', 'xls'])->max(10 * 1024)],
            'name' => ['required', 'string', 'max:255'],
        ]);

        $file = $request->file('file');
        $path = $file->store('datasets', 'local');
        $extension = strtolower($file->getClientOriginalExtension());

        $import = new DatasetImport;

        try {
            Excel::import($import, $file);
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'Failed to read the file. Please ensure it is a valid CSV or Excel file.']);
        }

        $data = $import->data;
        $headers = $import->headers;

        if (empty($headers) || empty($data)) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'The file appears to be empty or has no valid data.']);
        }

        $profile = $this->generateProfile($headers, $data);

        $dataset = Dataset::create([
            'name' => $request->input('name'),
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $extension,
            'row_count' => count($data),
            'column_count' => count($headers),
            'headers' => $headers,
            'original_data' => $data,
            'cleaned_data' => null,
            'cleaning_log' => null,
            'profile' => $profile,
        ]);

        return redirect()->route('datasets.show', $dataset)
            ->with('toast', ['type' => 'success', 'message' => 'Dataset uploaded successfully.']);
    }

    public function show(Dataset $dataset, Request $request): Response
    {
        $page = (int) $request->query('page', 1);
        $perPage = 10;
        $datasets = Dataset::latest()->paginate($perPage, ['id', 'name', 'original_filename', 'file_type', 'row_count', 'column_count', 'created_at']);

        // Paginate the data preview
        $allData = $dataset->original_data;
        $dataPage = (int) $request->query('data_page', 1);
        $dataPerPage = 50;
        $totalDataRows = count($allData);
        $pagedData = array_slice($allData, ($dataPage - 1) * $dataPerPage, $dataPerPage);

        $datasetForView = $dataset->toArray();
        $datasetForView['original_data'] = $pagedData;
        $datasetForView['data_pagination'] = [
            'current_page' => $dataPage,
            'per_page' => $dataPerPage,
            'total' => $totalDataRows,
            'last_page' => (int) ceil($totalDataRows / $dataPerPage),
        ];

        return Inertia::render('datasets/upload', [
            'datasets' => $datasets,
            'dataset' => $datasetForView,
        ]);
    }

    public function destroy(Dataset $dataset): RedirectResponse
    {
        $dataset->delete();

        return redirect()->route('datasets.index')
            ->with('toast', ['type' => 'success', 'message' => 'Dataset deleted.']);
    }

    public function profile(Dataset $dataset): Response
    {
        return Inertia::render('datasets/profile', [
            'dataset' => $dataset,
        ]);
    }

    public function clean(Dataset $dataset): Response
    {
        return Inertia::render('datasets/clean', [
            'dataset' => $dataset,
        ]);
    }

    public function applyClean(Request $request, Dataset $dataset): RedirectResponse
    {
        $request->validate([
            'operations' => ['required', 'array'],
            'operations.*.type' => ['required', 'string'],
        ]);

        $data = $dataset->original_data;
        $headers = $dataset->headers;
        $log = [];

        foreach ($request->input('operations') as $operation) {
            $result = match ($operation['type']) {
                'remove_duplicates' => $this->removeDuplicates($data, $log),
                'remove_missing_rows' => $this->removeMissingRows($data, $operation['column'] ?? null, $log),
                'fill_missing' => $this->fillMissing($data, $operation['column'] ?? null, $operation['value'] ?? '', $log),
                'convert_type' => $this->convertType($data, $operation['column'] ?? null, $operation['target_type'] ?? 'string', $log),
                'trim_spaces' => $this->trimSpaces($data, $operation['column'] ?? null, $log),
                'capitalize' => $this->capitalize($data, $operation['column'] ?? null, $operation['format'] ?? 'ucfirst', $log),
                'filter_invalid' => $this->filterInvalid($data, $operation['column'] ?? null, $operation['rule'] ?? 'not_empty', $log),
                default => ['data' => $data, 'log' => $log],
            };

            $data = $result['data'];
            $log = $result['log'];
        }

        $profile = $this->generateProfile($headers, $data);

        $dataset->update([
            'cleaned_data' => array_values($data),
            'cleaning_log' => $log,
            'profile' => $profile,
            'row_count' => count($data),
            'column_count' => count($headers),
        ]);

        return redirect()->route('datasets.compare', $dataset)
            ->with('toast', ['type' => 'success', 'message' => 'Data cleaned successfully.']);
    }

    public function autoClean(Dataset $dataset): RedirectResponse
    {
        $data = $dataset->original_data;
        $headers = $dataset->headers;
        $log = [];
        $summary = [
            'missing_values_handled' => 0,
            'duplicates_removed' => 0,
            'rows_affected' => 0,
            'columns_modified' => [],
            'transformations' => [],
        ];

        $originalRowCount = count($data);

        // Step 1: Data Inspection
        $totalMissing = 0;
        $columnTypes = [];
        foreach ($headers as $header) {
            $values = array_column($data, $header);
            $nonNull = array_filter($values, fn ($v) => $v !== null && $v !== '');
            $totalMissing += count($values) - count($nonNull);
            $columnTypes[$header] = $this->detectType($nonNull);
        }
        $log[] = ['type' => 'inspection', 'message' => "Inspected {$originalRowCount} rows, ".count($headers)." columns. Found {$totalMissing} total missing values."];
        $summary['transformations'][] = 'Data inspection completed';

        // Step 2: Remove rows with >50% missing values
        $beforeCount = count($data);
        $threshold = count($headers) * 0.5;
        $data = array_filter($data, function ($row) use ($headers, $threshold) {
            $missingCount = 0;
            foreach ($headers as $header) {
                if (! isset($row[$header]) || $row[$header] === '' || $row[$header] === null) {
                    $missingCount++;
                }
            }

            return $missingCount <= $threshold;
        });
        $data = array_values($data);
        $removedHighMissing = $beforeCount - count($data);
        if ($removedHighMissing > 0) {
            $log[] = ['type' => 'remove_missing_rows', 'message' => "Removed {$removedHighMissing} rows with >50% missing values."];
            $summary['rows_affected'] += $removedHighMissing;
            $summary['transformations'][] = "Removed {$removedHighMissing} rows with excessive missing values";
        }

        // Step 3: Handle remaining missing values (mean for numeric, mode for categorical)
        $filledCount = 0;
        foreach ($headers as $header) {
            $values = array_column($data, $header);
            $nonNull = array_filter($values, fn ($v) => $v !== null && $v !== '');

            if (empty($nonNull)) {
                continue;
            }

            $missingInCol = count($values) - count($nonNull);
            if ($missingInCol === 0) {
                continue;
            }

            if ($columnTypes[$header] === 'number') {
                $nums = array_map('floatval', array_filter($nonNull, 'is_numeric'));
                if (count($nums) > 0) {
                    $mean = round(array_sum($nums) / count($nums), 2);
                    foreach ($data as &$row) {
                        if (! isset($row[$header]) || $row[$header] === '' || $row[$header] === null) {
                            $row[$header] = $mean;
                            $filledCount++;
                        }
                    }
                    unset($row);
                    $summary['columns_modified'][] = $header;
                    $log[] = ['type' => 'fill_missing', 'message' => "Filled {$missingInCol} missing values in '{$header}' with mean ({$mean})."];
                }
            } else {
                $frequency = array_count_values(array_map('strval', $nonNull));
                arsort($frequency);
                $mode = array_key_first($frequency);
                foreach ($data as &$row) {
                    if (! isset($row[$header]) || $row[$header] === '' || $row[$header] === null) {
                        $row[$header] = $mode;
                        $filledCount++;
                    }
                }
                unset($row);
                $summary['columns_modified'][] = $header;
                $log[] = ['type' => 'fill_missing', 'message' => "Filled {$missingInCol} missing values in '{$header}' with mode ('{$mode}')."];
            }
        }
        $summary['missing_values_handled'] = $filledCount;
        if ($filledCount > 0) {
            $summary['transformations'][] = "Filled {$filledCount} missing values using mean/mode strategy";
        }

        // Step 4: Remove duplicates
        $beforeCount = count($data);
        $unique = [];
        $seen = [];
        foreach ($data as $row) {
            $key = md5(serialize($row));
            if (! isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $row;
            }
        }
        $data = $unique;
        $dupsRemoved = $beforeCount - count($data);
        $summary['duplicates_removed'] = $dupsRemoved;
        if ($dupsRemoved > 0) {
            $log[] = ['type' => 'remove_duplicates', 'message' => "Removed {$dupsRemoved} duplicate rows."];
            $summary['rows_affected'] += $dupsRemoved;
            $summary['transformations'][] = "Removed {$dupsRemoved} duplicate rows";
        }

        // Step 5: Data type conversion
        $conversions = 0;
        foreach ($headers as $header) {
            if ($columnTypes[$header] === 'number') {
                foreach ($data as &$row) {
                    if (isset($row[$header]) && is_string($row[$header]) && is_numeric($row[$header])) {
                        $row[$header] = (float) $row[$header];
                        $conversions++;
                    }
                }
                unset($row);
            } elseif ($columnTypes[$header] === 'date') {
                foreach ($data as &$row) {
                    if (isset($row[$header]) && is_string($row[$header]) && $row[$header] !== '') {
                        $timestamp = strtotime($row[$header]);
                        if ($timestamp !== false) {
                            $formatted = date('Y-m-d', $timestamp);
                            if ($formatted !== $row[$header]) {
                                $row[$header] = $formatted;
                                $conversions++;
                            }
                        }
                    }
                }
                unset($row);
            }

            if ($columnTypes[$header] === 'text' || $columnTypes[$header] === 'boolean') {
                $boolValues = ['yes', 'true', '1', 'y', 'no', 'false', '0', 'n'];
                $colValues = array_filter(array_column($data, $header), fn ($v) => $v !== null && $v !== '');
                $boolCount = count(array_filter($colValues, fn ($v) => in_array(strtolower(trim((string) $v)), $boolValues, true)));
                $isBooleanColumn = count($colValues) > 0 && ($boolCount / count($colValues)) > 0.8;

                if ($isBooleanColumn) {
                    foreach ($data as &$row) {
                        if (isset($row[$header]) && is_string($row[$header])) {
                            $lower = strtolower(trim($row[$header]));
                            if (in_array($lower, ['yes', 'true', '1', 'y'], true)) {
                                $row[$header] = 'True';
                                $conversions++;
                            } elseif (in_array($lower, ['no', 'false', '0', 'n'], true)) {
                                $row[$header] = 'False';
                                $conversions++;
                            }
                        }
                    }
                    unset($row);
                }
            }
        }
        if ($conversions > 0) {
            $log[] = ['type' => 'convert_type', 'message' => "Converted {$conversions} values (numeric text to numbers, dates to YYYY-MM-DD, booleans standardized)."];
            $summary['transformations'][] = "Converted {$conversions} values to proper types";
        }

        // Step 6: Standardize (trim + normalize categories)
        $trimmed = 0;
        $normalized = 0;
        foreach ($headers as $header) {
            if ($columnTypes[$header] !== 'text') {
                continue;
            }

            foreach ($data as &$row) {
                if (isset($row[$header]) && is_string($row[$header])) {
                    $original = $row[$header];
                    $row[$header] = trim($row[$header]);
                    if ($row[$header] !== $original) {
                        $trimmed++;
                    }
                }
            }
            unset($row);

            $lowercaseMap = [];
            foreach ($data as $row) {
                if (isset($row[$header]) && is_string($row[$header]) && $row[$header] !== '') {
                    $lower = strtolower($row[$header]);
                    if (! isset($lowercaseMap[$lower])) {
                        $lowercaseMap[$lower] = [];
                    }
                    $lowercaseMap[$lower][] = $row[$header];
                }
            }

            foreach ($lowercaseMap as $lower => $variants) {
                $uniqueVariants = array_unique($variants);
                if (count($uniqueVariants) > 1) {
                    $canonical = ucwords($lower);
                    foreach ($data as &$row) {
                        if (isset($row[$header]) && is_string($row[$header]) && strtolower($row[$header]) === $lower && $row[$header] !== $canonical) {
                            $row[$header] = $canonical;
                            $normalized++;
                        }
                    }
                    unset($row);
                }
            }
        }
        if ($trimmed > 0) {
            $log[] = ['type' => 'trim_spaces', 'message' => "Trimmed extra spaces in {$trimmed} values."];
            $summary['transformations'][] = "Trimmed spaces in {$trimmed} values";
        }
        if ($normalized > 0) {
            $log[] = ['type' => 'normalize', 'message' => "Normalized {$normalized} categorical values to consistent Title Case."];
            $summary['transformations'][] = "Normalized {$normalized} categorical values";
        }

        // Step 7: Handle outliers using IQR
        $outliersCapped = 0;
        foreach ($headers as $header) {
            if ($columnTypes[$header] !== 'number') {
                continue;
            }

            $nums = [];
            foreach ($data as $row) {
                if (isset($row[$header]) && is_numeric($row[$header])) {
                    $nums[] = (float) $row[$header];
                }
            }

            if (count($nums) < 4) {
                continue;
            }

            sort($nums);
            $count = count($nums);
            $q1 = $nums[(int) floor($count * 0.25)];
            $q3 = $nums[(int) floor($count * 0.75)];
            $iqr = $q3 - $q1;

            if ($iqr <= 0) {
                continue;
            }

            $lowerBound = $q1 - (1.5 * $iqr);
            $upperBound = $q3 + (1.5 * $iqr);

            foreach ($data as &$row) {
                if (isset($row[$header]) && is_numeric($row[$header])) {
                    $val = (float) $row[$header];
                    if ($val < $lowerBound) {
                        $row[$header] = round($lowerBound, 2);
                        $outliersCapped++;
                    } elseif ($val > $upperBound) {
                        $row[$header] = round($upperBound, 2);
                        $outliersCapped++;
                    }
                }
            }
            unset($row);
        }
        if ($outliersCapped > 0) {
            $log[] = ['type' => 'handle_outliers', 'message' => "Capped {$outliersCapped} outlier values using IQR method (1.5x IQR bounds)."];
            $summary['transformations'][] = "Capped {$outliersCapped} outlier values using IQR method";
        }

        // Step 8: Filter invalid data
        $beforeCount = count($data);
        foreach ($headers as $header) {
            $lowerHeader = strtolower($header);
            if (in_array($lowerHeader, ['age', 'edad', 'years', 'year'])) {
                $data = array_values(array_filter($data, function ($row) use ($header) {
                    if (! isset($row[$header]) || ! is_numeric($row[$header])) {
                        return true;
                    }

                    $val = (float) $row[$header];

                    return $val >= 0 && $val <= 150;
                }));
            }

            if (in_array($lowerHeader, ['price', 'amount', 'cost', 'salary', 'revenue', 'total'])) {
                $data = array_values(array_filter($data, function ($row) use ($header) {
                    if (! isset($row[$header]) || ! is_numeric($row[$header])) {
                        return true;
                    }

                    return (float) $row[$header] >= 0;
                }));
            }
        }
        $invalidRemoved = $beforeCount - count($data);
        if ($invalidRemoved > 0) {
            $log[] = ['type' => 'filter_invalid', 'message' => "Removed {$invalidRemoved} rows with impossible values (negative prices, invalid ages, etc.)."];
            $summary['rows_affected'] += $invalidRemoved;
            $summary['transformations'][] = "Removed {$invalidRemoved} rows with invalid data";
        }

        // Step 9: Generate computed columns if applicable
        $hasPrice = false;
        $hasQuantity = false;
        $priceCol = null;
        $quantityCol = null;
        foreach ($headers as $header) {
            $lower = strtolower($header);
            if (in_array($lower, ['price', 'unit_price', 'unit price', 'cost'])) {
                $hasPrice = true;
                $priceCol = $header;
            }
            if (in_array($lower, ['quantity', 'qty', 'count', 'units'])) {
                $hasQuantity = true;
                $quantityCol = $header;
            }
        }

        if ($hasPrice && $hasQuantity && $priceCol && $quantityCol) {
            $totalExists = in_array('total', array_map('strtolower', $headers));
            if (! $totalExists) {
                $headers[] = 'Total';
                foreach ($data as &$row) {
                    $price = is_numeric($row[$priceCol] ?? null) ? (float) $row[$priceCol] : 0;
                    $qty = is_numeric($row[$quantityCol] ?? null) ? (float) $row[$quantityCol] : 0;
                    $row['Total'] = round($price * $qty, 2);
                }
                unset($row);
                $log[] = ['type' => 'transform', 'message' => "Generated 'Total' column (Price x Quantity)."];
                $summary['transformations'][] = "Generated 'Total' column from Price x Quantity";
            }
        }

        // Final summary
        $profile = $this->generateProfile($headers, $data);
        $finalRowCount = count($data);
        $summary['columns_modified'] = array_values(array_unique($summary['columns_modified']));
        $summary['rows_affected'] = $originalRowCount - $finalRowCount;

        $log[] = ['type' => 'validation', 'message' => "Cleaning complete. Dataset reduced from {$originalRowCount} to {$finalRowCount} rows. {$filledCount} missing values filled, {$dupsRemoved} duplicates removed, {$outliersCapped} outliers capped."];
        $log[] = ['type' => 'summary', 'message' => json_encode($summary)];

        $dataset->update([
            'cleaned_data' => array_values($data),
            'cleaning_log' => $log,
            'headers' => $headers,
            'profile' => $profile,
            'row_count' => $finalRowCount,
            'column_count' => count($headers),
        ]);

        return redirect()->route('datasets.compare', $dataset)
            ->with('toast', ['type' => 'success', 'message' => "Auto-clean complete: {$filledCount} missing values handled, {$dupsRemoved} duplicates removed, {$outliersCapped} outliers capped."]);
    }

    public function compare(Dataset $dataset): Response
    {
        return Inertia::render('datasets/compare', [
            'dataset' => $dataset,
        ]);
    }

    public function analyze(Dataset $dataset): Response
    {
        $data = $dataset->cleaned_data ?? $dataset->original_data;
        $headers = $dataset->headers;

        $insights = $this->generateInsights($headers, $data);

        return Inertia::render('datasets/analyze', [
            'dataset' => $dataset->only('id', 'name', 'headers', 'row_count', 'column_count'),
            'insights' => $insights,
        ]);
    }

    public function visualize(Dataset $dataset): Response
    {
        $data = $dataset->cleaned_data ?? $dataset->original_data;

        return Inertia::render('datasets/visualize', [
            'dataset' => $dataset->only('id', 'name', 'headers', 'row_count', 'column_count'),
            'data' => $data,
        ]);
    }

    public function export(Dataset $dataset, string $format): StreamedResponse|RedirectResponse
    {
        $data = $dataset->cleaned_data ?? $dataset->original_data;
        $headers = $dataset->headers;

        if (empty($data)) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'No data to export.']);
        }

        $filename = str_replace(' ', '_', $dataset->name).'_cleaned.'.$format;

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($headers, $data) {
                $handle = fopen('php://output', 'w');
                fputcsv($handle, $headers);
                foreach ($data as $row) {
                    $line = [];
                    foreach ($headers as $h) {
                        $line[] = $row[$h] ?? '';
                    }
                    fputcsv($handle, $line);
                }
                fclose($handle);
            }, $filename, [
                'Content-Type' => 'text/csv',
            ]);
        }

        // XLSX export using maatwebsite/excel
        return response()->streamDownload(function () use ($headers, $data) {
            $spreadsheet = new Spreadsheet;
            $sheet = $spreadsheet->getActiveSheet();

            // Write headers
            foreach ($headers as $colIdx => $header) {
                $sheet->setCellValue([Coordinate::stringFromColumnIndex($colIdx + 1), 1], $header);
            }

            // Write data
            foreach ($data as $rowIdx => $row) {
                foreach ($headers as $colIdx => $h) {
                    $sheet->setCellValue(
                        [Coordinate::stringFromColumnIndex($colIdx + 1), $rowIdx + 2],
                        $row[$h] ?? ''
                    );
                }
            }

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function merge(): Response
    {
        $datasets = Dataset::latest()->get(['id', 'name', 'original_filename', 'row_count', 'column_count', 'headers']);

        return Inertia::render('datasets/merge', [
            'datasets' => $datasets,
        ]);
    }

    public function executeMerge(Request $request): RedirectResponse
    {
        $request->validate([
            'dataset_a' => ['required', 'integer', 'exists:datasets,id'],
            'dataset_b' => ['required', 'integer', 'exists:datasets,id', 'different:dataset_a'],
            'column' => ['required', 'string'],
            'join_type' => ['required', 'string', 'in:inner,left,right,full'],
            'name' => ['required', 'string', 'max:255'],
        ]);

        $datasetA = Dataset::findOrFail($request->input('dataset_a'));
        $datasetB = Dataset::findOrFail($request->input('dataset_b'));

        $dataA = $datasetA->cleaned_data ?? $datasetA->original_data;
        $dataB = $datasetB->cleaned_data ?? $datasetB->original_data;
        $joinColumn = $request->input('column');
        $joinType = $request->input('join_type');

        if (! in_array($joinColumn, $datasetA->headers) || ! in_array($joinColumn, $datasetB->headers)) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'The selected column must exist in both datasets.']);
        }

        $headersA = $datasetA->headers;
        $headersB = $datasetB->headers;
        $mergedHeaders = $headersA;
        $suffixedB = [];

        foreach ($headersB as $h) {
            if ($h === $joinColumn) {
                continue;
            }
            $finalName = in_array($h, $headersA) ? $h.'_B' : $h;
            $mergedHeaders[] = $finalName;
            $suffixedB[$h] = $finalName;
        }

        $indexB = [];
        foreach ($dataB as $row) {
            $key = (string) ($row[$joinColumn] ?? '');
            if ($key !== '') {
                $indexB[$key][] = $row;
            }
        }

        $merged = [];
        $matchedBKeys = [];
        foreach ($dataA as $rowA) {
            $key = (string) ($rowA[$joinColumn] ?? '');
            $matchesB = $indexB[$key] ?? [];

            if (! empty($matchesB)) {
                $matchedBKeys[$key] = true;
                foreach ($matchesB as $rowB) {
                    $mergedRow = $rowA;
                    foreach ($suffixedB as $origCol => $newCol) {
                        $mergedRow[$newCol] = $rowB[$origCol] ?? null;
                    }
                    $merged[] = $mergedRow;
                }
            } elseif ($joinType === 'left' || $joinType === 'full') {
                $mergedRow = $rowA;
                foreach ($suffixedB as $newCol) {
                    $mergedRow[$newCol] = null;
                }
                $merged[] = $mergedRow;
            }
        }

        if ($joinType === 'right' || $joinType === 'full') {
            foreach ($dataB as $rowB) {
                $key = (string) ($rowB[$joinColumn] ?? '');
                if (! isset($matchedBKeys[$key])) {
                    $mergedRow = [];
                    foreach ($headersA as $h) {
                        $mergedRow[$h] = $h === $joinColumn ? $rowB[$joinColumn] : null;
                    }
                    foreach ($suffixedB as $origCol => $newCol) {
                        $mergedRow[$newCol] = $rowB[$origCol] ?? null;
                    }
                    $merged[] = $mergedRow;
                }
            }
        }

        if (empty($merged)) {
            return redirect()->back()
                ->with('toast', ['type' => 'warning', 'message' => 'No matching rows found. The merge produced an empty dataset.']);
        }

        $profile = $this->generateProfile($mergedHeaders, $merged);

        $dataset = Dataset::create([
            'name' => $request->input('name'),
            'original_filename' => "Merged: {$datasetA->name} + {$datasetB->name}",
            'file_path' => '',
            'file_type' => 'merged',
            'row_count' => count($merged),
            'column_count' => count($mergedHeaders),
            'headers' => $mergedHeaders,
            'original_data' => $merged,
            'cleaned_data' => null,
            'cleaning_log' => null,
            'profile' => $profile,
        ]);

        return redirect()->route('datasets.show', $dataset)
            ->with('toast', ['type' => 'success', 'message' => "Merged successfully! {$datasetA->name} + {$datasetB->name} = ".count($merged).' rows.']);
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<string, mixed>>  $data
     * @return array<string, mixed>
     */
    private function generateProfile(array $headers, array $data): array
    {
        $profile = [
            'row_count' => count($data),
            'column_count' => count($headers),
            'columns' => [],
        ];

        foreach ($headers as $header) {
            $values = array_column($data, $header);
            $nonNull = array_filter($values, fn ($v) => $v !== null && $v !== '');
            $numericValues = array_filter($nonNull, fn ($v) => is_numeric($v));

            $columnProfile = [
                'name' => $header,
                'type' => $this->detectType($nonNull),
                'total' => count($values),
                'missing' => count($values) - count($nonNull),
                'unique' => count(array_unique($nonNull)),
            ];

            if (count($numericValues) > 0) {
                $nums = array_map('floatval', $numericValues);
                $columnProfile['min'] = min($nums);
                $columnProfile['max'] = max($nums);
                $columnProfile['avg'] = round(array_sum($nums) / count($nums), 2);
                $columnProfile['sum'] = round(array_sum($nums), 2);
            }

            $profile['columns'][$header] = $columnProfile;
        }

        return $profile;
    }

    /**
     * @param  array<int, mixed>  $values
     */
    private function detectType(array $values): string
    {
        if (empty($values)) {
            return 'unknown';
        }

        $sample = array_slice(array_values($values), 0, 20);
        $numericCount = 0;
        $dateCount = 0;
        $boolCount = 0;

        $boolValues = ['yes', 'true', 'false', 'no', '1', '0', 'y', 'n'];

        foreach ($sample as $value) {
            $strVal = strtolower(trim((string) $value));
            if (is_numeric($value)) {
                $numericCount++;
            } elseif (in_array($strVal, $boolValues, true)) {
                $boolCount++;
            } elseif (strtotime((string) $value) !== false && preg_match('/[\-\/]/', (string) $value)) {
                $dateCount++;
            }
        }

        $total = count($sample);

        if ($numericCount / $total > 0.8) {
            return 'number';
        }
        if ($boolCount / $total > 0.8) {
            return 'boolean';
        }
        if ($dateCount / $total > 0.8) {
            return 'date';
        }

        return 'text';
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<string, mixed>>  $data
     * @return array<string, mixed>
     */
    private function generateInsights(array $headers, array $data): array
    {
        $insights = [
            'summary' => [],
            'frequent_values' => [],
            'trends' => [],
            'correlations' => [],
            'anomalies' => [],
            'interpretations' => [],
        ];

        $numericColumns = [];

        foreach ($headers as $header) {
            $values = array_column($data, $header);
            $nonNull = array_filter($values, fn ($v) => $v !== null && $v !== '');
            $numericValues = array_filter($nonNull, fn ($v) => is_numeric($v));

            if (count($numericValues) > 0) {
                $nums = array_map('floatval', $numericValues);
                sort($nums);
                $count = count($nums);
                $median = $count % 2 === 0
                    ? ($nums[$count / 2 - 1] + $nums[$count / 2]) / 2
                    : $nums[(int) floor($count / 2)];

                $mean = array_sum($nums) / $count;
                $variance = array_sum(array_map(fn ($x) => ($x - $mean) ** 2, $nums)) / $count;
                $stddev = sqrt($variance);

                $insights['summary'][$header] = [
                    'count' => $count,
                    'mean' => round($mean, 2),
                    'median' => round($median, 2),
                    'std_dev' => round($stddev, 2),
                    'min' => min($nums),
                    'max' => max($nums),
                    'range' => round(max($nums) - min($nums), 2),
                    'sum' => round(array_sum($nums), 2),
                ];

                $numericColumns[$header] = $nums;

                // Trend detection
                if ($count >= 3) {
                    $firstHalf = array_slice($nums, 0, (int) floor($count / 2));
                    $secondHalf = array_slice($nums, (int) ceil($count / 2));
                    $firstAvg = array_sum($firstHalf) / count($firstHalf);
                    $secondAvg = array_sum($secondHalf) / count($secondHalf);
                    $diff = $secondAvg - $firstAvg;
                    $pctChange = $firstAvg != 0 ? round(($diff / abs($firstAvg)) * 100, 1) : 0;

                    $trend = $diff > 0 ? 'increasing' : ($diff < 0 ? 'decreasing' : 'stable');
                    $insights['trends'][$header] = [
                        'direction' => $trend,
                        'change_pct' => $pctChange,
                    ];
                }

                // Anomaly detection using Z-score (|z| > 3)
                if ($stddev > 0 && $count >= 5) {
                    $anomalies = [];
                    foreach ($nums as $idx => $val) {
                        $z = ($val - $mean) / $stddev;
                        if (abs($z) > 3) {
                            $anomalies[] = [
                                'value' => $val,
                                'z_score' => round($z, 2),
                                'row_index' => $idx,
                            ];
                        }
                    }
                    if (! empty($anomalies)) {
                        $insights['anomalies'][$header] = array_slice($anomalies, 0, 10);
                    }
                }
            }

            // Frequent values (top 5)
            if (count($nonNull) > 0) {
                $frequency = array_count_values(array_map('strval', $nonNull));
                arsort($frequency);
                $insights['frequent_values'][$header] = array_slice($frequency, 0, 5, true);
            }
        }

        // Correlation analysis (Pearson) between numeric columns
        $numericHeaders = array_keys($numericColumns);
        if (count($numericHeaders) >= 2) {
            foreach ($numericHeaders as $i => $colA) {
                foreach (array_slice($numericHeaders, $i + 1) as $colB) {
                    $valsA = [];
                    $valsB = [];
                    foreach ($data as $row) {
                        $a = $row[$colA] ?? null;
                        $b = $row[$colB] ?? null;
                        if (is_numeric($a) && is_numeric($b)) {
                            $valsA[] = (float) $a;
                            $valsB[] = (float) $b;
                        }
                    }

                    if (count($valsA) >= 3) {
                        $r = $this->pearsonCorrelation($valsA, $valsB);
                        if ($r !== null) {
                            $insights['correlations'][] = [
                                'column_a' => $colA,
                                'column_b' => $colB,
                                'coefficient' => round($r, 3),
                                'strength' => $this->correlationStrength($r),
                            ];
                        }
                    }
                }
            }

            // Sort by absolute coefficient descending
            usort($insights['correlations'], fn ($a, $b) => abs($b['coefficient']) <=> abs($a['coefficient']));
        }

        // Generate smart interpretations
        $interpretations = [];

        // Trend insights
        foreach ($insights['trends'] as $col => $trend) {
            if ($trend['direction'] !== 'stable') {
                $interpretations[] = "Column '{$col}' shows a {$trend['direction']} trend ({$trend['change_pct']}% change). "
                    ."Average value is {$insights['summary'][$col]['mean']} with a range of {$insights['summary'][$col]['range']}.";
            }
        }

        // Most frequent category insights
        foreach ($insights['frequent_values'] as $col => $freqs) {
            if (isset($numericColumns[$col])) {
                continue;
            }
            $topValue = array_key_first($freqs);
            $topCount = $freqs[$topValue];
            $totalInCol = array_sum($freqs);
            if ($totalInCol > 0) {
                $pct = round(($topCount / count($data)) * 100, 1);
                $interpretations[] = "Most frequent value in '{$col}' is '{$topValue}' appearing {$topCount} times ({$pct}% of data).";
            }
        }

        // Correlation insights
        foreach (array_slice($insights['correlations'], 0, 3) as $corr) {
            if (abs($corr['coefficient']) >= 0.5) {
                $dir = $corr['coefficient'] > 0 ? 'positive' : 'negative';
                $interpretations[] = "{$corr['strength']} {$dir} correlation between '{$corr['column_a']}' and '{$corr['column_b']}' (r = {$corr['coefficient']}).";
            }
        }

        // Anomaly insights
        foreach ($insights['anomalies'] as $col => $anomalies) {
            $count = count($anomalies);
            $interpretations[] = "Detected {$count} anomalous value(s) in '{$col}' (Z-score > 3). These are unusually high or low values.";
        }

        // Missing value insight
        $totalValues = count($data) * count($headers);
        $totalMissing = 0;
        foreach ($headers as $h) {
            $vals = array_column($data, $h);
            $totalMissing += count(array_filter($vals, fn ($v) => $v === null || $v === ''));
        }
        if ($totalMissing > 0) {
            $missingPct = round(($totalMissing / $totalValues) * 100, 1);
            $interpretations[] = "Dataset has {$totalMissing} missing values ({$missingPct}% of all cells).";
        }

        if (empty($interpretations)) {
            $interpretations[] = 'This dataset contains '.count($data).' rows and '.count($headers).' columns.';
        }

        $insights['interpretations'] = $interpretations;

        return $insights;
    }

    /**
     * @param  array<int, float>  $x
     * @param  array<int, float>  $y
     */
    private function pearsonCorrelation(array $x, array $y): ?float
    {
        $n = count($x);
        if ($n < 3 || $n !== count($y)) {
            return null;
        }

        $sumX = array_sum($x);
        $sumY = array_sum($y);
        $sumXY = 0;
        $sumX2 = 0;
        $sumY2 = 0;

        for ($i = 0; $i < $n; $i++) {
            $sumXY += $x[$i] * $y[$i];
            $sumX2 += $x[$i] ** 2;
            $sumY2 += $y[$i] ** 2;
        }

        $denominator = sqrt(($n * $sumX2 - $sumX ** 2) * ($n * $sumY2 - $sumY ** 2));

        if ($denominator == 0) {
            return null;
        }

        return ($n * $sumXY - $sumX * $sumY) / $denominator;
    }

    private function correlationStrength(float $r): string
    {
        $abs = abs($r);
        if ($abs >= 0.8) {
            return 'Very strong';
        }
        if ($abs >= 0.6) {
            return 'Strong';
        }
        if ($abs >= 0.4) {
            return 'Moderate';
        }
        if ($abs >= 0.2) {
            return 'Weak';
        }

        return 'Very weak';
    }

    // --- Manual cleaning helpers ---

    /** @return array{data: array, log: array} */
    private function removeDuplicates(array $data, array $log): array
    {
        $unique = [];
        $seen = [];
        foreach ($data as $row) {
            $key = md5(serialize($row));
            if (! isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $row;
            }
        }
        $removed = count($data) - count($unique);
        $log[] = ['type' => 'remove_duplicates', 'message' => "Removed {$removed} duplicate rows."];

        return ['data' => $unique, 'log' => $log];
    }

    /** @return array{data: array, log: array} */
    private function removeMissingRows(array $data, ?string $column, array $log): array
    {
        $before = count($data);
        if ($column) {
            $data = array_filter($data, fn ($row) => isset($row[$column]) && $row[$column] !== '' && $row[$column] !== null);
        } else {
            $data = array_filter($data, function ($row) {
                foreach ($row as $value) {
                    if ($value === null || $value === '') {
                        return false;
                    }
                }

                return true;
            });
        }
        $removed = $before - count($data);
        $target = $column ? "column '{$column}'" : 'any column';
        $log[] = ['type' => 'remove_missing_rows', 'message' => "Removed {$removed} rows with missing values in {$target}."];

        return ['data' => array_values($data), 'log' => $log];
    }

    /** @return array{data: array, log: array} */
    private function fillMissing(array $data, ?string $column, string $value, array $log): array
    {
        $filled = 0;
        foreach ($data as &$row) {
            if ($column) {
                if (! isset($row[$column]) || $row[$column] === '' || $row[$column] === null) {
                    $row[$column] = $value;
                    $filled++;
                }
            } else {
                foreach ($row as &$cell) {
                    if ($cell === null || $cell === '') {
                        $cell = $value;
                        $filled++;
                    }
                }
            }
        }
        $target = $column ? "column '{$column}'" : 'all columns';
        $log[] = ['type' => 'fill_missing', 'message' => "Filled {$filled} missing values in {$target} with '{$value}'."];

        return ['data' => $data, 'log' => $log];
    }

    /** @return array{data: array, log: array} */
    private function convertType(array $data, ?string $column, string $targetType, array $log): array
    {
        if (! $column) {
            return ['data' => $data, 'log' => $log];
        }
        $converted = 0;
        foreach ($data as &$row) {
            if (isset($row[$column])) {
                $original = $row[$column];
                $row[$column] = match ($targetType) {
                    'number' => is_numeric($original) ? (float) $original : $original,
                    'integer' => is_numeric($original) ? (int) $original : $original,
                    'string' => (string) $original,
                    default => $original,
                };
                if ($row[$column] !== $original) {
                    $converted++;
                }
            }
        }
        $log[] = ['type' => 'convert_type', 'message' => "Converted {$converted} values in column '{$column}' to {$targetType}."];

        return ['data' => $data, 'log' => $log];
    }

    /** @return array{data: array, log: array} */
    private function trimSpaces(array $data, ?string $column, array $log): array
    {
        $trimmed = 0;
        foreach ($data as &$row) {
            if ($column) {
                if (isset($row[$column]) && is_string($row[$column])) {
                    $original = $row[$column];
                    $row[$column] = trim($row[$column]);
                    if ($row[$column] !== $original) {
                        $trimmed++;
                    }
                }
            } else {
                foreach ($row as &$cell) {
                    if (is_string($cell)) {
                        $original = $cell;
                        $cell = trim($cell);
                        if ($cell !== $original) {
                            $trimmed++;
                        }
                    }
                }
            }
        }
        $target = $column ? "column '{$column}'" : 'all columns';
        $log[] = ['type' => 'trim_spaces', 'message' => "Trimmed spaces in {$trimmed} values in {$target}."];

        return ['data' => $data, 'log' => $log];
    }

    /** @return array{data: array, log: array} */
    private function capitalize(array $data, ?string $column, string $format, array $log): array
    {
        if (! $column) {
            return ['data' => $data, 'log' => $log];
        }
        $changed = 0;
        foreach ($data as &$row) {
            if (isset($row[$column]) && is_string($row[$column])) {
                $original = $row[$column];
                $row[$column] = match ($format) {
                    'uppercase' => strtoupper($row[$column]),
                    'lowercase' => strtolower($row[$column]),
                    'ucfirst' => ucfirst(strtolower($row[$column])),
                    'ucwords' => ucwords(strtolower($row[$column])),
                    default => $row[$column],
                };
                if ($row[$column] !== $original) {
                    $changed++;
                }
            }
        }
        $log[] = ['type' => 'capitalize', 'message' => "Applied '{$format}' formatting to {$changed} values in column '{$column}'."];

        return ['data' => $data, 'log' => $log];
    }

    /** @return array{data: array, log: array} */
    private function filterInvalid(array $data, ?string $column, string $rule, array $log): array
    {
        if (! $column) {
            return ['data' => $data, 'log' => $log];
        }
        $before = count($data);
        $data = array_filter($data, function ($row) use ($column, $rule) {
            $value = $row[$column] ?? null;

            return match ($rule) {
                'not_empty' => $value !== null && $value !== '',
                'numeric' => is_numeric($value),
                'positive' => is_numeric($value) && (float) $value > 0,
                default => true,
            };
        });
        $removed = $before - count($data);
        $log[] = ['type' => 'filter_invalid', 'message' => "Filtered {$removed} invalid rows from column '{$column}' (rule: {$rule})."];

        return ['data' => array_values($data), 'log' => $log];
    }
}

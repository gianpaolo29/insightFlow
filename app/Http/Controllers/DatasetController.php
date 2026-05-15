<?php

namespace App\Http\Controllers;

use App\Imports\DatasetImport;
use App\Models\Dataset;
use Barryvdh\DomPDF\Facade\Pdf;
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
        $perPage = 10;
        $query = Dataset::where('user_id', $request->user()->id);
        $datasets = (clone $query)->latest()->paginate($perPage, ['id', 'name', 'original_filename', 'file_type', 'row_count', 'column_count', 'created_at']);
        $allDatasets = (clone $query)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('datasets/upload', [
            'datasets' => $datasets,
            'allDatasets' => $allDatasets,
        ]);
    }

    public function upload(Request $request): RedirectResponse
    {
        $request->validate([
            'files' => ['required', 'array', 'min:1'],
            'files.*' => ['required', File::types(['csv', 'xlsx', 'xls'])->max(10 * 1024)],
        ]);

        $files = $request->file('files');
        $createdDatasets = [];

        foreach ($files as $file) {
            $path = $file->store('datasets', 'local');
            $extension = strtolower($file->getClientOriginalExtension());

            $import = new DatasetImport;

            try {
                Excel::import($import, $file);
            } catch (\Exception $e) {
                continue;
            }

            $data = $import->data;
            $headers = $import->headers;

            if (empty($headers) || empty($data)) {
                continue;
            }

            $profile = $this->generateProfile($headers, $data);

            $datasetName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

            $createdDatasets[] = Dataset::create([
                'name' => $datasetName,
                'user_id' => $request->user()->id,
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
        }

        if (empty($createdDatasets)) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'No valid files could be processed.']);
        }

        // Auto-relate datasets uploaded together
        if (count($createdDatasets) > 1) {
            $first = $createdDatasets[0];
            for ($i = 1; $i < count($createdDatasets); $i++) {
                $first->relatedDatasets()->attach($createdDatasets[$i]->id, [
                    'type' => 'related',
                    'description' => 'Uploaded together',
                ]);
            }
        }

        $lastDataset = end($createdDatasets);
        $count = count($createdDatasets);
        $message = $count === 1
            ? 'Dataset uploaded successfully.'
            : "{$count} datasets uploaded and linked successfully.";

        return redirect()->route('datasets.show', $lastDataset)
            ->with('toast', ['type' => 'success', 'message' => $message]);
    }

    public function show(Dataset $dataset, Request $request): Response
    {
        $perPage = 10;
        $query = Dataset::where('user_id', $request->user()->id);
        $datasets = (clone $query)->latest()->paginate($perPage, ['id', 'name', 'original_filename', 'file_type', 'row_count', 'column_count', 'created_at']);
        $allDatasets = (clone $query)->orderBy('name')->get(['id', 'name']);

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

        // Load relationships
        $dataset->load(['relatedDatasets:id,name,file_type,row_count,column_count', 'parentDatasets:id,name,file_type,row_count,column_count']);
        $datasetForView['related_datasets'] = $dataset->relatedDatasets->map(fn ($d) => [
            'id' => $d->id,
            'name' => $d->name,
            'file_type' => $d->file_type,
            'row_count' => $d->row_count,
            'column_count' => $d->column_count,
            'type' => $d->pivot->type,
            'description' => $d->pivot->description,
        ]);
        $datasetForView['parent_datasets'] = $dataset->parentDatasets->map(fn ($d) => [
            'id' => $d->id,
            'name' => $d->name,
            'file_type' => $d->file_type,
            'row_count' => $d->row_count,
            'column_count' => $d->column_count,
            'type' => $d->pivot->type,
            'description' => $d->pivot->description,
        ]);

        return Inertia::render('datasets/upload', [
            'datasets' => $datasets,
            'dataset' => $datasetForView,
            'allDatasets' => $allDatasets,
        ]);
    }

    public function destroy(Dataset $dataset): RedirectResponse
    {
        $dataset->delete();

        return redirect()->route('datasets.index')
            ->with('toast', ['type' => 'success', 'message' => 'Dataset deleted.']);
    }

    public function addRelationship(Request $request, Dataset $dataset): RedirectResponse
    {
        $request->validate([
            'related_dataset_id' => ['required', 'integer', 'exists:datasets,id', 'different:dataset'],
            'type' => ['required', 'string', 'in:related,derived,merged,subset'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $relatedId = (int) $request->input('related_dataset_id');

        // Prevent duplicate relationships
        if ($dataset->relatedDatasets()->where('child_dataset_id', $relatedId)->exists()
            || $dataset->parentDatasets()->where('parent_dataset_id', $relatedId)->exists()) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'This relationship already exists.']);
        }

        $dataset->relatedDatasets()->attach($relatedId, [
            'type' => $request->input('type'),
            'description' => $request->input('description'),
        ]);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Relationship added successfully.']);
    }

    public function removeRelationship(Dataset $dataset, Dataset $related): RedirectResponse
    {
        $dataset->relatedDatasets()->detach($related->id);
        $dataset->parentDatasets()->detach($related->id);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Relationship removed.']);
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
        $log[] = ['type' => 'inspection', 'message' => "Inspected {$originalRowCount} rows, ".count($headers)." columns. Found {$totalMissing} total missing values.", 'reason' => 'Initial data inspection identifies the scope of cleaning needed and determines which cleaning strategies to apply.'];
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
            $log[] = ['type' => 'remove_missing_rows', 'message' => "Removed {$removedHighMissing} rows with >50% missing values.", 'reason' => 'Rows with more than half their values missing cannot be reliably imputed and would introduce noise into the analysis.'];
            $summary['rows_affected'] += $removedHighMissing;
            $summary['transformations'][] = "Removed {$removedHighMissing} rows with excessive missing values";
        }

        // Step 3a: Context-based imputation — infer missing values from correlated columns
        $contextFilled = 0;
        $contextDetails = [];

        // Build lookup maps: for each column with missing values, find other columns
        // that can predict its value (e.g., Product can be inferred from Price)
        foreach ($headers as $targetCol) {
            $hasMissing = false;
            foreach ($data as $row) {
                if (! isset($row[$targetCol]) || $row[$targetCol] === '' || $row[$targetCol] === null) {
                    $hasMissing = true;
                    break;
                }
            }

            if (! $hasMissing) {
                continue;
            }

            // Find the best predictor column: a column where each unique value
            // consistently maps to the same value in the target column
            $bestPredictor = null;
            $bestMap = [];
            $bestConfidence = 0;

            foreach ($headers as $predictorCol) {
                if ($predictorCol === $targetCol) {
                    continue;
                }

                // Build mapping: predictor value → target values seen together
                $mapping = [];
                foreach ($data as $row) {
                    $pVal = $row[$predictorCol] ?? null;
                    $tVal = $row[$targetCol] ?? null;

                    if ($pVal === null || $pVal === '' || $tVal === null || $tVal === '') {
                        continue;
                    }

                    $pKey = (string) $pVal;
                    if (! isset($mapping[$pKey])) {
                        $mapping[$pKey] = [];
                    }
                    $mapping[$pKey][] = (string) $tVal;
                }

                if (empty($mapping)) {
                    continue;
                }

                // Calculate confidence: how often does a predictor value map to exactly one target?
                $totalMappings = 0;
                $uniqueMappings = 0;
                $resolvedMap = [];
                foreach ($mapping as $pKey => $targetValues) {
                    $counts = array_count_values($targetValues);
                    arsort($counts);
                    $topValue = array_key_first($counts);
                    $topCount = $counts[$topValue];
                    $total = array_sum($counts);

                    if ($topCount / $total >= 0.8 && $total >= 2) {
                        $resolvedMap[$pKey] = $topValue;
                        $uniqueMappings++;
                    }
                    $totalMappings++;
                }

                if ($totalMappings > 0) {
                    $confidence = $uniqueMappings / $totalMappings;
                    if ($confidence > $bestConfidence && $confidence >= 0.5 && count($resolvedMap) >= 2) {
                        $bestConfidence = $confidence;
                        $bestPredictor = $predictorCol;
                        $bestMap = $resolvedMap;
                    }
                }
            }

            // Apply the best predictor mapping to fill missing values
            if ($bestPredictor !== null && ! empty($bestMap)) {
                $filledInCol = 0;
                foreach ($data as &$row) {
                    if (! isset($row[$targetCol]) || $row[$targetCol] === '' || $row[$targetCol] === null) {
                        $pVal = (string) ($row[$bestPredictor] ?? '');
                        if (isset($bestMap[$pVal])) {
                            $row[$targetCol] = $bestMap[$pVal];
                            $filledInCol++;
                            $contextFilled++;
                        }
                    }
                }
                unset($row);

                if ($filledInCol > 0) {
                    $summary['columns_modified'][] = $targetCol;
                    $contextDetails[] = "'{$targetCol}' from '{$bestPredictor}' ({$filledInCol} values, ".round($bestConfidence * 100).'% confidence)';
                    $log[] = [
                        'type' => 'context_fill',
                        'message' => "Inferred {$filledInCol} missing values in '{$targetCol}' using '{$bestPredictor}' as predictor (".round($bestConfidence * 100).'% confidence).',
                        'reason' => "Values in '{$bestPredictor}' consistently map to specific '{$targetCol}' values, so we can reliably predict the missing values instead of using generic fill methods.",
                    ];
                }
            }
        }
        if ($contextFilled > 0) {
            $summary['transformations'][] = "Inferred {$contextFilled} values using context: ".implode('; ', $contextDetails);
        }

        // Step 3b: Handle remaining missing values (mean for numeric, mode for categorical)
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
                    $log[] = ['type' => 'fill_missing', 'message' => "Filled {$missingInCol} missing values in '{$header}' with mean ({$mean}).", 'reason' => 'Mean imputation preserves the central tendency of numeric data, minimizing distortion to statistical analysis.'];
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
                $log[] = ['type' => 'fill_missing', 'message' => "Filled {$missingInCol} missing values in '{$header}' with mode ('{$mode}').", 'reason' => 'Mode imputation uses the most frequent value for categorical data, which is the most likely correct value based on the existing distribution.'];
            }
        }
        $summary['missing_values_handled'] = $filledCount + $contextFilled;
        if ($filledCount > 0) {
            $summary['transformations'][] = "Filled {$filledCount} remaining missing values using mean/mode strategy";
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
            $log[] = ['type' => 'remove_duplicates', 'message' => "Removed {$dupsRemoved} duplicate rows.", 'reason' => 'Duplicate rows inflate counts and skew statistical analysis. Each observation should be unique to ensure accurate results.'];
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
            $log[] = ['type' => 'convert_type', 'message' => "Converted {$conversions} values (numeric text to numbers, dates to YYYY-MM-DD, booleans standardized).", 'reason' => 'Proper data types enable accurate mathematical operations, date comparisons, and boolean logic. Text-stored numbers cannot be summed or averaged.'];
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
            $log[] = ['type' => 'trim_spaces', 'message' => "Trimmed extra spaces in {$trimmed} values.", 'reason' => 'Leading/trailing whitespace causes identical values to appear different, breaking grouping, deduplication, and lookup operations.'];
            $summary['transformations'][] = "Trimmed spaces in {$trimmed} values";
        }
        if ($normalized > 0) {
            $log[] = ['type' => 'normalize', 'message' => "Normalized {$normalized} categorical values to consistent Title Case.", 'reason' => "Inconsistent casing (e.g., 'london' vs 'London') causes the same category to be counted separately, leading to fragmented analysis."];
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
            $log[] = ['type' => 'handle_outliers', 'message' => "Capped {$outliersCapped} outlier values using IQR method (1.5x IQR bounds).", 'reason' => 'Extreme outliers disproportionately affect mean, standard deviation, and regression models. IQR capping preserves the data point while limiting its distorting effect.'];
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
            $log[] = ['type' => 'filter_invalid', 'message' => "Removed {$invalidRemoved} rows with impossible values (negative prices, invalid ages, etc.).", 'reason' => 'Domain-specific validation catches data entry errors: ages must be 0-150, prices cannot be negative. These values are factually impossible and would corrupt analysis.'];
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
                $log[] = ['type' => 'transform', 'message' => "Generated 'Total' column (Price x Quantity).", 'reason' => 'Price and Quantity columns were detected, so a computed Total column was generated to enable revenue analysis without manual calculation.'];
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
        $originalQuality = $this->calculateQualityScore($dataset->headers, $dataset->original_data);
        $cleanedQuality = $dataset->cleaned_data
            ? $this->calculateQualityScore($dataset->headers, $dataset->cleaned_data)
            : null;

        return Inertia::render('datasets/compare', [
            'dataset' => $dataset,
            'originalQuality' => $originalQuality,
            'cleanedQuality' => $cleanedQuality,
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

    public function merge(Request $request): Response
    {
        $query = Dataset::where('user_id', $request->user()->id);

        $datasets = $query->latest()->get(['id', 'name', 'original_filename', 'row_count', 'column_count', 'headers']);

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
            'user_id' => $request->user()->id,
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

    public function dashboard(Dataset $dataset): Response
    {
        $data = $dataset->cleaned_data ?? $dataset->original_data;
        $headers = $dataset->headers;
        $insights = $this->generateInsights($headers, $data);
        $qualityScore = $this->calculateQualityScore($headers, $data);

        return Inertia::render('datasets/dashboard', [
            'dataset' => $dataset->only('id', 'name', 'headers', 'row_count', 'column_count'),
            'data' => $data,
            'insights' => $insights,
            'qualityScore' => $qualityScore,
        ]);
    }

    public function sampleDatasets(): RedirectResponse
    {
        $samples = [
            [
                'name' => 'Sales Data (Sample)',
                'filename' => 'sales_sample.csv',
                'headers' => ['Product', 'Category', 'Price', 'Quantity', 'Date', 'Region'],
                'data' => [
                    ['Product' => 'Laptop', 'Category' => 'Electronics', 'Price' => '999', 'Quantity' => '5', 'Date' => '2025-01-15', 'Region' => 'North'],
                    ['Product' => 'Mouse', 'Category' => 'Electronics', 'Price' => '25', 'Quantity' => '50', 'Date' => '2025-01-16', 'Region' => 'South'],
                    ['Product' => 'Desk', 'Category' => 'Furniture', 'Price' => '350', 'Quantity' => '8', 'Date' => '2025-01-17', 'Region' => 'East'],
                    ['Product' => 'Chair', 'Category' => 'Furniture', 'Price' => '200', 'Quantity' => '12', 'Date' => '2025-01-18', 'Region' => 'West'],
                    ['Product' => 'Keyboard', 'Category' => 'Electronics', 'Price' => '75', 'Quantity' => '30', 'Date' => '2025-01-19', 'Region' => 'North'],
                    ['Product' => 'Monitor', 'Category' => 'Electronics', 'Price' => '450', 'Quantity' => '7', 'Date' => '2025-01-20', 'Region' => 'South'],
                    ['Product' => 'Lamp', 'Category' => 'Furniture', 'Price' => '45', 'Quantity' => '20', 'Date' => '2025-01-21', 'Region' => 'East'],
                    ['Product' => 'Laptop', 'Category' => 'Electronics', 'Price' => '999', 'Quantity' => '3', 'Date' => '2025-02-01', 'Region' => 'West'],
                    ['Product' => 'Headphones', 'Category' => 'Electronics', 'Price' => '150', 'Quantity' => '15', 'Date' => '2025-02-05', 'Region' => 'North'],
                    ['Product' => 'Desk', 'Category' => 'Furniture', 'Price' => '350', 'Quantity' => '5', 'Date' => '2025-02-10', 'Region' => 'South'],
                    ['Product' => 'mouse', 'Category' => 'Electronics', 'Price' => '25', 'Quantity' => '50', 'Date' => '2025-02-12', 'Region' => 'north'],
                    ['Product' => '  Laptop  ', 'Category' => 'electronics', 'Price' => '999', 'Quantity' => '5', 'Date' => '2025-01-15', 'Region' => 'North'],
                    ['Product' => 'Tablet', 'Category' => 'Electronics', 'Price' => '', 'Quantity' => '10', 'Date' => '2025-03-01', 'Region' => 'East'],
                    ['Product' => '', 'Category' => '', 'Price' => '', 'Quantity' => '', 'Date' => '', 'Region' => ''],
                    ['Product' => 'Phone', 'Category' => 'Electronics', 'Price' => '-50', 'Quantity' => '8', 'Date' => '2025-03-05', 'Region' => 'West'],
                ],
            ],
            [
                'name' => 'Student Grades (Sample)',
                'filename' => 'student_grades_sample.csv',
                'headers' => ['Name', 'Age', 'Subject', 'Score', 'Grade', 'Semester'],
                'data' => [
                    ['Name' => 'Alice', 'Age' => '20', 'Subject' => 'Math', 'Score' => '92', 'Grade' => 'A', 'Semester' => '1st'],
                    ['Name' => 'Bob', 'Age' => '21', 'Subject' => 'Math', 'Score' => '78', 'Grade' => 'B', 'Semester' => '1st'],
                    ['Name' => 'Charlie', 'Age' => '19', 'Subject' => 'Science', 'Score' => '85', 'Grade' => 'B', 'Semester' => '1st'],
                    ['Name' => 'Diana', 'Age' => '22', 'Subject' => 'Math', 'Score' => '95', 'Grade' => 'A', 'Semester' => '1st'],
                    ['Name' => 'Eve', 'Age' => '20', 'Subject' => 'Science', 'Score' => '88', 'Grade' => 'B', 'Semester' => '2nd'],
                    ['Name' => 'Frank', 'Age' => '21', 'Subject' => 'English', 'Score' => '72', 'Grade' => 'C', 'Semester' => '2nd'],
                    ['Name' => 'Grace', 'Age' => '', 'Subject' => 'Math', 'Score' => '91', 'Grade' => 'A', 'Semester' => '2nd'],
                    ['Name' => 'Alice', 'Age' => '20', 'Subject' => 'Math', 'Score' => '92', 'Grade' => 'A', 'Semester' => '1st'],
                    ['Name' => 'Henry', 'Age' => '200', 'Subject' => 'Science', 'Score' => '65', 'Grade' => 'D', 'Semester' => '1st'],
                    ['Name' => 'Ivy', 'Age' => '19', 'Subject' => 'English', 'Score' => '', 'Grade' => '', 'Semester' => '2nd'],
                    ['Name' => '  bob  ', 'Age' => '21', 'Subject' => 'math', 'Score' => '78', 'Grade' => 'b', 'Semester' => '1st'],
                    ['Name' => 'Jack', 'Age' => '-5', 'Subject' => 'Science', 'Score' => '55', 'Grade' => 'F', 'Semester' => '2nd'],
                ],
            ],
        ];

        $created = [];
        foreach ($samples as $sample) {
            $profile = $this->generateProfile($sample['headers'], $sample['data']);
            $created[] = Dataset::create([
                'name' => $sample['name'],
                'user_id' => request()->user()->id,
                'original_filename' => $sample['filename'],
                'file_path' => '',
                'file_type' => 'csv',
                'row_count' => count($sample['data']),
                'column_count' => count($sample['headers']),
                'headers' => $sample['headers'],
                'original_data' => $sample['data'],
                'cleaned_data' => null,
                'cleaning_log' => null,
                'profile' => $profile,
            ]);
        }

        return redirect()->route('datasets.show', end($created))
            ->with('toast', ['type' => 'success', 'message' => count($created).' sample datasets loaded successfully.']);
    }

    public function renameColumns(Request $request, Dataset $dataset): RedirectResponse
    {
        $request->validate([
            'columns' => ['required', 'array'],
            'columns.*' => ['required', 'string', 'max:255'],
        ]);

        $newHeaders = array_values($request->input('columns'));

        if (count($newHeaders) !== count($dataset->headers)) {
            return redirect()->back()->with('toast', ['type' => 'error', 'message' => 'Column count mismatch.']);
        }

        $oldHeaders = $dataset->headers;
        $renamedData = array_map(function ($row) use ($oldHeaders, $newHeaders) {
            $newRow = [];
            foreach ($oldHeaders as $i => $oldH) {
                $newRow[$newHeaders[$i]] = $row[$oldH] ?? null;
            }

            return $newRow;
        }, $dataset->original_data);

        $cleanedData = null;
        if ($dataset->cleaned_data) {
            $cleanedData = array_map(function ($row) use ($oldHeaders, $newHeaders) {
                $newRow = [];
                foreach ($oldHeaders as $i => $oldH) {
                    $newRow[$newHeaders[$i]] = $row[$oldH] ?? null;
                }

                return $newRow;
            }, $dataset->cleaned_data);
        }

        $profile = $this->generateProfile($newHeaders, $renamedData);

        $dataset->update([
            'headers' => $newHeaders,
            'original_data' => $renamedData,
            'cleaned_data' => $cleanedData,
            'profile' => $profile,
        ]);

        return redirect()->back()->with('toast', ['type' => 'success', 'message' => 'Columns renamed successfully.']);
    }

    public function reorderColumns(Request $request, Dataset $dataset): RedirectResponse
    {
        $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['required', 'string'],
        ]);

        $newOrder = $request->input('order');

        if (count($newOrder) !== count($dataset->headers) || array_diff($newOrder, $dataset->headers)) {
            return redirect()->back()->with('toast', ['type' => 'error', 'message' => 'Invalid column order.']);
        }

        $reorderRow = function ($row) use ($newOrder) {
            $newRow = [];
            foreach ($newOrder as $h) {
                $newRow[$h] = $row[$h] ?? null;
            }

            return $newRow;
        };

        $reorderedData = array_map($reorderRow, $dataset->original_data);
        $cleanedData = $dataset->cleaned_data ? array_map($reorderRow, $dataset->cleaned_data) : null;
        $profile = $this->generateProfile($newOrder, $reorderedData);

        $dataset->update([
            'headers' => $newOrder,
            'original_data' => $reorderedData,
            'cleaned_data' => $cleanedData,
            'profile' => $profile,
        ]);

        return redirect()->back()->with('toast', ['type' => 'success', 'message' => 'Columns reordered successfully.']);
    }

    public function exportReport(Dataset $dataset): \Illuminate\Http\Response
    {
        $originalData = $dataset->original_data;
        $cleanedData = $dataset->cleaned_data ?? $originalData;
        $headers = $dataset->headers;
        $log = $dataset->cleaning_log ?? [];

        $originalQuality = $this->calculateQualityScore($headers, $originalData);
        $cleanedQuality = $this->calculateQualityScore($headers, $cleanedData);
        $insights = $this->generateInsights($headers, $cleanedData);

        $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cleaning Report - '.e($dataset->name).'</title>';
        $html .= '<style>
            body { font-family: DejaVu Sans, sans-serif; padding: 30px; color: #1a1a2e; font-size: 12px; }
            h1 { color: #16213e; border-bottom: 3px solid #0f3460; padding-bottom: 8px; font-size: 22px; }
            h2 { color: #0f3460; margin-top: 25px; font-size: 16px; }
            .scores { text-align: center; margin: 15px 0; }
            .score-card { display: inline-block; padding: 15px 25px; border-radius: 8px; margin: 5px; text-align: center; }
            .score-before { background: #fee2e2; border: 2px solid #fca5a5; }
            .score-after { background: #dcfce7; border: 2px solid #86efac; }
            .score-value { font-size: 36px; font-weight: bold; }
            .score-before .score-value { color: #dc2626; }
            .score-after .score-value { color: #16a34a; }
            .arrow { display: inline-block; padding: 15px; font-size: 24px; vertical-align: middle; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { padding: 6px 10px; border: 1px solid #e2e8f0; text-align: left; font-size: 11px; }
            th { background: #f1f5f9; font-weight: 600; }
            .log-item { padding: 6px 10px; margin: 3px 0; border-left: 3px solid #3b82f6; background: #f8fafc; }
            .log-type { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 500; background: #dbeafe; color: #1e40af; }
            .reason { color: #64748b; font-size: 10px; font-style: italic; margin-top: 3px; }
            .stats-row { overflow: hidden; margin: 10px 0; }
            .stat-box { float: left; width: 31%; margin-right: 2%; padding: 12px; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: center; }
            .stat-value { font-size: 20px; font-weight: bold; color: #0f3460; }
            .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
            .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 10px; }
        </style></head><body>';

        $html .= '<h1>Data Cleaning Report</h1>';
        $html .= '<p><strong>Dataset:</strong> '.e($dataset->name).'</p>';
        $html .= '<p><strong>Generated:</strong> '.now()->format('F j, Y g:i A').'</p>';
        $html .= '<p><strong>Original File:</strong> '.e($dataset->original_filename).'</p>';

        $html .= '<h2>Data Quality Score</h2>';
        $html .= '<div class="scores">';
        $html .= '<div class="score-card score-before"><div class="score-value">'.$originalQuality['overall'].'%</div><div>Before Cleaning</div></div>';
        $html .= '<span class="arrow">→</span>';
        $html .= '<div class="score-card score-after"><div class="score-value">'.$cleanedQuality['overall'].'%</div><div>After Cleaning</div></div>';
        $html .= '</div>';

        $html .= '<table><thead><tr><th>Metric</th><th>Before</th><th>After</th><th>Change</th></tr></thead><tbody>';
        foreach (['completeness', 'consistency', 'validity', 'uniqueness'] as $metric) {
            $before = $originalQuality[$metric];
            $after = $cleanedQuality[$metric];
            $change = $after - $before;
            $changeStr = ($change >= 0 ? '+' : '').$change.'%';
            $html .= '<tr><td>'.ucfirst($metric)."</td><td>{$before}%</td><td>{$after}%</td><td>{$changeStr}</td></tr>";
        }
        $html .= '</tbody></table>';

        $html .= '<h2>Dataset Summary</h2>';
        $html .= '<div class="stats-row">';
        $html .= '<div class="stat-box"><div class="stat-label">Original Rows</div><div class="stat-value">'.count($originalData).'</div></div>';
        $html .= '<div class="stat-box"><div class="stat-label">Cleaned Rows</div><div class="stat-value">'.count($cleanedData).'</div></div>';
        $html .= '<div class="stat-box"><div class="stat-label">Columns</div><div class="stat-value">'.count($headers).'</div></div>';
        $html .= '</div>';

        if (! empty($log)) {
            $html .= '<h2>Cleaning Steps Applied</h2>';
            foreach ($log as $entry) {
                if ($entry['type'] === 'summary') {
                    continue;
                }
                $html .= '<div class="log-item">';
                $html .= '<span class="log-type">'.e(str_replace('_', ' ', $entry['type'])).'</span> ';
                $html .= e($entry['message']);
                if (! empty($entry['reason'])) {
                    $html .= '<div class="reason">Why: '.e($entry['reason']).'</div>';
                }
                $html .= '</div>';
            }
        }

        if (! empty($insights['interpretations'])) {
            $html .= '<h2>Key Insights</h2><ul>';
            foreach ($insights['interpretations'] as $insight) {
                $html .= '<li>'.e($insight).'</li>';
            }
            $html .= '</ul>';
        }

        if (! empty($insights['summary'])) {
            $html .= '<h2>Column Statistics</h2>';
            $html .= '<table><thead><tr><th>Column</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Min</th><th>Max</th></tr></thead><tbody>';
            foreach ($insights['summary'] as $col => $stats) {
                $html .= '<tr><td>'.e($col)."</td><td>{$stats['mean']}</td><td>{$stats['median']}</td><td>{$stats['std_dev']}</td><td>{$stats['min']}</td><td>{$stats['max']}</td></tr>";
            }
            $html .= '</tbody></table>';
        }

        $html .= '<div class="footer">Generated by InsightFlow — Data Cleaning & Analytics System</div>';
        $html .= '</body></html>';

        $filename = str_replace(' ', '_', $dataset->name).'_cleaning_report.pdf';

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');

        return $pdf->download($filename);
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<string, mixed>>  $data
     * @return array<string, int>
     */
    private function calculateQualityScore(array $headers, array $data): array
    {
        $totalCells = count($data) * count($headers);
        if ($totalCells === 0) {
            return ['overall' => 0, 'completeness' => 0, 'consistency' => 0, 'validity' => 0, 'uniqueness' => 0];
        }

        // Completeness: % of non-empty cells
        $filled = 0;
        foreach ($data as $row) {
            foreach ($headers as $h) {
                if (isset($row[$h]) && $row[$h] !== '' && $row[$h] !== null) {
                    $filled++;
                }
            }
        }
        $completeness = round(($filled / $totalCells) * 100);

        // Consistency: % of text columns with consistent casing/formatting
        $consistentCols = 0;
        $textCols = 0;
        foreach ($headers as $h) {
            $values = array_filter(array_column($data, $h), fn ($v) => $v !== null && $v !== '' && ! is_numeric($v));
            if (count($values) < 2) {
                continue;
            }
            $textCols++;
            $lowered = array_map(fn ($v) => strtolower(trim((string) $v)), $values);
            $uniqueOriginal = count(array_unique($values));
            $uniqueLowered = count(array_unique($lowered));
            if ($uniqueOriginal === $uniqueLowered) {
                $consistentCols++;
            }
        }
        $consistency = $textCols > 0 ? round(($consistentCols / $textCols) * 100) : 100;

        // Validity: % of values that are valid (numeric cols have actual numbers, no negatives in price cols)
        $validCells = 0;
        $checkedCells = 0;
        foreach ($headers as $h) {
            $lowerH = strtolower($h);
            foreach ($data as $row) {
                $val = $row[$h] ?? null;
                if ($val === null || $val === '') {
                    continue;
                }
                $checkedCells++;
                $isValid = true;
                if (in_array($lowerH, ['age', 'edad', 'years'])) {
                    $isValid = is_numeric($val) && (float) $val >= 0 && (float) $val <= 150;
                } elseif (in_array($lowerH, ['price', 'amount', 'cost', 'salary', 'revenue'])) {
                    $isValid = is_numeric($val) && (float) $val >= 0;
                }
                if ($isValid) {
                    $validCells++;
                }
            }
        }
        $validity = $checkedCells > 0 ? round(($validCells / $checkedCells) * 100) : 100;

        // Uniqueness: 100 - duplicate row %
        $uniqueRows = count(array_unique(array_map('serialize', $data)));
        $uniqueness = count($data) > 0 ? round(($uniqueRows / count($data)) * 100) : 100;

        $overall = round(($completeness + $consistency + $validity + $uniqueness) / 4);

        return [
            'overall' => $overall,
            'completeness' => $completeness,
            'consistency' => $consistency,
            'validity' => $validity,
            'uniqueness' => $uniqueness,
        ];
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
            'quality_score' => $this->calculateQualityScore($headers, $data),
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

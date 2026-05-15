<?php

use App\Models\Dataset;
use App\Models\User;

test('cleaning report can be exported', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Age'],
        'original_data' => [
            ['Name' => 'Alice', 'Age' => '25'],
            ['Name' => 'Bob', 'Age' => '30'],
        ],
        'cleaned_data' => [
            ['Name' => 'Alice', 'Age' => '25'],
        ],
        'cleaning_log' => [
            ['type' => 'remove_duplicates', 'message' => 'Removed 1 duplicate row.', 'reason' => 'Duplicates skew analysis.'],
        ],
        'row_count' => 1,
        'column_count' => 2,
    ]);

    $response = $this->get(route('datasets.export-report', $dataset));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/pdf');
});

test('cleaning report includes quality scores', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Price'],
        'original_data' => [
            ['Name' => 'Widget', 'Price' => '10'],
            ['Name' => '', 'Price' => '-5'],
        ],
        'cleaned_data' => [
            ['Name' => 'Widget', 'Price' => '10'],
        ],
        'cleaning_log' => [],
        'row_count' => 1,
        'column_count' => 2,
    ]);

    $response = $this->get(route('datasets.export-report', $dataset));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/pdf');
});

test('auto clean log includes reason explanations', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Age', 'City'],
        'original_data' => [
            ['Name' => 'Alice', 'Age' => '30', 'City' => 'New York'],
            ['Name' => 'Bob', 'Age' => '25', 'City' => 'london'],
            ['Name' => 'Alice', 'Age' => '30', 'City' => 'New York'],
        ],
        'row_count' => 3,
        'column_count' => 3,
    ]);

    $this->post("/datasets/{$dataset->id}/auto-clean");

    $dataset->refresh();

    $hasReason = collect($dataset->cleaning_log)->contains(fn ($entry) => ! empty($entry['reason']));
    expect($hasReason)->toBeTrue();
});

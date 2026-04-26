<?php

use App\Models\Dataset;

test('visualize page renders successfully with dataset data', function () {
    $dataset = Dataset::factory()->create([
        'headers' => ['Category', 'Amount'],
        'original_data' => [
            ['Category' => 'Food', 'Amount' => '100'],
            ['Category' => 'Transport', 'Amount' => '50'],
            ['Category' => 'Food', 'Amount' => '75'],
        ],
        'row_count' => 3,
        'column_count' => 2,
    ]);

    $response = $this->get(route('datasets.visualize', $dataset));

    $response->assertOk();
    $response->assertInertiaComponent('datasets/visualize');
    $response->assertInertiaHas('dataset.id', $dataset->id);
    $response->assertInertiaHas('dataset.headers', ['Category', 'Amount']);
    $response->assertInertiaHas('data');
});

test('visualize page uses cleaned data when available', function () {
    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Score'],
        'original_data' => [
            ['Name' => 'Alice', 'Score' => '90'],
            ['Name' => 'Bob', 'Score' => '85'],
        ],
        'cleaned_data' => [
            ['Name' => 'Alice', 'Score' => '90'],
        ],
        'row_count' => 2,
        'column_count' => 2,
    ]);

    $response = $this->get(route('datasets.visualize', $dataset));

    $response->assertOk();
    $data = $response->viewData('page')['props']['data'];
    expect($data)->toHaveCount(1);
    expect($data[0]['Name'])->toBe('Alice');
});

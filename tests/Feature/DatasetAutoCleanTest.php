<?php

use App\Models\Dataset;
use App\Models\User;

test('auto clean handles missing values duplicates and standardization', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Age', 'City'],
        'original_data' => [
            ['Name' => 'Alice', 'Age' => '30', 'City' => 'New York'],
            ['Name' => 'Bob', 'Age' => '25', 'City' => 'london'],
            ['Name' => 'Charlie', 'Age' => '', 'City' => 'Paris'],
            ['Name' => 'Alice', 'Age' => '30', 'City' => 'New York'], // duplicate
            ['Name' => '  Dave  ', 'Age' => '40', 'City' => '  Berlin  '],
            ['Name' => 'Eve', 'Age' => null, 'City' => 'London'],
        ],
        'row_count' => 6,
        'column_count' => 3,
    ]);

    $response = $this->post("/datasets/{$dataset->id}/auto-clean");

    $response->assertRedirect("/datasets/{$dataset->id}/compare");

    $dataset->refresh();

    expect($dataset->cleaned_data)->not->toBeNull();
    expect($dataset->cleaning_log)->not->toBeNull();

    // Should have fewer rows than original (duplicates removed)
    expect(count($dataset->cleaned_data))->toBeLessThan(6);

    // All cleaned rows should have non-empty Age values (filled with mean)
    foreach ($dataset->cleaned_data as $row) {
        expect($row['Age'])->not->toBeEmpty();
    }
});

test('auto clean caps outliers using iqr method', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Score'],
        'original_data' => [
            ['Name' => 'A', 'Score' => '50'],
            ['Name' => 'B', 'Score' => '55'],
            ['Name' => 'C', 'Score' => '60'],
            ['Name' => 'D', 'Score' => '52'],
            ['Name' => 'E', 'Score' => '58'],
            ['Name' => 'F', 'Score' => '1000'], // outlier
            ['Name' => 'G', 'Score' => '53'],
            ['Name' => 'H', 'Score' => '57'],
        ],
        'row_count' => 8,
        'column_count' => 2,
    ]);

    $response = $this->post("/datasets/{$dataset->id}/auto-clean");

    $response->assertRedirect("/datasets/{$dataset->id}/compare");

    $dataset->refresh();

    // The outlier value of 1000 should have been capped
    $scores = array_column($dataset->cleaned_data, 'Score');
    foreach ($scores as $score) {
        expect((float) $score)->toBeLessThan(1000);
    }
});

test('auto clean filters invalid ages', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Age'],
        'original_data' => [
            ['Name' => 'Alice', 'Age' => '25'],
            ['Name' => 'Bob', 'Age' => '-5'], // invalid negative age
            ['Name' => 'Charlie', 'Age' => '30'],
            ['Name' => 'Dave', 'Age' => '200'], // invalid age > 150
        ],
        'row_count' => 4,
        'column_count' => 2,
    ]);

    $response = $this->post("/datasets/{$dataset->id}/auto-clean");

    $response->assertRedirect("/datasets/{$dataset->id}/compare");

    $dataset->refresh();

    // Invalid ages should have been removed
    expect(count($dataset->cleaned_data))->toBeLessThanOrEqual(3);
});

test('auto clean generates total column for price and quantity', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Product', 'Price', 'Quantity'],
        'original_data' => [
            ['Product' => 'Widget', 'Price' => '10', 'Quantity' => '5'],
            ['Product' => 'Gadget', 'Price' => '20', 'Quantity' => '3'],
        ],
        'row_count' => 2,
        'column_count' => 3,
    ]);

    $response = $this->post("/datasets/{$dataset->id}/auto-clean");

    $response->assertRedirect("/datasets/{$dataset->id}/compare");

    $dataset->refresh();

    // Should have generated a Total column
    expect($dataset->headers)->toContain('Total');

    // Verify calculated values
    $firstRow = $dataset->cleaned_data[0];
    expect((float) $firstRow['Total'])->toBe(50.0); // 10 * 5
});

test('dataset pages render successfully', function () {
    $this->actingAs(User::factory()->create());

    $response = $this->get('/');
    $response->assertStatus(200);
});

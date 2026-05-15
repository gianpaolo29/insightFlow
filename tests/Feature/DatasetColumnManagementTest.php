<?php

use App\Models\Dataset;
use App\Models\User;

test('columns can be renamed', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Age'],
        'original_data' => [
            ['Name' => 'Alice', 'Age' => '25'],
            ['Name' => 'Bob', 'Age' => '30'],
        ],
        'row_count' => 2,
        'column_count' => 2,
    ]);

    $response = $this->post(route('datasets.rename-columns', $dataset), [
        'columns' => ['Full Name', 'Years Old'],
    ]);

    $response->assertRedirect();

    $dataset->refresh();
    expect($dataset->headers)->toBe(['Full Name', 'Years Old']);
    expect($dataset->original_data[0]['Full Name'])->toBe('Alice');
    expect($dataset->original_data[0]['Years Old'])->toBe('25');
});

test('rename fails with wrong column count', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Age'],
        'original_data' => [
            ['Name' => 'Alice', 'Age' => '25'],
        ],
        'row_count' => 1,
        'column_count' => 2,
    ]);

    $response = $this->post(route('datasets.rename-columns', $dataset), [
        'columns' => ['Only One'],
    ]);

    $response->assertRedirect();

    $dataset->refresh();
    expect($dataset->headers)->toBe(['Name', 'Age']);
});

test('columns can be reordered', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Age', 'City'],
        'original_data' => [
            ['Name' => 'Alice', 'Age' => '25', 'City' => 'NY'],
        ],
        'row_count' => 1,
        'column_count' => 3,
    ]);

    $response = $this->post(route('datasets.reorder-columns', $dataset), [
        'order' => ['City', 'Name', 'Age'],
    ]);

    $response->assertRedirect();

    $dataset->refresh();
    expect($dataset->headers)->toBe(['City', 'Name', 'Age']);
});

test('reorder fails with invalid columns', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Age'],
        'original_data' => [
            ['Name' => 'Alice', 'Age' => '25'],
        ],
        'row_count' => 1,
        'column_count' => 2,
    ]);

    $response = $this->post(route('datasets.reorder-columns', $dataset), [
        'order' => ['Name', 'NonExistent'],
    ]);

    $response->assertRedirect();

    $dataset->refresh();
    expect($dataset->headers)->toBe(['Name', 'Age']);
});

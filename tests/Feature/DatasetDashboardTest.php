<?php

use App\Models\Dataset;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('dashboard page renders with dataset data', function () {
    $this->actingAs(User::factory()->create());

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

    $response = $this->get(route('datasets.dashboard', $dataset));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('datasets/dashboard')
        ->has('dataset.id')
        ->has('data')
        ->has('insights')
        ->has('qualityScore.overall')
    );
});

test('dashboard uses cleaned data when available', function () {
    $this->actingAs(User::factory()->create());

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

    $response = $this->get(route('datasets.dashboard', $dataset));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->has('data', 1)
    );
});

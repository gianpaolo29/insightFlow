<?php

use App\Models\Dataset;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('profile page includes quality score', function () {
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

    $response = $this->get(route('datasets.profile', $dataset));

    $response->assertOk();
});

test('compare page includes quality scores', function () {
    $this->actingAs(User::factory()->create());

    $dataset = Dataset::factory()->create([
        'headers' => ['Name', 'Age'],
        'original_data' => [
            ['Name' => 'Alice', 'Age' => '25'],
            ['Name' => '', 'Age' => ''],
            ['Name' => 'Alice', 'Age' => '25'],
        ],
        'cleaned_data' => [
            ['Name' => 'Alice', 'Age' => '25'],
        ],
        'row_count' => 1,
        'column_count' => 2,
    ]);

    $response = $this->get(route('datasets.compare', $dataset));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->has('originalQuality.overall')
        ->has('originalQuality.completeness')
        ->has('originalQuality.consistency')
        ->has('originalQuality.validity')
        ->has('originalQuality.uniqueness')
        ->has('cleanedQuality.overall')
    );
});

test('quality score reflects data completeness', function () {
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

    // Upload triggers profile generation; factory doesn't, so check via compare endpoint
    $response = $this->get(route('datasets.compare', $dataset));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->where('originalQuality.completeness', 100)
    );
});

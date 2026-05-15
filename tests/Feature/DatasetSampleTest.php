<?php

use App\Models\Dataset;
use App\Models\User;

test('sample datasets can be loaded', function () {
    $this->actingAs(User::factory()->create());

    $response = $this->post(route('datasets.sample'));

    $response->assertRedirect();
    $response->assertSessionHas('toast');

    expect(Dataset::count())->toBe(2);
    expect(Dataset::where('name', 'like', '%(Sample)%')->count())->toBe(2);
});

test('sample datasets have valid data', function () {
    $this->actingAs(User::factory()->create());

    $this->post(route('datasets.sample'));

    $salesDataset = Dataset::where('name', 'Sales Data (Sample)')->first();
    expect($salesDataset)->not->toBeNull();
    expect($salesDataset->headers)->toContain('Product');
    expect($salesDataset->headers)->toContain('Price');
    expect($salesDataset->row_count)->toBeGreaterThan(0);
    expect($salesDataset->profile)->not->toBeNull();

    $studentDataset = Dataset::where('name', 'Student Grades (Sample)')->first();
    expect($studentDataset)->not->toBeNull();
    expect($studentDataset->headers)->toContain('Name');
    expect($studentDataset->headers)->toContain('Score');
});

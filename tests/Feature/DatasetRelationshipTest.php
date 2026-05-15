<?php

use App\Models\Dataset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('can add a relationship between datasets', function () {
    $this->actingAs(User::factory()->create());

    $parent = Dataset::factory()->create();
    $child = Dataset::factory()->create();

    $response = $this->post(route('datasets.add-relationship', $parent), [
        'related_dataset_id' => $child->id,
        'type' => 'related',
        'description' => 'Test relationship',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('dataset_relationships', [
        'parent_dataset_id' => $parent->id,
        'child_dataset_id' => $child->id,
        'type' => 'related',
        'description' => 'Test relationship',
    ]);
});

test('can remove a relationship between datasets', function () {
    $this->actingAs(User::factory()->create());

    $parent = Dataset::factory()->create();
    $child = Dataset::factory()->create();

    $parent->relatedDatasets()->attach($child->id, [
        'type' => 'related',
        'description' => 'Test',
    ]);

    $response = $this->delete(route('datasets.remove-relationship', [$parent, $child]));

    $response->assertRedirect();
    $this->assertDatabaseMissing('dataset_relationships', [
        'parent_dataset_id' => $parent->id,
        'child_dataset_id' => $child->id,
    ]);
});

test('cannot add duplicate relationship', function () {
    $this->actingAs(User::factory()->create());

    $parent = Dataset::factory()->create();
    $child = Dataset::factory()->create();

    $parent->relatedDatasets()->attach($child->id, [
        'type' => 'related',
        'description' => 'First',
    ]);

    $response = $this->post(route('datasets.add-relationship', $parent), [
        'related_dataset_id' => $child->id,
        'type' => 'derived',
        'description' => 'Duplicate',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('toast.type', 'error');
});

test('dataset model has relationship methods', function () {
    $this->actingAs(User::factory()->create());

    $parent = Dataset::factory()->create();
    $child = Dataset::factory()->create();

    $parent->relatedDatasets()->attach($child->id, [
        'type' => 'derived',
        'description' => 'Child derived from parent',
    ]);

    expect($parent->relatedDatasets)->toHaveCount(1);
    expect($parent->relatedDatasets->first()->id)->toBe($child->id);
    expect($parent->relatedDatasets->first()->pivot->type)->toBe('derived');
    expect($child->parentDatasets)->toHaveCount(1);
    expect($child->parentDatasets->first()->id)->toBe($parent->id);
});

test('relationship validation rejects invalid type', function () {
    $this->actingAs(User::factory()->create());

    $parent = Dataset::factory()->create();
    $child = Dataset::factory()->create();

    $response = $this->post(route('datasets.add-relationship', $parent), [
        'related_dataset_id' => $child->id,
        'type' => 'invalid_type',
        'description' => 'Test',
    ]);

    $response->assertSessionHasErrors('type');
});

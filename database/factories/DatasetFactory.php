<?php

namespace Database\Factories;

use App\Models\Dataset;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Dataset>
 */
class DatasetFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'user_id' => null,
            'original_filename' => fake()->word().'.csv',
            'file_path' => 'datasets/'.fake()->uuid().'.csv',
            'file_type' => 'csv',
            'row_count' => 10,
            'column_count' => 3,
            'headers' => ['Name', 'Age', 'City'],
            'original_data' => [
                ['Name' => 'Alice', 'Age' => '30', 'City' => 'New York'],
                ['Name' => 'Bob', 'Age' => '25', 'City' => 'London'],
                ['Name' => 'Charlie', 'Age' => '', 'City' => 'Paris'],
            ],
            'cleaned_data' => null,
            'cleaning_log' => null,
            'profile' => null,
        ];
    }
}

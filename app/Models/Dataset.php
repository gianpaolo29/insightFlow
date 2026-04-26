<?php

namespace App\Models;

use Database\Factories\DatasetFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Dataset extends Model
{
    /** @use HasFactory<DatasetFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'original_filename',
        'file_path',
        'file_type',
        'row_count',
        'column_count',
        'headers',
        'original_data',
        'cleaned_data',
        'cleaning_log',
        'profile',
    ];

    /**
     * @return BelongsToMany<self, $this>
     */
    public function relatedDatasets(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'dataset_relationships', 'parent_dataset_id', 'child_dataset_id')
            ->withPivot('type', 'description')
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<self, $this>
     */
    public function parentDatasets(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'dataset_relationships', 'child_dataset_id', 'parent_dataset_id')
            ->withPivot('type', 'description')
            ->withTimestamps();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'headers' => 'array',
            'original_data' => 'array',
            'cleaned_data' => 'array',
            'cleaning_log' => 'array',
            'profile' => 'array',
        ];
    }
}

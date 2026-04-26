<?php

namespace App\Models;

use Database\Factories\DatasetFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

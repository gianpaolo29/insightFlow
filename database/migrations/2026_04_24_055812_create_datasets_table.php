<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('datasets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('original_filename');
            $table->string('file_path');
            $table->string('file_type');
            $table->unsignedInteger('row_count')->default(0);
            $table->unsignedInteger('column_count')->default(0);
            $table->json('headers')->nullable();
            $table->json('original_data')->nullable();
            $table->json('cleaned_data')->nullable();
            $table->json('cleaning_log')->nullable();
            $table->json('profile')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('datasets');
    }
};

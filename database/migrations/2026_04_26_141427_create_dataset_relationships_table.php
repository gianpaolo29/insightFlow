<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('dataset_relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_dataset_id')->constrained('datasets')->cascadeOnDelete();
            $table->foreignId('child_dataset_id')->constrained('datasets')->cascadeOnDelete();
            $table->string('type')->default('related'); // related, derived, merged, subset
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['parent_dataset_id', 'child_dataset_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dataset_relationships');
    }
};

<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\ToArray;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class DatasetImport implements ToArray, WithHeadingRow
{
    /** @var array<int, array<string, mixed>> */
    public array $data = [];

    /** @var array<int, string> */
    public array $headers = [];

    /**
     * @param  array<int, array<int, array<string, mixed>>>  $rows
     */
    public function array(array $rows): void
    {
        if (empty($rows)) {
            return;
        }

        $this->data = $rows;

        if (! empty($rows[0])) {
            $this->headers = array_keys($rows[0]);
        }
    }
}

<?php

namespace App\Filament\Support;

use Illuminate\Database\Eloquent\Model;

/**
 * Clés primaires numériques : une adresse comme /admin/quotes/create ou /admin/solutions/abc/edit
 * répond 404 au lieu de provoquer une erreur SQL (PostgreSQL refuse « abc » pour un bigint).
 */
trait NumericRecordKey
{
    protected function resolveRecord(int|string $key): Model
    {
        abort_unless(ctype_digit((string) $key), 404);

        return parent::resolveRecord($key);
    }
}

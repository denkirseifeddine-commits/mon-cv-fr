<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class Sql
{
    /** Opérateur LIKE insensible à la casse : ILIKE sur PostgreSQL, LIKE ailleurs (SQLite l'est déjà pour l'ASCII). */
    public static function likeOperator(): string
    {
        return DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
    }

    public static function likePattern(string $term): string
    {
        return '%' . addcslashes($term, '\\%_') . '%';
    }
}

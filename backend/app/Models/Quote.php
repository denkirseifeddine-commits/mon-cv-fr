<?php

namespace App\Models;

use App\Enums\QuoteStatus;
use Illuminate\Database\Eloquent\Model;

/**
 * Demande de devis reçue par POST /api/v1/quotes.
 * Aucune adresse IP n'est conservée.
 */
class Quote extends Model
{
    protected $fillable = [
        'reference', 'name', 'email', 'phone', 'need', 'deadline', 'budget', 'message',
        'locale', 'solution_slug', 'consent_at', 'status', 'internal_notes',
    ];

    protected function casts(): array
    {
        return [
            'consent_at' => 'datetime',
            'status' => QuoteStatus::class,
        ];
    }
}

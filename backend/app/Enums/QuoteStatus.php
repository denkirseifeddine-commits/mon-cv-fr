<?php

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum QuoteStatus: string implements HasColor, HasLabel
{
    case New = 'new';
    case InProgress = 'in_progress';
    case Answered = 'answered';
    case Archived = 'archived';

    public function getLabel(): string
    {
        return match ($this) {
            self::New => 'Nouvelle',
            self::InProgress => 'En cours',
            self::Answered => 'Répondue',
            self::Archived => 'Archivée',
        };
    }

    public function getColor(): string|array|null
    {
        return match ($this) {
            self::New => 'info',
            self::InProgress => 'warning',
            self::Answered => 'success',
            self::Archived => 'gray',
        };
    }
}

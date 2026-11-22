<?php

namespace App\Enums;

use Filament\Support\Colors\Color;
use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

/**
 * Statut d'une catégorie ou d'une solution (docs/CONTENT-MODEL.md).
 * - draft : brouillon, jamais public ;
 * - exemple : fiche d'exemple, non commercialisée (affichée avec la mention) ;
 * - published : solution disponible ;
 * - archived : retirée, jamais publique.
 */
enum ContentStatus: string implements HasColor, HasLabel
{
    case Draft = 'draft';
    case Exemple = 'exemple';
    case Published = 'published';
    case Archived = 'archived';

    public function getLabel(): string
    {
        return match ($this) {
            self::Draft => 'Brouillon',
            self::Exemple => 'Exemple (non commercialisé)',
            self::Published => 'Publié',
            self::Archived => 'Archivé',
        };
    }

    public function getColor(): string|array|null
    {
        return match ($this) {
            self::Draft => 'gray',
            self::Exemple => 'warning',
            self::Published => 'success',
            self::Archived => 'danger',
        };
    }

    /** Statuts visibles par le public. */
    public static function publicValues(): array
    {
        return [self::Exemple->value, self::Published->value];
    }
}

<?php

namespace App\Filament\Support;

use Filament\AvatarProviders\Contracts\AvatarProvider;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;

/**
 * Avatar généré localement (SVG avec l'initiale) : évite d'envoyer le nom de
 * l'administrateur à un service tiers (ui-avatars.com, fournisseur par défaut de Filament).
 */
class LocalAvatarProvider implements AvatarProvider
{
    public function get(Model|Authenticatable $record): string
    {
        $name = method_exists($record, 'getFilamentName') ? $record->getFilamentName() : (string) ($record->name ?? '?');
        $initial = htmlspecialchars(mb_strtoupper(mb_substr(trim($name) ?: '?', 0, 1)), ENT_QUOTES);
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#09090b"/>'
            . '<text x="32" y="42" font-family="sans-serif" font-size="30" text-anchor="middle" fill="#fff">' . $initial . '</text></svg>';

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }
}

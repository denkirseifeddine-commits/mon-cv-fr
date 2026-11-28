<?php

namespace App\Filament\Resources\Projects\Schemas;

use App\Filament\Support\Multilingual;
use Filament\Forms\Components\TagsInput;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class ProjectForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Identification')->columns(3)->schema([
                TextInput::make('name')->label('Nom')->required()->maxLength(150),
                TextInput::make('slug')->label('Identifiant (slug)')->required()->maxLength(80)
                    ->regex('/^[a-z0-9-]+$/')->unique(ignoreRecord: true),
                TextInput::make('sort_order')->label('Ordre d\'affichage')->numeric()->minValue(0)->default(0),
                TextInput::make('client')->label('Client')->maxLength(255),
                TextInput::make('period')->label('Période (ex. 2025)')->maxLength(50),
                Toggle::make('featured')->label('À la une'),
                TextInput::make('url')->label('Adresse publique')->url()->maxLength(2048)->columnSpan(2),
            ]),
            Section::make('Textes')->schema([
                Multilingual::tabs('category', 'Catégorie du projet', maxLength: 150),
                Multilingual::tabs('summary', 'Résumé', textarea: true, rows: 4),
            ]),
            Section::make('Compléments')->columns(2)->schema([
                TagsInput::make('technologies')->label('Technologies (uniquement celles nommées dans le résumé)')->columnSpanFull(),
                TextInput::make('media.desktop')->label('Capture ordinateur (chemin)')->placeholder('assets/projets/x-desktop.jpg'),
                TextInput::make('media.mobile')->label('Capture mobile (chemin)')->placeholder('assets/projets/x-mobile.jpg'),
                TagsInput::make('missing')->label('Informations à fournir par le propriétaire (ex. role, period, media, url)')->columnSpanFull(),
            ]),
        ]);
    }
}

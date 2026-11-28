<?php

namespace App\Filament\Resources\Categories\Schemas;

use App\Enums\ContentStatus;
use App\Filament\Support\Multilingual;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class CategoryForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Identification')->columns(3)->schema([
                TextInput::make('slug')
                    ->label('Identifiant (slug)')
                    ->helperText('Minuscules, chiffres et tirets. Utilisé par le site et les solutions : ne pas le changer à la légère.')
                    ->required()
                    ->maxLength(80)
                    ->regex('/^[a-z0-9-]+$/')
                    ->unique(ignoreRecord: true),
                TextInput::make('sort_order')
                    ->label('Ordre d\'affichage')
                    ->numeric()
                    ->minValue(0)
                    ->default(0)
                    ->required(),
                Select::make('status')
                    ->label('Statut')
                    ->options(ContentStatus::class)
                    ->default(ContentStatus::Draft->value)
                    ->required()
                    ->native(false),
            ]),
            Section::make('Textes')->schema([
                Multilingual::tabs('label', 'Libellé', maxLength: 120),
                Multilingual::tabs('description', 'Description', textarea: true, required: false, rows: 3),
            ]),
        ]);
    }
}

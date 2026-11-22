<?php

namespace App\Filament\Resources\Quotes;

use App\Enums\QuoteStatus;
use App\Filament\Resources\Quotes\Pages\EditQuote;
use App\Filament\Resources\Quotes\Pages\ListQuotes;
use App\Filament\Resources\Quotes\Pages\ViewQuote;
use App\Filament\Resources\Quotes\Tables\QuotesTable;
use App\Models\Quote;
use App\Support\QuoteCodes;
use BackedEnum;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;
use UnitEnum;

/**
 * Demandes de devis reçues par l'API : consultation, statut et notes internes.
 * Pas de création manuelle ; les coordonnées du visiteur ne sont pas modifiables.
 */
class QuoteResource extends Resource
{
    protected static ?string $model = Quote::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedInbox;

    protected static ?string $modelLabel = 'demande de devis';

    protected static ?string $pluralModelLabel = 'demandes de devis';

    protected static ?string $navigationLabel = 'Demandes de devis';

    protected static string|UnitEnum|null $navigationGroup = 'Demandes';

    protected static ?int $navigationSort = 1;

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getNavigationBadge(): ?string
    {
        $count = Quote::query()->where('status', QuoteStatus::New->value)->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getRecordTitle(?Model $record): ?string
    {
        return $record?->reference;
    }

    /** Formulaire de modification : statut et notes internes uniquement. */
    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Suivi')->schema([
                Select::make('status')->label('Statut')->options(QuoteStatus::class)->required()->native(false),
                Textarea::make('internal_notes')->label('Notes internes (jamais communiquées au visiteur)')->rows(6)->maxLength(10000),
            ]),
        ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Demande')->columns(3)->schema([
                TextEntry::make('reference')->label('Référence')->copyable(),
                TextEntry::make('status')->label('Statut')->badge(),
                TextEntry::make('created_at')->label('Reçue le')->dateTime('d/m/Y H:i'),
                TextEntry::make('name')->label('Nom'),
                TextEntry::make('email')->label('E-mail')->copyable(),
                TextEntry::make('phone')->label('Téléphone')->placeholder('—'),
                TextEntry::make('need')->label('Besoin')->formatStateUsing(fn ($state) => QuoteCodes::NEEDS[$state] ?? $state),
                TextEntry::make('deadline')->label('Délai')->formatStateUsing(fn ($state) => QuoteCodes::DEADLINES[$state] ?? $state)->placeholder('—'),
                TextEntry::make('budget')->label('Budget indicatif')->placeholder('—'),
                TextEntry::make('locale')->label('Langue du visiteur')->formatStateUsing(fn ($state) => QuoteCodes::LOCALES[$state] ?? $state),
                TextEntry::make('solution_slug')->label('Solution du catalogue')->placeholder('—'),
                TextEntry::make('consent_at')->label('Consentement donné le')->dateTime('d/m/Y H:i'),
                TextEntry::make('message')->label('Message')->columnSpanFull()->extraAttributes(['style' => 'white-space: pre-wrap']),
            ]),
            Section::make('Notes internes')->schema([
                TextEntry::make('internal_notes')->hiddenLabel()->placeholder('Aucune note.')->extraAttributes(['style' => 'white-space: pre-wrap']),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return QuotesTable::configure($table);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListQuotes::route('/'),
            'view' => ViewQuote::route('/{record}'),
            'edit' => EditQuote::route('/{record}/edit'),
        ];
    }
}

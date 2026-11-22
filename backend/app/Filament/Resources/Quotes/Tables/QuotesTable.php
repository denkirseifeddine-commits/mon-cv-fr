<?php

namespace App\Filament\Resources\Quotes\Tables;

use App\Enums\QuoteStatus;
use App\Models\Quote;
use App\Support\Sql;
use App\Support\QuoteCodes;
use Filament\Actions\Action;
use Filament\Actions\BulkAction;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\Select;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class QuotesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('reference')->label('Référence')->searchable()->copyable(),
                TextColumn::make('created_at')->label('Reçue le')->dateTime('d/m/Y H:i')->sortable(),
                TextColumn::make('name')->label('Nom')->searchable(query: fn (Builder $query, string $search) => $query->where(fn (Builder $q) => $q
                    ->where('name', Sql::likeOperator(), Sql::likePattern($search))
                    ->orWhere('email', Sql::likeOperator(), Sql::likePattern($search))))
                    ->description(fn (Quote $record) => $record->email),
                TextColumn::make('need')->label('Besoin')->formatStateUsing(fn ($state) => QuoteCodes::NEEDS[$state] ?? $state),
                TextColumn::make('status')->label('Statut')->badge(),
            ])
            ->filters([
                SelectFilter::make('status')->label('Statut')->options(QuoteStatus::class)->multiple(),
                SelectFilter::make('need')->label('Besoin')->options(QuoteCodes::NEEDS),
            ])
            ->recordActions([
                ViewAction::make()->label('Voir'),
                Action::make('setStatus')
                    ->label('Changer le statut')
                    ->icon('heroicon-o-arrow-path')
                    ->schema([
                        Select::make('status')->label('Statut')->options(QuoteStatus::class)->required()->native(false),
                    ])
                    ->fillForm(fn (Quote $record) => ['status' => $record->status->value])
                    ->action(fn (Quote $record, array $data) => $record->update(['status' => $data['status']])),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    BulkAction::make('archive')
                        ->label('Archiver')
                        ->icon('heroicon-o-archive-box')
                        ->requiresConfirmation()
                        ->action(fn (Collection $records) => $records->each->update(['status' => QuoteStatus::Archived->value])),
                ]),
            ])
            ->emptyStateHeading('Aucune demande de devis');
    }
}

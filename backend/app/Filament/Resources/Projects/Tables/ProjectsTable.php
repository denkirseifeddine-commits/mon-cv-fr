<?php

namespace App\Filament\Resources\Projects\Tables;

use App\Support\Sql;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ProjectsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('sort_order')
            ->reorderable('sort_order')
            ->columns([
                TextColumn::make('sort_order')->label('Ordre')->sortable(),
                TextColumn::make('name')->label('Nom')->description(fn ($record) => $record->slug)
                    ->searchable(query: fn (Builder $query, string $search) => $query->where(fn (Builder $q) => $q
                        ->where('name', Sql::likeOperator(), Sql::likePattern($search))
                        ->orWhere('slug', Sql::likeOperator(), Sql::likePattern($search))
                        ->orWhere('client', Sql::likeOperator(), Sql::likePattern($search)))),
                TextColumn::make('category.fr')->label('Catégorie'),
                TextColumn::make('client')->label('Client')->limit(40),
                TextColumn::make('period')->label('Période'),
                IconColumn::make('featured')->label('À la une')->boolean(),
            ])
            ->filters([
                TernaryFilter::make('featured')->label('À la une'),
            ])
            ->recordActions([EditAction::make()->label('Modifier')])
            ->toolbarActions([
                BulkActionGroup::make([DeleteBulkAction::make()]),
            ])
            ->emptyStateHeading('Aucun projet');
    }
}

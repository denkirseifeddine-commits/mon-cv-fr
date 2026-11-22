<?php

namespace App\Filament\Resources\Categories\Tables;

use App\Enums\ContentStatus;
use App\Support\Sql;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class CategoriesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('sort_order')
            ->reorderable('sort_order')
            ->columns([
                TextColumn::make('sort_order')->label('Ordre')->sortable(),
                TextColumn::make('label.fr')
                    ->label('Libellé')
                    ->searchable(query: fn (Builder $query, string $search) => $query
                        ->where(fn (Builder $q) => $q
                            ->where('label->fr', Sql::likeOperator(), Sql::likePattern($search))
                            ->orWhere('slug', Sql::likeOperator(), Sql::likePattern($search)))),
                TextColumn::make('slug')->label('Slug')->color('gray'),
                TextColumn::make('status')->label('Statut')->badge(),
                TextColumn::make('solutions_count')->label('Solutions')->counts('solutions'),
            ])
            ->filters([
                SelectFilter::make('status')->label('Statut')->options(ContentStatus::class),
            ])
            ->recordActions([EditAction::make()->label('Modifier')])
            ->toolbarActions([
                BulkActionGroup::make([DeleteBulkAction::make()]),
            ])
            ->emptyStateHeading('Aucune catégorie');
    }
}

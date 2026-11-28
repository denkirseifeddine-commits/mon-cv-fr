<?php

namespace App\Filament\Resources\Solutions\Tables;

use App\Enums\ContentStatus;
use App\Filament\Support\Multilingual;
use App\Support\Sql;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class SolutionsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('sort_order')
            ->reorderable('sort_order')
            ->modifyQueryUsing(fn (Builder $query) => $query->with('category'))
            ->columns([
                TextColumn::make('sort_order')->label('Ordre')->sortable(),
                TextColumn::make('name.fr')
                    ->label('Nom')
                    ->description(fn ($record) => $record->slug)
                    ->searchable(query: function (Builder $query, string $search) {
                        $op = Sql::likeOperator();
                        $pattern = Sql::likePattern($search);
                        $query->where(function (Builder $q) use ($op, $pattern) {
                            $q->where('slug', $op, $pattern);
                            foreach (['name', 'short_description'] as $column) {
                                foreach (array_keys(Multilingual::LOCALES) as $locale) {
                                    $q->orWhere("$column->$locale", $op, $pattern);
                                }
                            }
                        });
                    }),
                TextColumn::make('category_id')
                    ->label('Catégorie')
                    ->formatStateUsing(fn ($state, $record) => Multilingual::fr($record->category?->label, $record->category?->slug ?? '—')),
                TextColumn::make('status')->label('Statut')->badge(),
                IconColumn::make('featured')->label('À la une')->boolean(),
                TextColumn::make('updated_on')->label('Mise à jour')->date('d/m/Y')->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->label('Statut')->options(ContentStatus::class)->multiple(),
                SelectFilter::make('category_id')->label('Catégorie')->options(fn () => Multilingual::categoryOptions()),
                TernaryFilter::make('featured')->label('À la une'),
            ])
            ->recordActions([EditAction::make()->label('Modifier')])
            ->toolbarActions([
                BulkActionGroup::make([DeleteBulkAction::make()]),
            ])
            ->emptyStateHeading('Aucune solution');
    }
}

<?php

namespace App\Filament\Resources\Solutions\Pages;

use App\Filament\Resources\Solutions\SolutionResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListSolutions extends ListRecords
{
    protected static string $resource = SolutionResource::class;

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()];
    }
}

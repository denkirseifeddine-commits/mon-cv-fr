<?php

namespace App\Filament\Resources\Solutions\Pages;

use App\Filament\Resources\Solutions\Schemas\SolutionForm;
use App\Filament\Resources\Solutions\SolutionResource;
use Filament\Resources\Pages\CreateRecord;

class CreateSolution extends CreateRecord
{
    protected static string $resource = SolutionResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        return SolutionForm::normalize($data);
    }
}

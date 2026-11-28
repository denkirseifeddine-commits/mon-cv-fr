<?php

namespace App\Filament\Resources\Solutions\Pages;

use App\Filament\Resources\Solutions\Schemas\SolutionForm;
use App\Filament\Resources\Solutions\SolutionResource;
use Filament\Actions\DeleteAction;
use App\Filament\Support\NumericRecordKey;
use Filament\Resources\Pages\EditRecord;

class EditSolution extends EditRecord
{
    use NumericRecordKey;

    protected static string $resource = SolutionResource::class;

    protected function getHeaderActions(): array
    {
        return [DeleteAction::make()];
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        return SolutionForm::normalize($data);
    }
}

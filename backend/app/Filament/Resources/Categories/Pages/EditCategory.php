<?php

namespace App\Filament\Resources\Categories\Pages;

use App\Filament\Resources\Categories\CategoryResource;
use Filament\Actions\DeleteAction;
use App\Filament\Support\NumericRecordKey;
use Filament\Resources\Pages\EditRecord;

class EditCategory extends EditRecord
{
    use NumericRecordKey;

    protected static string $resource = CategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [DeleteAction::make()];
    }
}

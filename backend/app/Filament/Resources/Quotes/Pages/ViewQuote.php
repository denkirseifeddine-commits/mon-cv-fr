<?php

namespace App\Filament\Resources\Quotes\Pages;

use App\Filament\Resources\Quotes\QuoteResource;
use Filament\Actions\EditAction;
use App\Filament\Support\NumericRecordKey;
use Filament\Resources\Pages\ViewRecord;

class ViewQuote extends ViewRecord
{
    use NumericRecordKey;

    protected static string $resource = QuoteResource::class;

    protected function getHeaderActions(): array
    {
        return [EditAction::make()->label('Statut et notes')];
    }
}

<?php

namespace App\Filament\Resources\Quotes\Pages;

use App\Filament\Resources\Quotes\QuoteResource;
use App\Filament\Support\NumericRecordKey;
use Filament\Resources\Pages\EditRecord;

class EditQuote extends EditRecord
{
    use NumericRecordKey;

    protected static string $resource = QuoteResource::class;
}

<?php

namespace App\Http\Resources;

use App\Support\Localizer;
use App\Support\SiteSerializer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Category */
class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Localizer::flatten(SiteSerializer::category($this->resource), $request->query('locale'));
    }
}

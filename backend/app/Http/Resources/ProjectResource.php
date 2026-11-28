<?php

namespace App\Http\Resources;

use App\Support\Localizer;
use App\Support\SiteSerializer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Project */
class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Localizer::flatten(SiteSerializer::project($this->resource), $request->query('locale'));
    }
}

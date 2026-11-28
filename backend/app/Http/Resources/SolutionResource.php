<?php

namespace App\Http\Resources;

use App\Support\Localizer;
use App\Support\SiteSerializer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Solution publique : mêmes clés que assets/data/solutions.json.
 * Avec ?locale=xx, les textes sont aplatis dans cette langue.
 *
 * @mixin \App\Models\Solution
 */
class SolutionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = SiteSerializer::solution($this->resource);
        $data['category'] = $this->category ? [
            'slug' => $this->category->slug,
            'label' => $this->category->label,
        ] : null;

        return Localizer::flatten($data, $request->query('locale'));
    }
}

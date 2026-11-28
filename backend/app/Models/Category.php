<?php

namespace App\Models;

use App\Enums\ContentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = ['slug', 'sort_order', 'label', 'description', 'status'];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'label' => 'array',
            'description' => 'array',
            'status' => ContentStatus::class,
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Category $category) {
            if (! $category->sort_order) {
                $category->sort_order = ((int) static::query()->max('sort_order')) + 1;
            }
        });
    }

    public function solutions(): HasMany
    {
        return $this->hasMany(Solution::class);
    }

    /**
     * Catégories visibles par le public : statut exemple/published, ou brouillon contenant
     * au moins une solution publique (le site statique affiche aujourd'hui toutes les
     * catégories, dont les huit catégories « draft » des fiches d'exemple). Jamais archivée.
     */
    public function scopePublic(Builder $query): Builder
    {
        return $query
            ->where('status', '!=', ContentStatus::Archived->value)
            ->where(function (Builder $q) {
                $q->whereIn('status', ContentStatus::publicValues())
                    ->orWhereHas('solutions', fn (Builder $s) => $s->public());
            });
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }
}

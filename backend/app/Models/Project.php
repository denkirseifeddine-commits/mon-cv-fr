<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'slug', 'sort_order', 'featured', 'name', 'category', 'summary',
        'client', 'period', 'technologies', 'media', 'url', 'missing',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'featured' => 'boolean',
            'category' => 'array',
            'summary' => 'array',
            'technologies' => 'array',
            'media' => 'array',
            'missing' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Project $project) {
            if (! $project->sort_order) {
                $project->sort_order = ((int) static::query()->max('sort_order')) + 1;
            }
        });
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }
}

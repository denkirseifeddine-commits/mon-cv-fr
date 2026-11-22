<?php

namespace App\Models;

use App\Enums\ContentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Solution extends Model
{
    protected $fillable = [
        'slug', 'status', 'category_id', 'featured', 'sort_order', 'updated_on',
        'name', 'short_description', 'problem', 'description', 'notice',
        'features', 'technologies', 'requirements', 'deliverables', 'options', 'screenshots',
        'price_amount', 'price_currency', 'price_model', 'delivery_days',
        'demo_url', 'license', 'match',
    ];

    protected function casts(): array
    {
        return [
            'status' => ContentStatus::class,
            'featured' => 'boolean',
            'sort_order' => 'integer',
            'updated_on' => 'date:Y-m-d',
            'name' => 'array',
            'short_description' => 'array',
            'problem' => 'array',
            'description' => 'array',
            'notice' => 'array',
            'features' => 'array',
            'technologies' => 'array',
            'requirements' => 'array',
            'deliverables' => 'array',
            'options' => 'array',
            'screenshots' => 'array',
            'license' => 'array',
            'match' => 'array',
            'price_amount' => 'decimal:2',
            'delivery_days' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Solution $solution) {
            if (! $solution->sort_order) {
                $solution->sort_order = ((int) static::query()->max('sort_order')) + 1;
            }
        });

        // Date de dernière modification du contenu, exportée comme « updatedAt »
        static::saving(function (Solution $solution) {
            if ($solution->isDirty() && ! $solution->isDirty('updated_on')) {
                $solution->updated_on = now()->toDateString();
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** Uniquement les fiches « exemple » et « published ». */
    public function scopePublic(Builder $query): Builder
    {
        return $query->whereIn('status', ContentStatus::publicValues());
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }
}

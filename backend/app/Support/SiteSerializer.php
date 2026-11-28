<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Project;
use App\Models\Solution;

/**
 * Représentation « site statique » des modèles : mêmes clés, même ordre que
 * assets/data/*.json. Sert à l'export et à l'API publique.
 */
final class SiteSerializer
{
    private const LOCALES = ['fr', 'en', 'ar'];

    public static function category(Category $category): array
    {
        return [
            'id' => $category->slug,
            'slug' => $category->slug,
            'order' => $category->sort_order,
            'label' => self::locales($category->label),
            'status' => $category->status->value,
            'description' => self::locales($category->description),
        ];
    }

    public static function project(Project $project): array
    {
        $media = $project->media ?? [];

        return [
            'id' => $project->slug,
            'slug' => $project->slug,
            'order' => $project->sort_order,
            'featured' => $project->featured,
            'name' => $project->name,
            'category' => self::locales($project->category),
            'summary' => self::locales($project->summary),
            'client' => $project->client,
            'period' => $project->period,
            'technologies' => array_values($project->technologies ?? []),
            'media' => ['desktop' => $media['desktop'] ?? null, 'mobile' => $media['mobile'] ?? null],
            'url' => $project->url,
            'missing' => array_values($project->missing ?? []),
        ];
    }

    public static function solution(Solution $solution): array
    {
        $license = $solution->license ?? [];
        $match = $solution->match ?? [];

        return [
            'id' => $solution->slug,
            'slug' => $solution->slug,
            'status' => $solution->status->value,
            'categoryId' => $solution->category?->slug,
            'featured' => $solution->featured,
            'updatedAt' => $solution->updated_on?->format('Y-m-d'),
            'name' => self::locales($solution->name),
            'shortDescription' => self::locales($solution->short_description),
            'problem' => self::locales($solution->problem),
            'description' => self::locales($solution->description),
            'features' => self::localeList($solution->features),
            'technologies' => array_values($solution->technologies ?? []),
            'requirements' => self::localeList($solution->requirements),
            'deliverables' => self::localeList($solution->deliverables),
            'options' => array_values(array_map(fn ($option) => [
                'name' => self::locales($option['name'] ?? []),
                'description' => self::locales($option['description'] ?? []),
            ], $solution->options ?? [])),
            'deliveryDays' => $solution->delivery_days,
            'price' => [
                'amount' => self::number($solution->price_amount),
                'currency' => $solution->price_currency ?: null,
                'model' => $solution->price_model ?: 'quote',
            ],
            'demoUrl' => $solution->demo_url ?: null,
            'screenshots' => array_values(array_map(fn ($shot) => [
                'src' => $shot['src'] ?? null,
                'alt' => self::locales($shot['alt'] ?? []),
            ], $solution->screenshots ?? [])),
            'license' => [
                'name' => $license['name'] ?? null,
                'url' => $license['url'] ?? null,
                'verified' => (bool) ($license['verified'] ?? false),
            ],
            'match' => [
                'needs' => array_values($match['needs'] ?? []),
                'goals' => array_values($match['goals'] ?? []),
                'industries' => array_values($match['industries'] ?? []),
                'complexity' => array_values($match['complexity'] ?? []),
                'customization' => array_values($match['customization'] ?? []),
            ],
            'notice' => self::locales($solution->notice),
        ];
    }

    /** Texte multilingue : ordre fr, en, ar ; les langues vides sont omises. */
    public static function locales(?array $value): array
    {
        $out = [];
        foreach (self::LOCALES as $locale) {
            $text = $value[$locale] ?? null;
            if (is_string($text) && trim($text) !== '') {
                $out[$locale] = $text;
            }
        }

        return $out;
    }

    public static function localeList(?array $items): array
    {
        return array_values(array_filter(
            array_map(fn ($item) => self::locales($item), $items ?? []),
            fn ($item) => $item !== [],
        ));
    }

    public static function number(mixed $value): int|float|null
    {
        if ($value === null || $value === '') {
            return null;
        }
        $float = (float) $value;

        return $float == floor($float) ? (int) $float : $float;
    }
}

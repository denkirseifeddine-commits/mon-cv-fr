<?php

namespace App\Support;

/**
 * Aplatit les textes multilingues { fr, en, ar } dans une langue (repli : français, puis première valeur).
 */
final class Localizer
{
    private const LOCALES = ['fr', 'en', 'ar'];

    public static function flatten(mixed $value, ?string $locale): mixed
    {
        if ($locale === null || ! is_array($value)) {
            return $value;
        }
        if ($value !== [] && ! array_is_list($value) && array_diff(array_keys($value), self::LOCALES) === []) {
            return $value[$locale] ?? $value['fr'] ?? (reset($value) ?: null);
        }

        return array_map(fn ($item) => self::flatten($item, $locale), $value);
    }
}

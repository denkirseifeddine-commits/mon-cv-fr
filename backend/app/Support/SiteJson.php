<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Encodeur JSON reproduisant le format exact des fichiers de assets/data :
 * indentation de 2 espaces, UTF-8 non échappé, barres obliques non échappées,
 * saut de ligne final.
 *
 * Deux styles :
 * - standard : un élément par ligne partout (categories.json, projects.json) ;
 * - compact : un objet dont toutes les valeurs sont des scalaires tient sur une ligne
 *   `{ "fr": "..", "en": ".." }`, une liste de scalaires aussi `["a", "b"]`
 *   (solutions.json).
 */
final class SiteJson
{
    public const STANDARD = 'standard';
    public const COMPACT = 'compact';

    public static function encode(mixed $value, string $style = self::STANDARD): string
    {
        return self::render($value, 0, $style) . "\n";
    }

    private static function render(mixed $value, int $level, string $style): string
    {
        if (! is_array($value)) {
            return self::scalar($value);
        }
        if ($value === []) {
            return '[]';
        }

        $isList = array_is_list($value);
        if ($style === self::COMPACT && self::allScalars($value)) {
            return $isList
                ? '[' . implode(', ', array_map(self::scalar(...), $value)) . ']'
                : '{ ' . implode(', ', self::pairs($value, $level, $style)) . ' }';
        }

        $pad = str_repeat('  ', $level + 1);
        $lines = $isList
            ? array_map(fn ($item) => self::render($item, $level + 1, $style), $value)
            : self::pairs($value, $level, $style);

        return ($isList ? '[' : '{') . "\n"
            . $pad . implode(",\n" . $pad, $lines) . "\n"
            . str_repeat('  ', $level) . ($isList ? ']' : '}');
    }

    /** @return list<string> */
    private static function pairs(array $value, int $level, string $style): array
    {
        $out = [];
        foreach ($value as $key => $item) {
            $out[] = self::scalar((string) $key) . ': ' . self::render($item, $level + 1, $style);
        }

        return $out;
    }

    private static function allScalars(array $value): bool
    {
        foreach ($value as $item) {
            if (is_array($item)) {
                return false;
            }
        }

        return true;
    }

    private static function scalar(mixed $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        if (! is_scalar($value) && $value !== null) {
            throw new InvalidArgumentException('Valeur non encodable.');
        }

        return $json;
    }
}

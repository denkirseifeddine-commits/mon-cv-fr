<?php

namespace App\Filament\Support;

use App\Models\Category;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;

/**
 * Champs multilingues {fr, en, ar} : un onglet par langue. Le français est obligatoire,
 * l'arabe est saisi de droite à gauche.
 */
final class Multilingual
{
    public const LOCALES = ['fr' => 'Français', 'en' => 'English', 'ar' => 'العربية'];

    /** Onglets de langue pour la colonne JSON $name. */
    public static function tabs(string $name, string $label, bool $textarea = false, bool $required = true, int $rows = 3, ?int $maxLength = null): Tabs
    {
        $tabs = [];
        foreach (self::LOCALES as $locale => $title) {
            $tabs[] = Tab::make($title)->schema([self::input("$name.$locale", $label, $locale, $textarea, $required && $locale === 'fr', $rows, $maxLength)]);
        }

        return Tabs::make($name . '_tabs')->label($label)->tabs($tabs)->columnSpanFull();
    }

    /** Un champ par langue, empilés (pour les éléments d'un répéteur). @return list<TextInput|Textarea> */
    public static function stacked(string $prefix, string $label, bool $textarea = false, bool $required = true): array
    {
        $fields = [];
        foreach (self::LOCALES as $locale => $title) {
            $path = $prefix === '' ? $locale : "$prefix.$locale";
            $fields[] = self::input($path, "$label ($title)", $locale, $textarea, $required && $locale === 'fr', 2, null);
        }

        return $fields;
    }

    private static function input(string $path, string $label, string $locale, bool $textarea, bool $required, int $rows, ?int $maxLength): TextInput|Textarea
    {
        $field = $textarea ? Textarea::make($path)->rows($rows) : TextInput::make($path);
        $field->label($label)->required($required);
        if ($maxLength) {
            $field->maxLength($maxLength);
        }
        $field->extraInputAttributes($locale === 'ar' ? ['dir' => 'rtl', 'lang' => 'ar'] : ['lang' => $locale]);

        return $field;
    }

    /** Libellé français d'une valeur multilingue. */
    public static function fr(mixed $value, string $fallback = ''): string
    {
        return is_array($value) ? (string) ($value['fr'] ?? $fallback) : $fallback;
    }

    /** @return array<int, string> id => libellé français des catégories */
    public static function categoryOptions(): array
    {
        return Category::query()->ordered()->get()
            ->mapWithKeys(fn (Category $c) => [$c->id => self::fr($c->label, $c->slug)])
            ->all();
    }
}

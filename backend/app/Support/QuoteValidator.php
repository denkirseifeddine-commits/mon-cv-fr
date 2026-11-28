<?php

namespace App\Support;

/**
 * Validation d'une demande de devis : port PHP de api/_lib/quote-core.mjs
 * (validateQuote et isLikelyBot). Ne fait jamais confiance au client.
 */
final class QuoteValidator
{
    /** Champs signalés quand le corps n'est pas un objet JSON. */
    public const DEFAULT_FIELDS = ['name', 'email', 'need', 'message', 'consent'];

    // Retours à la ligne et caractères de contrôle (U+2028, U+2029, U+0085 compris) interdits dans les champs courts
    private const CONTROL_CHARS = '/[\x{0000}-\x{001f}\x{007f}\x{0085}\x{2028}\x{2029}]/u';
    // Le message accepte les retours à la ligne (\n, \r) et les tabulations
    private const MESSAGE_CONTROL_CHARS = '/[\x{0000}-\x{0008}\x{000b}\x{000c}\x{000e}-\x{001f}\x{007f}]/u';
    // Mise en forme bidirectionnelle (U+202A à U+202E, U+2066 à U+2069) : retirée des champs courts
    private const BIDI_FORMAT_CHARS = '/[\x{202a}-\x{202e}\x{2066}-\x{2069}]/u';
    private const EMAIL_PATTERN = "~^[A-Za-z0-9.!#$%&'*+/=?^_`{|}\~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$~D";
    private const PHONE_PATTERN = '/^[0-9 +().-]+$/D';
    private const SLUG_PATTERN = '/^[a-z0-9-]+$/D';

    /**
     * Pot de miel et délai minimal : true si la demande doit être ignorée (réponse 200 sans enregistrement).
     */
    public static function isLikelyBot(mixed $body, ?int $minElapsedMs = null): bool
    {
        if (! is_array($body)) {
            return false;
        }
        $minElapsedMs ??= (int) config('site.quote_min_elapsed_ms', 3000);

        $trap = $body['website'] ?? null;
        if ($trap !== null && (is_array($trap) || trim((string) $trap) !== '')) {
            return true;
        }

        $elapsed = $body['elapsedMs'] ?? null;
        if (is_string($elapsed) && self::jsTrim($elapsed) !== '') {
            $elapsed = is_numeric($elapsed) ? (float) $elapsed : null;
        }
        if (! is_int($elapsed) && ! is_float($elapsed)) {
            return true;
        }

        return $elapsed < $minElapsedMs;
    }

    /**
     * @return array{ok: true, quote: array}|array{ok: false, fields: list<string>}
     */
    public static function validate(mixed $body): array
    {
        if (! is_array($body) || ($body !== [] && array_is_list($body))) {
            return ['ok' => false, 'fields' => self::DEFAULT_FIELDS];
        }

        $fields = [];
        $quote = [];

        $short = function (string $key, bool $required = false, int $min = 0, int $max = 0, ?callable $test = null) use ($body, &$fields, &$quote) {
            $raw = $body[$key] ?? null;
            if (is_string($raw)) {
                $raw = preg_replace(self::BIDI_FORMAT_CHARS, '', $raw);
            }
            if ($raw === null || (is_string($raw) && self::jsTrim($raw) === '')) {
                if ($required) {
                    $fields[] = $key;
                } else {
                    $quote[$key] = null;
                }

                return;
            }
            if (! is_string($raw) || preg_match(self::CONTROL_CHARS, $raw)) {
                $fields[] = $key;

                return;
            }
            $value = self::jsTrim($raw);
            $length = mb_strlen($value, 'UTF-8');
            if ($length < $min || $length > $max || ($test && ! $test($value))) {
                $fields[] = $key;

                return;
            }
            $quote[$key] = $value;
        };

        $short('name', true, 2, 100);
        $short('email', true, 3, 254, fn ($v) => preg_match(self::EMAIL_PATTERN, $v) === 1);
        $short('phone', false, 0, 40, fn ($v) => preg_match(self::PHONE_PATTERN, $v) === 1);
        $short('need', true, 0, 40, fn ($v) => array_key_exists($v, QuoteCodes::NEEDS));
        $short('deadline', false, 0, 40, fn ($v) => array_key_exists($v, QuoteCodes::DEADLINES));
        $short('budget', false, 0, 100);

        // Message : retours à la ligne autorisés, normalisés en \n
        $message = $body['message'] ?? null;
        if (! is_string($message) || preg_match(self::MESSAGE_CONTROL_CHARS, $message)) {
            $fields[] = 'message';
        } else {
            $value = self::jsTrim(preg_replace('/\r\n?/', "\n", $message));
            $length = mb_strlen($value, 'UTF-8');
            if ($length < 10 || $length > 5000) {
                $fields[] = 'message';
            } else {
                $quote['message'] = $value;
            }
        }

        if (($body['consent'] ?? null) !== true) {
            $fields[] = 'consent';
        } else {
            $quote['consent'] = true;
        }

        // Langue du visiteur : fr par défaut
        $locale = $body['locale'] ?? null;
        if ($locale === null || $locale === '') {
            $quote['locale'] = 'fr';
        } elseif (is_string($locale) && array_key_exists($locale, QuoteCodes::LOCALES)) {
            $quote['locale'] = $locale;
        } else {
            $fields[] = 'locale';
        }

        $short('solution', false, 0, 80, fn ($v) => preg_match(self::SLUG_PATTERN, $v) === 1);

        return $fields ? ['ok' => false, 'fields' => $fields] : ['ok' => true, 'quote' => $quote];
    }

    /** trim() de JavaScript : espaces Unicode, BOM, retours à la ligne. */
    private static function jsTrim(string $value): string
    {
        return preg_replace('/^[\p{Z}\t\n\x0B\f\r\x{FEFF}]+|[\p{Z}\t\n\x0B\f\r\x{FEFF}]+$/u', '', $value) ?? '';
    }
}

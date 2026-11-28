<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\QuoteStatus;
use App\Http\Controllers\Controller;
use App\Mail\QuoteReceived;
use App\Models\Quote;
use App\Support\QuoteValidator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Throwable;

class QuoteController extends Controller
{
    private const NO_STORE = ['Cache-Control' => 'no-store'];

    public function store(Request $request): JsonResponse
    {
        // Corps JSON illisible : 422 sans champ
        $body = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json(['error' => 'invalid', 'fields' => []], 422, self::NO_STORE);
        }

        // Pot de miel ou formulaire envoyé trop vite : 200 sans rien enregistrer (détection non révélée)
        if (QuoteValidator::isLikelyBot($body)) {
            return response()->json(['ok' => true], 200, self::NO_STORE);
        }

        $result = QuoteValidator::validate($body);
        if (! $result['ok']) {
            return response()->json(['error' => 'invalid', 'fields' => $result['fields']], 422, self::NO_STORE);
        }

        $quote = $this->persist($result['quote']);

        // La demande est enregistrée : un échec d'envoi ou de mise en file ne la fait pas perdre
        $recipient = config('site.quote_to_email');
        if ($recipient) {
            try {
                Mail::to($recipient)->queue(new QuoteReceived($quote));
            } catch (Throwable $e) {
                report($e);
            }
        }

        return response()->json(['ok' => true, 'reference' => $quote->reference], 201, self::NO_STORE);
    }

    private function persist(array $data): Quote
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            try {
                return Quote::query()->create([
                    'reference' => self::makeReference(),
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'phone' => $data['phone'],
                    'need' => $data['need'],
                    'deadline' => $data['deadline'],
                    'budget' => $data['budget'],
                    'message' => $data['message'],
                    'locale' => $data['locale'],
                    'solution_slug' => $data['solution'],
                    'consent_at' => now(),
                    'status' => QuoteStatus::New,
                ]);
            } catch (UniqueConstraintViolationException $e) {
                // Référence déjà prise (très improbable) : nouveau tirage
            }
        }

        throw new \RuntimeException('Impossible de générer une référence unique.');
    }

    /** DSS-AAAAMMJJ-XXXX : date UTC et 4 caractères A-Z (sans I, O) et 2-9. */
    public static function makeReference(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $suffix = '';
        for ($i = 0; $i < 4; $i++) {
            $suffix .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return 'DSS-' . gmdate('Ymd') . '-' . $suffix;
    }
}

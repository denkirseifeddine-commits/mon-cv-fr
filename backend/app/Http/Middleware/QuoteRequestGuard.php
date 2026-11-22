<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Contrôles d'entrée de POST /api/v1/quotes, dans l'ordre de api/quote.mjs :
 * origine (403), type de contenu (415), taille du corps (413).
 */
class QuoteRequestGuard
{
    public function handle(Request $request, Closure $next): Response
    {
        $origin = rtrim(trim((string) $request->headers->get('Origin', '')), '/');
        if ($origin === '' || $origin === 'null' || ! in_array($origin, config('site.allowed_origins', []), true)) {
            return $this->error('forbidden-origin', 403);
        }

        $type = strtolower(trim(explode(';', (string) $request->headers->get('Content-Type', ''))[0]));
        if ($type !== 'application/json') {
            return $this->error('unsupported-media-type', 415);
        }

        $max = (int) config('site.quote_max_bytes');
        $declared = $request->headers->get('Content-Length');
        if (($declared !== null && (int) $declared > $max) || strlen($request->getContent()) > $max) {
            return $this->error('payload-too-large', 413);
        }

        return $next($request);
    }

    private function error(string $code, int $status): JsonResponse
    {
        return response()->json(['error' => $code], $status, ['Cache-Control' => 'no-store']);
    }
}

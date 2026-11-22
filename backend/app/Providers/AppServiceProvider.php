<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Casts\Json;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Colonnes JSON stockées en UTF-8 lisible (accents, arabe) : recherche possible et export fidèle
        Json::encodeUsing(fn ($value) => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        // CORS : seules les origines configurées
        config(['cors.allowed_origins' => config('site.allowed_origins', [])]);

        // Demandes de devis : 5 par fenêtre de 10 minutes et par IP
        RateLimiter::for('quotes', function (Request $request) {
            $limit = config('site.quote_rate_limit');

            return Limit::perMinutes($limit['minutes'], $limit['attempts'])
                ->by($request->ip() ?: 'unknown')
                ->response(fn (Request $request, array $headers) => response()->json(['error' => 'rate-limited'], 429, $headers + ['Cache-Control' => 'no-store']));
        });
    }
}

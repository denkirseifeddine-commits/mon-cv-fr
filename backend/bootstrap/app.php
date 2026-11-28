<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // IP du visiteur (limitation de débit) : proxys de confiance explicites, aucun par défaut
        $trusted = trim((string) env('TRUSTED_PROXIES', ''));
        if ($trusted !== '') {
            $middleware->trustProxies(at: $trusted === '*' ? '*' : array_map('trim', explode(',', $trusted)));
        }
        $middleware->alias(['quote.guard' => \App\Http\Middleware\QuoteRequestGuard::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            return $request->is('api/*') ? response()->json(['error' => 'not-found'], 404) : null;
        });
        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            return $request->is('api/*')
                ? response()->json(['error' => 'method-not-allowed'], 405, ['Allow' => $e->getHeaders()['Allow'] ?? ''])
                : null;
        });
    })->create();

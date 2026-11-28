<?php

return [
    /*
     * Dossier des JSON du site statique (assets/data), relatif à backend/ ou absolu.
     */
    'data_path' => env('SITE_DATA_PATH', '../assets/data'),

    /*
     * Adresse qui reçoit la notification d'une demande de devis (vide : aucun e-mail).
     */
    'quote_to_email' => env('QUOTE_TO_EMAIL'),

    /*
     * Origines autorisées (CORS et contrôle d'origine du POST /quotes), séparées par des virgules.
     */
    'allowed_origins' => array_values(array_filter(array_map(
        fn (string $origin) => rtrim(trim($origin), '/'),
        explode(',', (string) env('ALLOWED_ORIGINS', 'https://mon-cv-fr.vercel.app')),
    ))),

    // Limitation de débit des demandes de devis : 5 par fenêtre de 10 minutes et par IP
    'quote_rate_limit' => ['attempts' => 5, 'minutes' => 10],

    // Corps maximal d'une demande de devis (20 Ko) et délai minimal de saisie (ms)
    'quote_max_bytes' => 20 * 1024,
    'quote_min_elapsed_ms' => 3000,

    // Langues du site
    'locales' => ['fr', 'en', 'ar'],

    // Administrateur créé par `php artisan admin:create`
    'admin' => [
        'email' => env('ADMIN_EMAIL'),
        'name' => env('ADMIN_NAME', 'Administrateur'),
    ],
];

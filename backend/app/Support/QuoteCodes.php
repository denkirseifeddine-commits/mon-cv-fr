<?php

namespace App\Support;

/**
 * Codes autorisés d'une demande de devis : copie de assets/data/questionnaire.json
 * (et de api/_lib/quote-core.mjs), à tenir à jour avec eux.
 */
final class QuoteCodes
{
    public const NEEDS = [
        'website' => 'Site web',
        'ecommerce' => 'E-commerce',
        'automation' => 'Automatisation',
        'crm' => 'CRM',
        'application' => 'Application',
        'ai' => 'Assistant IA',
        'unsure' => 'Je ne sais pas encore',
    ];

    public const DEADLINES = [
        'urgent' => 'Urgent',
        '1-2-weeks' => '1 à 2 semaines',
        '1-month' => '1 mois',
        'flexible' => 'Flexible',
    ];

    public const LOCALES = ['fr' => 'français', 'en' => 'anglais', 'ar' => 'arabe'];
}

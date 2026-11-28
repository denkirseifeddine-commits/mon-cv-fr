<?php

namespace App\Mail;

use App\Models\Quote;
use App\Support\QuoteCodes;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Notification envoyée au propriétaire à chaque demande de devis (en file d'attente).
 * Les valeurs du visiteur sont échappées dans la version HTML (Blade).
 */
class QuoteReceived extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Quote $quote)
    {
    }

    public function envelope(): Envelope
    {
        $needLabel = QuoteCodes::NEEDS[$this->quote->need] ?? $this->quote->need;

        return new Envelope(
            // Les champs courts n'ont ni retour à la ligne ni caractère de contrôle (QuoteValidator)
            subject: "Demande de devis — {$needLabel} — {$this->quote->name} [{$this->quote->reference}]",
            replyTo: [new Address($this->quote->email, $this->quote->name)],
        );
    }

    public function content(): Content
    {
        $quote = $this->quote;
        $rows = array_filter([
            'Référence' => $quote->reference,
            'Langue du visiteur' => (QuoteCodes::LOCALES[$quote->locale] ?? $quote->locale) . " ({$quote->locale})",
            'Nom' => $quote->name,
            'E-mail' => $quote->email,
            'Téléphone' => $quote->phone,
            'Type de besoin' => QuoteCodes::NEEDS[$quote->need] ?? $quote->need,
            'Délai souhaité' => $quote->deadline ? (QuoteCodes::DEADLINES[$quote->deadline] ?? $quote->deadline) : null,
            'Budget indicatif' => $quote->budget,
            'Solution du catalogue' => $quote->solution_slug,
            'Consentement' => 'le visiteur accepte d\'être recontacté au sujet de sa demande',
        ], fn ($value) => $value !== null && $value !== '');

        return new Content(
            view: 'emails.quote',
            text: 'emails.quote-text',
            with: ['quote' => $quote, 'rows' => $rows],
        );
    }
}

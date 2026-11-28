<?php

namespace Tests\Feature;

use App\Mail\QuoteReceived;
use App\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ApiQuoteTest extends TestCase
{
    use RefreshDatabase;

    private const ORIGIN = 'https://mon-cv-fr.vercel.app';

    private function payload(array $override = []): array
    {
        return array_merge([
            'name' => 'Jean Dupont',
            'email' => 'jean@example.com',
            'phone' => '+216 21 000 000',
            'need' => 'website',
            'deadline' => '1-month',
            'budget' => '1 000 à 2 500 €',
            'message' => "Bonjour, je voudrais un site.\nMerci.",
            'consent' => true,
            'locale' => 'fr',
            'solution' => 'exemple-site-vitrine',
            'website' => '',
            'elapsedMs' => 8421,
        ], $override);
    }

    private function send(array $payload, array $headers = []): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/v1/quotes', $payload, $headers + ['Origin' => self::ORIGIN]);
    }

    public function test_valid_request_is_stored_and_mail_is_queued(): void
    {
        Mail::fake();

        $response = $this->send($this->payload())->assertCreated()->assertJsonPath('ok', true);
        $reference = $response->json('reference');
        $this->assertMatchesRegularExpression('/^DSS-\d{8}-[A-HJ-NP-Z2-9]{4}$/', $reference);
        $this->assertStringContainsString(gmdate('Ymd'), $reference);

        $quote = Quote::firstOrFail();
        $this->assertSame($reference, $quote->reference);
        $this->assertSame('Jean Dupont', $quote->name);
        $this->assertSame('jean@example.com', $quote->email);
        $this->assertSame('website', $quote->need);
        $this->assertSame('exemple-site-vitrine', $quote->solution_slug);
        $this->assertSame("Bonjour, je voudrais un site.\nMerci.", $quote->message);
        $this->assertSame('new', $quote->status->value);
        $this->assertNotNull($quote->consent_at);

        Mail::assertQueued(QuoteReceived::class, fn (QuoteReceived $mail) => $mail->hasTo('owner@example.test')
            && $mail->hasReplyTo('jean@example.com')
            && $mail->quote->is($quote));
        Mail::assertQueuedCount(1);
    }

    public function test_mail_content_is_escaped_and_contains_reference(): void
    {
        Mail::fake();
        $this->send($this->payload(['name' => 'Eve <script>x</script>', 'message' => 'Un message <b>gras</b> assez long.']))->assertCreated();
        $quote = Quote::firstOrFail();

        $mailable = new QuoteReceived($quote);
        $mailable->assertSeeInHtml('Eve &lt;script&gt;x&lt;/script&gt;', false);
        $mailable->assertDontSeeInHtml('<script>', false);
        $mailable->assertSeeInHtml($quote->reference);
        $mailable->assertSeeInText($quote->reference);
        $mailable->assertHasSubject("Demande de devis — Site web — Eve <script>x</script> [{$quote->reference}]");
    }

    public function test_minimal_valid_request(): void
    {
        $this->send($this->payload(['phone' => '', 'deadline' => null, 'budget' => '', 'solution' => null, 'locale' => null]))->assertCreated();
        $quote = Quote::firstOrFail();
        $this->assertNull($quote->phone);
        $this->assertNull($quote->deadline);
        $this->assertSame('fr', $quote->locale);
    }

    public function test_no_mail_when_recipient_not_configured_but_quote_is_stored(): void
    {
        Mail::fake();
        config(['site.quote_to_email' => null]);
        $this->send($this->payload())->assertCreated();
        Mail::assertNothingQueued();
        $this->assertSame(1, Quote::count());
    }

    public function test_request_is_stored_without_any_ip(): void
    {
        $this->send($this->payload(), ['X-Forwarded-For' => '203.0.113.9'])->assertCreated();
        $this->assertStringNotContainsString('203.0.113.9', json_encode(Quote::firstOrFail()->getAttributes()));
    }

    /** @return array<string, array{0: array, 1: string}> */
    public static function invalidFields(): array
    {
        return [
            'nom absent' => [['name' => ''], 'name'],
            'nom trop court' => [['name' => 'A'], 'name'],
            'nom trop long' => [['name' => str_repeat('a', 101)], 'name'],
            'nom avec retour à la ligne' => [['name' => "Jean\nBcc: x@y.z"], 'name'],
            'nom avec U+2028' => [['name' => "Jean\u{2028}Dupont"], 'name'],
            'nom avec U+0085' => [['name' => "Jean\u{0085}Dupont"], 'name'],
            'nom non texte' => [['name' => 12], 'name'],
            'e-mail absent' => [['email' => ''], 'email'],
            'e-mail invalide' => [['email' => 'jean@'], 'email'],
            'e-mail trop long' => [['email' => str_repeat('a', 250) . '@example.com'], 'email'],
            'e-mail avec retour' => [['email' => "jean@example.com\nBcc: x@y.z"], 'email'],
            'téléphone invalide' => [['phone' => 'abc'], 'phone'],
            'téléphone trop long' => [['phone' => str_repeat('1', 41)], 'phone'],
            'besoin absent' => [['need' => ''], 'need'],
            'besoin inconnu' => [['need' => 'rocket'], 'need'],
            'délai inconnu' => [['deadline' => 'tomorrow'], 'deadline'],
            'budget trop long' => [['budget' => str_repeat('b', 101)], 'budget'],
            'budget avec retour' => [['budget' => "1\n2"], 'budget'],
            'message trop court' => [['message' => 'court'], 'message'],
            'message trop long' => [['message' => str_repeat('m', 5001)], 'message'],
            'message avec caractère de contrôle' => [['message' => "Bonjour tout\u{0007}le monde"], 'message'],
            'message absent' => [['message' => null], 'message'],
            'consentement absent' => [['consent' => null], 'consent'],
            'consentement faux' => [['consent' => false], 'consent'],
            'consentement texte' => [['consent' => 'true'], 'consent'],
            'langue inconnue' => [['locale' => 'de'], 'locale'],
            'solution invalide' => [['solution' => 'Pas Un Slug!'], 'solution'],
            'solution trop longue' => [['solution' => str_repeat('a', 81)], 'solution'],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('invalidFields')]
    public function test_each_invalid_field_returns_422(array $override, string $field): void
    {
        Mail::fake();
        $this->send($this->payload($override))
            ->assertStatus(422)
            ->assertJsonPath('error', 'invalid')
            ->assertJson(fn ($json) => $json->where('fields', fn ($fields) => in_array($field, $fields->all(), true))->etc());
        $this->assertSame(0, Quote::count());
        Mail::assertNothingQueued();
    }

    public function test_fields_are_reported_in_form_order(): void
    {
        $this->send($this->payload(['message' => 'x', 'name' => '', 'consent' => false, 'email' => 'bad']))
            ->assertStatus(422)->assertExactJson(['error' => 'invalid', 'fields' => ['name', 'email', 'message', 'consent']]);
    }

    public function test_bidi_format_characters_are_stripped_from_short_fields(): void
    {
        $this->send($this->payload(['name' => "Jean\u{202E}Dupont"]))->assertCreated();
        $this->assertSame('JeanDupont', Quote::firstOrFail()->name);
    }

    public function test_arabic_text_and_emoji_count_by_characters(): void
    {
        $this->send($this->payload(['name' => 'علي', 'locale' => 'ar', 'message' => 'مرحبا، أريد موقعا إلكترونيا 😀']))->assertCreated();
        $this->assertSame('علي', Quote::firstOrFail()->name);
    }

    public function test_unreadable_json_returns_422_with_no_fields(): void
    {
        $this->call('POST', '/api/v1/quotes', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ORIGIN' => self::ORIGIN, 'HTTP_ACCEPT' => 'application/json',
        ], '{not json')->assertStatus(422)->assertExactJson(['error' => 'invalid', 'fields' => []]);
    }

    public function test_honeypot_returns_200_without_storing(): void
    {
        Mail::fake();
        $this->send($this->payload(['website' => 'http://spam.example']))->assertOk()->assertExactJson(['ok' => true]);
        $this->assertSame(0, Quote::count());
        Mail::assertNothingQueued();
    }

    public function test_too_fast_or_missing_elapsed_returns_200_without_storing(): void
    {
        Mail::fake();
        $this->send($this->payload(['elapsedMs' => 2999]))->assertOk()->assertExactJson(['ok' => true]);
        $this->send($this->payload(['elapsedMs' => null]))->assertOk()->assertExactJson(['ok' => true]);
        $this->send($this->payload(['elapsedMs' => 'abc']))->assertOk()->assertExactJson(['ok' => true]);
        $this->assertSame(0, Quote::count());

        $this->send($this->payload(['elapsedMs' => 3000]))->assertCreated();
        $this->send($this->payload(['elapsedMs' => '5000']))->assertCreated();
        $this->assertSame(2, Quote::count());
    }

    public function test_origin_is_required_and_must_be_allowed(): void
    {
        $this->postJson('/api/v1/quotes', $this->payload())->assertForbidden()->assertExactJson(['error' => 'forbidden-origin']);
        $this->postJson('/api/v1/quotes', $this->payload(), ['Origin' => 'https://evil.example'])->assertForbidden();
        $this->postJson('/api/v1/quotes', $this->payload(), ['Origin' => 'null'])->assertForbidden();
        $this->postJson('/api/v1/quotes', $this->payload(), ['Origin' => self::ORIGIN . '/'])->assertCreated();
        $this->assertSame(1, Quote::count());
    }

    public function test_content_type_must_be_json(): void
    {
        $this->call('POST', '/api/v1/quotes', ['name' => 'x'], [], [], ['HTTP_ORIGIN' => self::ORIGIN, 'HTTP_ACCEPT' => 'application/json'])
            ->assertStatus(415)->assertExactJson(['error' => 'unsupported-media-type']);
    }

    public function test_body_over_20_kb_is_rejected(): void
    {
        $this->send($this->payload(['message' => str_repeat('m', 21 * 1024)]))
            ->assertStatus(413)->assertExactJson(['error' => 'payload-too-large']);
        $this->assertSame(0, Quote::count());
    }

    public function test_preflight_allows_only_configured_origin(): void
    {
        $ok = $this->call('OPTIONS', '/api/v1/quotes', [], [], [], [
            'HTTP_ORIGIN' => self::ORIGIN,
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type',
        ]);
        $ok->assertNoContent();
        $this->assertSame(self::ORIGIN, $ok->headers->get('Access-Control-Allow-Origin'));
        $this->assertStringContainsString('POST', $ok->headers->get('Access-Control-Allow-Methods'));

        $bad = $this->call('OPTIONS', '/api/v1/quotes', [], [], [], [
            'HTTP_ORIGIN' => 'https://evil.example',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ]);
        $this->assertNotSame('https://evil.example', $bad->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_sixth_request_in_ten_minutes_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            // Les demandes ignorées (pot de miel) comptent aussi dans la limite
            $this->send($this->payload(['website' => 'spam']))->assertOk();
        }
        $response = $this->send($this->payload())->assertStatus(429)->assertExactJson(['error' => 'rate-limited']);
        $this->assertNotNull($response->headers->get('Retry-After'));
        $this->assertSame(0, Quote::count());
    }

    public function test_rate_limit_is_per_ip(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.1'])->send($this->payload(['website' => 'x']))->assertOk();
        }
        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.1'])->send($this->payload())->assertStatus(429);
        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.2'])->send($this->payload())->assertCreated();
    }

    public function test_rate_limit_resets_after_the_window(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->send($this->payload(['website' => 'x']))->assertOk();
        }
        $this->send($this->payload())->assertStatus(429);
        $this->travel(11)->minutes();
        $this->send($this->payload())->assertCreated();
    }
}

<?php

namespace Tests\Feature;

use App\Models\Solution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\ImportsSiteData;
use Tests\TestCase;

class ApiReadTest extends TestCase
{
    use ImportsSiteData;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->importSiteData();
    }

    public function test_solutions_list_returns_public_solutions_in_site_format(): void
    {
        $response = $this->getJson('/api/v1/solutions')->assertOk();
        $response->assertJsonCount(8, 'data')->assertJsonPath('meta.total', 8);
        $response->assertJsonPath('data.0.slug', 'exemple-site-vitrine');
        $response->assertJsonPath('data.0.status', 'exemple');
        $response->assertJsonPath('data.0.categoryId', 'websites');
        $response->assertJsonPath('data.0.name.fr', 'Site vitrine');
        $response->assertJsonPath('data.0.price.model', 'quote');
    }

    public function test_draft_and_archived_solutions_are_excluded(): void
    {
        Solution::where('slug', 'exemple-site-vitrine')->update(['status' => 'draft']);
        Solution::where('slug', 'exemple-boutique-en-ligne')->update(['status' => 'archived']);
        Solution::where('slug', 'exemple-crm-suivi-contacts')->update(['status' => 'published']);

        $slugs = collect($this->getJson('/api/v1/solutions')->assertOk()->json('data'))->pluck('slug');
        $this->assertCount(6, $slugs);
        $this->assertNotContains('exemple-site-vitrine', $slugs);
        $this->assertNotContains('exemple-boutique-en-ligne', $slugs);
        $this->assertContains('exemple-crm-suivi-contacts', $slugs);

        $this->getJson('/api/v1/solutions/exemple-site-vitrine')->assertNotFound()->assertExactJson(['error' => 'not-found']);
        $this->getJson('/api/v1/solutions/exemple-boutique-en-ligne')->assertNotFound();
        $this->getJson('/api/v1/solutions/exemple-crm-suivi-contacts')->assertOk();
    }

    public function test_locale_flattens_texts(): void
    {
        $this->getJson('/api/v1/solutions/exemple-site-vitrine?locale=en')
            ->assertOk()
            ->assertJsonPath('data.name', 'Showcase website')
            ->assertJsonPath('data.notice', 'Example, not for sale')
            ->assertJsonPath('data.features.0', 'Presentation pages: business, services, team and contact details');
        $this->getJson('/api/v1/solutions/exemple-site-vitrine?locale=ar')->assertOk()->assertJsonPath('data.name', 'موقع تعريفي');
        $this->getJson('/api/v1/solutions?locale=xx')->assertStatus(422)->assertJsonPath('error', 'invalid');
    }

    public function test_filters(): void
    {
        $this->getJson('/api/v1/solutions?category=ecommerce')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.slug', 'exemple-boutique-en-ligne');
        $this->getJson('/api/v1/solutions?category=inconnue')->assertOk()->assertJsonCount(0, 'data');

        $featured = $this->getJson('/api/v1/solutions?featured=1')->assertOk()->json('data');
        $this->assertNotEmpty($featured);
        $this->assertTrue(collect($featured)->every(fn ($s) => $s['featured'] === true));
        $notFeatured = $this->getJson('/api/v1/solutions?featured=false')->assertOk()->json('data');
        $this->assertTrue(collect($notFeatured)->every(fn ($s) => $s['featured'] === false));
        $this->assertCount(8, array_merge($featured, $notFeatured));

        $this->getJson('/api/v1/solutions?search=boutique')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.slug', 'exemple-boutique-en-ligne');
        $this->getJson('/api/v1/solutions?search=shop')->assertOk()->assertJsonPath('data.0.slug', 'exemple-boutique-en-ligne');
        $this->getJson('/api/v1/solutions?search=zzzzintrouvable')->assertOk()->assertJsonCount(0, 'data');
        // « % » n'est pas un joker
        $this->getJson('/api/v1/solutions?search=' . urlencode('%'))->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_pagination(): void
    {
        $this->getJson('/api/v1/solutions?per_page=3&page=3')->assertOk()
            ->assertJsonCount(2, 'data')->assertJsonPath('meta.last_page', 3);
        $this->getJson('/api/v1/solutions?page=0')->assertStatus(422);
    }

    public function test_categories(): void
    {
        $response = $this->getJson('/api/v1/solution-categories')->assertOk();
        $response->assertJsonCount(8, 'data')->assertJsonPath('data.0.slug', 'websites')->assertJsonPath('data.0.order', 1);
        $this->getJson('/api/v1/solution-categories?locale=en')->assertJsonPath('data.0.label', 'Websites');
    }

    public function test_draft_category_without_public_solution_is_hidden(): void
    {
        Solution::where('slug', 'exemple-site-vitrine')->update(['status' => 'draft']);
        $slugs = collect($this->getJson('/api/v1/solution-categories')->json('data'))->pluck('slug');
        $this->assertNotContains('websites', $slugs);
        $this->assertCount(7, $slugs);
    }

    public function test_projects(): void
    {
        $this->getJson('/api/v1/portfolio-projects')->assertOk()
            ->assertJsonCount(8, 'data')->assertJsonPath('data.0.slug', 'atdds')
            ->assertJsonPath('data.0.name', 'ATDDS');
        $this->getJson('/api/v1/portfolio-projects/atdds?locale=en')->assertOk()
            ->assertJsonPath('data.category', 'Bilingual non-profit website');
        $this->getJson('/api/v1/portfolio-projects/nope')->assertNotFound()->assertExactJson(['error' => 'not-found']);
    }

    public function test_unknown_route_and_wrong_method_return_json(): void
    {
        $this->getJson('/api/v1/unknown')->assertNotFound()->assertExactJson(['error' => 'not-found']);
        $this->postJson('/api/v1/solutions', [])->assertStatus(405)->assertJsonPath('error', 'method-not-allowed');
    }

    public function test_cors_headers_only_for_allowed_origin(): void
    {
        $this->getJson('/api/v1/solutions', ['Origin' => 'https://mon-cv-fr.vercel.app'])
            ->assertOk()->assertHeader('Access-Control-Allow-Origin', 'https://mon-cv-fr.vercel.app');
        // Origine inconnue : jamais reflétée (le navigateur bloque la lecture)
        $response = $this->getJson('/api/v1/solutions', ['Origin' => 'https://evil.example'])->assertOk();
        $this->assertNotSame('https://evil.example', $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $response->headers->get('Access-Control-Allow-Origin'));
    }
}

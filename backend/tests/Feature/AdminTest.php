<?php

namespace Tests\Feature;

use App\Enums\QuoteStatus;
use App\Filament\Resources\Categories\Pages\EditCategory;
use App\Filament\Resources\Categories\Pages\ListCategories;
use App\Filament\Resources\Projects\Pages\EditProject;
use App\Filament\Resources\Projects\Pages\ListProjects;
use App\Filament\Resources\Quotes\Pages\EditQuote;
use App\Filament\Resources\Quotes\Pages\ListQuotes;
use App\Filament\Resources\Quotes\Pages\ViewQuote;
use App\Filament\Resources\Quotes\QuoteResource;
use App\Filament\Resources\Solutions\Pages\CreateSolution;
use App\Filament\Resources\Solutions\Pages\EditSolution;
use App\Filament\Resources\Solutions\Pages\ListSolutions;
use App\Models\Category;
use App\Models\Project;
use App\Models\Quote;
use App\Models\Solution;
use App\Models\User;
use App\Services\SiteDataSync;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\Concerns\ImportsSiteData;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use ImportsSiteData;
    use RefreshDatabase;

    public function test_admin_requires_login(): void
    {
        foreach (['/admin', '/admin/solutions', '/admin/categories', '/admin/projects', '/admin/quotes', '/admin/solutions/1/edit'] as $url) {
            $this->get($url)->assertRedirect('/admin/login');
        }
        $this->get('/admin/login')->assertOk();
        $this->get('/')->assertRedirect('/admin');
    }

    public function test_authenticated_user_can_open_the_panel(): void
    {
        $this->importSiteData();
        $this->actingAs(User::factory()->create());

        foreach (['/admin', '/admin/solutions', '/admin/categories', '/admin/projects', '/admin/quotes', '/admin/solutions/create'] as $url) {
            $this->get($url)->assertOk();
        }
        // Clé non numérique : 404 propre, pas d'erreur SQL (PostgreSQL)
        $this->get('/admin/solutions/abc/edit')->assertNotFound();
    }

    public function test_resource_pages_render_and_list_records(): void
    {
        $this->importSiteData();
        $this->actingAs(User::factory()->create());

        Livewire::test(ListSolutions::class)->assertCanSeeTableRecords(Solution::all())
            ->searchTable('boutique')->assertCanSeeTableRecords(Solution::where('slug', 'exemple-boutique-en-ligne')->get())
            ->assertCountTableRecords(1);
        Livewire::test(ListSolutions::class)
            ->filterTable('category_id', Category::where('slug', 'crm')->value('id'))->assertCountTableRecords(1);
        Livewire::test(ListSolutions::class)->filterTable('status', ['draft'])->assertCountTableRecords(0);
        Livewire::test(ListCategories::class)->assertCanSeeTableRecords(Category::all());
        Livewire::test(ListProjects::class)->assertCanSeeTableRecords(Project::all())->searchTable('ATDDS')->assertCountTableRecords(1);

        Livewire::test(EditSolution::class, ['record' => Solution::first()->getKey()])->assertOk();
        Livewire::test(EditCategory::class, ['record' => Category::first()->getKey()])->assertOk();
        Livewire::test(EditProject::class, ['record' => Project::first()->getKey()])->assertOk();
    }

    public function test_saving_a_solution_without_change_keeps_the_exported_json_identical(): void
    {
        $this->importSiteData();
        $this->actingAs(User::factory()->create());
        $solution = Solution::where('slug', 'exemple-boutique-en-ligne')->first();
        $before = \App\Support\SiteSerializer::solution($solution);

        Livewire::test(EditSolution::class, ['record' => $solution->getKey()])
            ->call('save')->assertHasNoFormErrors();

        $this->assertSame($before, \App\Support\SiteSerializer::solution($solution->fresh()->load('category')));
    }

    public function test_solution_can_be_created_with_language_tabs_and_example_rules_are_applied(): void
    {
        $this->importSiteData();
        $this->actingAs(User::factory()->create());

        Livewire::test(CreateSolution::class)->fillForm([
            'slug' => 'exemple-test',
            'status' => 'exemple',
            'name' => ['fr' => 'Test', 'en' => 'Test', 'ar' => 'اختبار'],
            'short_description' => ['fr' => 'Court'],
            'problem' => ['fr' => 'Problème'],
            'description' => ['fr' => 'Description'],
            'features' => [['fr' => 'Une fonctionnalité', 'en' => '', 'ar' => '']],
        ])->call('create')->assertHasNoFormErrors();

        $solution = Solution::where('slug', 'exemple-test')->firstOrFail();
        $this->assertSame('exemple', $solution->status->value);
        $this->assertNull($solution->price_amount);
        $this->assertSame(9, $solution->sort_order);
        $this->assertSame('Une fonctionnalité', $solution->features[0]['fr']);
    }

    public function test_example_solution_slug_must_start_with_exemple(): void
    {
        $this->actingAs(User::factory()->create());

        Livewire::test(CreateSolution::class)->fillForm([
            'slug' => 'mon-offre',
            'status' => 'exemple',
            'name' => ['fr' => 'Test'],
            'short_description' => ['fr' => 'Court'],
            'problem' => ['fr' => 'P'],
            'description' => ['fr' => 'D'],
        ])->call('create')->assertHasFormErrors(['slug']);
    }

    public function test_quotes_can_be_viewed_and_updated_but_not_created(): void
    {
        $this->actingAs(User::factory()->create());
        $quote = Quote::create([
            'reference' => 'DSS-20261122-ABCD', 'name' => 'Jean', 'email' => 'j@example.com', 'need' => 'crm',
            'message' => 'Un message assez long.', 'locale' => 'fr', 'consent_at' => now(), 'status' => QuoteStatus::New,
        ]);

        $this->assertFalse(QuoteResource::canCreate());
        $this->get('/admin/quotes/create')->assertNotFound();
        Livewire::test(ListQuotes::class)->assertCanSeeTableRecords([$quote])
            ->callTableAction('setStatus', $quote, ['status' => 'in_progress']);
        $this->assertSame('in_progress', $quote->fresh()->status->value);

        Livewire::test(ViewQuote::class, ['record' => $quote->getKey()])->assertOk();
        Livewire::test(EditQuote::class, ['record' => $quote->getKey()])
            ->fillForm(['status' => 'answered', 'internal_notes' => 'Rappelé le 22.'])->call('save')->assertHasNoFormErrors();
        $this->assertSame('answered', $quote->fresh()->status->value);
        $this->assertSame('Rappelé le 22.', $quote->fresh()->internal_notes);
    }

    public function test_admin_create_command(): void
    {
        putenv('ADMIN_PASSWORD=un-mot-de-passe-de-test');
        try {
            $this->artisan('admin:create', ['--email' => 'boss@example.test', '--name' => 'Boss'])->assertSuccessful();
            $this->artisan('admin:create', ['--email' => 'boss@example.test'])->assertSuccessful();
        } finally {
            putenv('ADMIN_PASSWORD');
        }
        $this->assertSame(1, User::where('email', 'boss@example.test')->count());
        $user = User::where('email', 'boss@example.test')->first();
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('un-mot-de-passe-de-test', $user->password));

        putenv('ADMIN_PASSWORD=court');
        try {
            $this->artisan('admin:create', ['--email' => 'x@example.test'])->assertFailed();
        } finally {
            putenv('ADMIN_PASSWORD');
        }
        $this->artisan('admin:create', ['--email' => 'x@example.test', '--no-interaction' => true])->assertFailed();
        $this->assertSame(0, User::where('email', 'x@example.test')->count());
    }
}

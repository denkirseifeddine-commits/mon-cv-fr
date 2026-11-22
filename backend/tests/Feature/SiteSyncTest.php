<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Project;
use App\Models\Solution;
use App\Services\SiteDataSync;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\ImportsSiteData;
use Tests\TestCase;

class SiteSyncTest extends TestCase
{
    use ImportsSiteData;
    use RefreshDatabase;

    private const FILES = ['categories.json', 'solutions.json', 'projects.json'];

    public function test_import_then_export_changes_nothing(): void
    {
        $dir = $this->copySiteData();

        $this->artisan('site:import', ['--path' => $dir])->assertSuccessful();
        $this->artisan('site:export', ['--path' => $dir])->assertSuccessful();

        foreach (self::FILES as $file) {
            $this->assertSame(
                file_get_contents(SiteDataSync::resolveDirectory() . "/$file"),
                file_get_contents("$dir/$file"),
                "$file différent après l'aller-retour",
            );
        }
    }

    public function test_export_rewrites_a_modified_file_to_the_database_state(): void
    {
        $dir = $this->copySiteData();
        $this->artisan('site:import', ['--path' => $dir])->assertSuccessful();
        file_put_contents("$dir/solutions.json", '[]');

        $this->artisan('site:export', ['--path' => $dir])->assertSuccessful();

        $this->assertSame(
            file_get_contents(SiteDataSync::resolveDirectory() . '/solutions.json'),
            file_get_contents("$dir/solutions.json"),
        );
    }

    public function test_import_is_idempotent_and_updates_by_slug(): void
    {
        $dir = $this->copySiteData();
        $this->artisan('site:import', ['--path' => $dir])->assertSuccessful();
        $this->artisan('site:import', ['--path' => $dir])->assertSuccessful();

        $this->assertSame(8, Category::count());
        $this->assertSame(8, Solution::count());
        $this->assertSame(8, Project::count());

        $solutions = json_decode(file_get_contents("$dir/solutions.json"), true);
        $solutions[0]['name']['fr'] = 'Site vitrine modifié';
        file_put_contents("$dir/solutions.json", json_encode($solutions, JSON_UNESCAPED_UNICODE));
        $this->artisan('site:import', ['--path' => $dir])->assertSuccessful();

        $this->assertSame(8, Solution::count());
        $this->assertSame('Site vitrine modifié', Solution::where('slug', 'exemple-site-vitrine')->first()->name['fr']);
    }

    public function test_import_keeps_enum_status_relations_and_order(): void
    {
        $this->importSiteData();

        $solution = Solution::where('slug', 'exemple-site-vitrine')->first();
        $this->assertSame('exemple', $solution->status->value);
        $this->assertSame('websites', $solution->category->slug);
        $this->assertSame(1, $solution->sort_order);
        $this->assertNull($solution->price_amount);
        $this->assertSame(['website'], $solution->match['needs']);
    }

    public function test_export_omits_empty_locales_and_can_exclude_non_public_solutions(): void
    {
        $dir = $this->copySiteData();
        $this->artisan('site:import', ['--path' => $dir])->assertSuccessful();
        $solution = Solution::where('slug', 'exemple-site-vitrine')->first();
        $name = $solution->name;
        $name['ar'] = '';
        $solution->update(['name' => $name, 'status' => 'draft']);

        $this->artisan('site:export', ['--path' => $dir, '--public-only' => true])->assertSuccessful();

        $exported = json_decode(file_get_contents("$dir/solutions.json"), true);
        $this->assertCount(7, $exported);

        $this->artisan('site:export', ['--path' => $dir])->assertSuccessful();
        $exported = json_decode(file_get_contents("$dir/solutions.json"), true);
        $this->assertSame(['fr', 'en'], array_keys($exported[0]['name']));
        $this->assertSame('draft', $exported[0]['status']);
    }

    public function test_import_rejects_unknown_category(): void
    {
        $dir = $this->copySiteData();
        $solutions = json_decode(file_get_contents("$dir/solutions.json"), true);
        $solutions[0]['categoryId'] = 'inconnue';
        file_put_contents("$dir/solutions.json", json_encode($solutions));

        $this->artisan('site:import', ['--path' => $dir])->assertFailed();
        $this->assertSame(0, Solution::count());
        $this->assertSame(0, Category::count(), 'la transaction doit être annulée');
    }
}

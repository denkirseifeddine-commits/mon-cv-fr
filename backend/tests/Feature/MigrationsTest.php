<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MigrationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_tables_and_columns_exist(): void
    {
        $expected = [
            'users' => ['email', 'password'],
            'categories' => ['slug', 'sort_order', 'label', 'description', 'status'],
            'solutions' => ['slug', 'status', 'category_id', 'featured', 'name', 'short_description', 'problem', 'description',
                'features', 'technologies', 'requirements', 'deliverables', 'options', 'delivery_days', 'price_amount',
                'price_currency', 'price_model', 'demo_url', 'screenshots', 'license', 'match', 'notice', 'created_at', 'updated_at'],
            'projects' => ['slug', 'sort_order', 'featured', 'name', 'category', 'summary', 'client', 'period', 'technologies', 'media', 'url', 'missing'],
            'quotes' => ['reference', 'name', 'email', 'phone', 'need', 'deadline', 'budget', 'message', 'locale', 'solution_slug', 'consent_at', 'status', 'internal_notes'],
            'site_settings' => ['key', 'value'],
        ];
        foreach ($expected as $table => $columns) {
            $this->assertTrue(Schema::hasTable($table), "table $table");
            $this->assertTrue(Schema::hasColumns($table, $columns), "colonnes de $table");
        }
    }

    public function test_quotes_store_no_ip_address(): void
    {
        $columns = Schema::getColumnListing('quotes');
        $this->assertNotContains('ip', $columns);
        $this->assertNotContains('ip_address', $columns);
        $this->assertNotContains('user_agent', $columns);
    }
}

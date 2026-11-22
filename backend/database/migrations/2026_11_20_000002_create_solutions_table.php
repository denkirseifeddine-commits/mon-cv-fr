<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solutions', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('status', 20)->default('draft')->index();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->boolean('featured')->default(false);
            // Ordre d'affichage (le JSON du site n'a pas de champ « order » : l'ordre du tableau fait foi)
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->date('updated_on')->nullable();   // « updatedAt » du JSON

            // Textes multilingues { fr, en, ar }
            $table->json('name');
            $table->json('short_description')->nullable();
            $table->json('problem')->nullable();
            $table->json('description')->nullable();
            $table->json('notice')->nullable();

            // Listes
            $table->json('features')->nullable();       // [{ fr, en, ar }]
            $table->json('technologies')->nullable();   // ["WordPress"]
            $table->json('requirements')->nullable();   // [{ fr, en, ar }]
            $table->json('deliverables')->nullable();   // [{ fr, en, ar }]
            $table->json('options')->nullable();        // [{ name: {..}, description: {..} }]
            $table->json('screenshots')->nullable();    // [{ src, alt: {..} }]

            // Prix et délai : null tant qu'ils ne sont pas connus (toujours null pour un exemple)
            $table->decimal('price_amount', 12, 2)->nullable();
            $table->string('price_currency', 3)->nullable();
            $table->string('price_model', 30)->default('quote');
            $table->unsignedInteger('delivery_days')->nullable();

            $table->string('demo_url', 2048)->nullable();
            $table->json('license')->nullable();        // { name, url, verified }
            $table->json('match')->nullable();          // { needs, goals, industries, complexity, customization }

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solutions');
    }
};

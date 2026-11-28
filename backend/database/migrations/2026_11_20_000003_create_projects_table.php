<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->boolean('featured')->default(false);
            $table->string('name');
            $table->json('category');                  // { fr, en, ar }
            $table->json('summary');                   // { fr, en, ar }
            $table->string('client')->nullable();
            $table->string('period', 50)->nullable();
            $table->json('technologies')->nullable();  // ["WordPress"]
            $table->json('media')->nullable();         // { desktop, mobile }
            $table->string('url', 2048)->nullable();
            $table->json('missing')->nullable();       // informations à fournir par le propriétaire
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};

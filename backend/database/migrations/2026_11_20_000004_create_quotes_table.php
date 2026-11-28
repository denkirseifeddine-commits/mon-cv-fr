<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Aucune adresse IP n'est stockée dans cette table.
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 20)->unique();   // DSS-AAAAMMJJ-XXXX
            $table->string('name', 100);
            $table->string('email', 254);
            $table->string('phone', 40)->nullable();
            $table->string('need', 40);
            $table->string('deadline', 40)->nullable();
            $table->string('budget', 100)->nullable();
            $table->text('message');
            $table->string('locale', 2)->default('fr');
            $table->string('solution_slug', 80)->nullable();   // slug saisi par le visiteur, volontairement sans clé étrangère
            $table->timestamp('consent_at');
            $table->string('status', 20)->default('new')->index();
            $table->text('internal_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};

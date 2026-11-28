<?php

namespace App\Console\Commands;

use App\Services\SiteDataSync;
use Illuminate\Console\Command;
use Throwable;

class SiteImport extends Command
{
    protected $signature = 'site:import {--path= : Dossier des JSON (défaut : SITE_DATA_PATH, ../assets/data)}';

    protected $description = 'Importe categories.json, solutions.json et projects.json du site statique dans la base (mise à jour par slug)';

    public function handle(): int
    {
        $directory = SiteDataSync::resolveDirectory($this->option('path'));
        try {
            $stats = (new SiteDataSync($directory))->import();
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("Import depuis $directory");
        foreach ($stats as $name => [$created, $updated]) {
            $this->line(sprintf('  %-11s %d créé(s), %d mis à jour', $name, $created, $updated));
        }

        return self::SUCCESS;
    }
}

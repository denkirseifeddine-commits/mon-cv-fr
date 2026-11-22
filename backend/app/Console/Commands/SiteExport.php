<?php

namespace App\Console\Commands;

use App\Services\SiteDataSync;
use Illuminate\Console\Command;
use Throwable;

class SiteExport extends Command
{
    protected $signature = 'site:export
        {--path= : Dossier des JSON (défaut : SITE_DATA_PATH, ../assets/data)}
        {--public-only : Exclure les solutions draft et archived}';

    protected $description = 'Réécrit categories.json, solutions.json et projects.json depuis la base, au format exact du site statique';

    public function handle(): int
    {
        $directory = SiteDataSync::resolveDirectory($this->option('path'));
        try {
            $result = (new SiteDataSync($directory))->export((bool) $this->option('public-only'));
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("Export vers $directory");
        foreach ($result as $file => $info) {
            $this->line(sprintf('  %-16s %d élément(s), %s', $file, $info['count'], $info['written'] ? 'réécrit' : 'inchangé'));
        }

        return self::SUCCESS;
    }
}

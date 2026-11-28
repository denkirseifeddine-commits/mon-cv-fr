<?php

namespace Tests\Concerns;

use App\Services\SiteDataSync;

trait ImportsSiteData
{
    /** Importe les JSON du dépôt (lecture seule) dans la base de test. */
    protected function importSiteData(): void
    {
        (new SiteDataSync(SiteDataSync::resolveDirectory()))->import();
    }

    /** Copie des JSON dans un dossier temporaire (pour tester l'export sans toucher au dépôt). */
    protected function copySiteData(): string
    {
        $dir = sys_get_temp_dir() . '/dss-data-' . bin2hex(random_bytes(4));
        mkdir($dir);
        foreach (['categories.json', 'solutions.json', 'projects.json'] as $file) {
            copy(SiteDataSync::resolveDirectory() . '/' . $file, "$dir/$file");
        }

        return $dir;
    }
}

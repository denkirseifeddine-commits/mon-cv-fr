<?php

namespace App\Services;

use App\Enums\ContentStatus;
use App\Models\Category;
use App\Models\Project;
use App\Models\SiteSetting;
use App\Models\Solution;
use App\Support\SiteJson;
use App\Support\SiteSerializer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Import et export des fichiers JSON du site statique (assets/data).
 * Import : mise à jour par slug, idempotent. Export : même format exact que les fichiers actuels.
 * questionnaire.json n'est pas géré : il reste édité à la main.
 */
class SiteDataSync
{
    private readonly string $directory;

    public function __construct(string $directory)
    {
        $this->directory = rtrim($directory, '/\\');
    }

    public static function resolveDirectory(?string $path = null): string
    {
        $path = $path ?: config('site.data_path');
        if (! str_starts_with($path, '/') && ! preg_match('#^[A-Za-z]:[\\\\/]#', $path)) {
            $path = base_path($path);
        }

        return $path;
    }

    // ------------------------------------------------------------------ import

    /** @return array{categories: array, solutions: array, projects: array} compteurs [créés, mis à jour] */
    public function import(): array
    {
        $categories = $this->read('categories.json');
        $solutions = $this->read('solutions.json');
        $projects = $this->read('projects.json');

        if (! array_is_list($categories) || ! array_is_list($solutions)) {
            throw new RuntimeException('categories.json et solutions.json doivent être des tableaux.');
        }
        if (! isset($projects['projects']) || ! is_array($projects['projects'])) {
            throw new RuntimeException('projects.json doit contenir une clé « projects ».');
        }

        return Model::withoutEvents(fn () => DB::transaction(function () use ($categories, $solutions, $projects) {
            $stats = [
                'categories' => $this->importAll($categories, fn ($row, $i) => $this->importCategory($row, $i)),
                'projects' => $this->importAll($projects['projects'], fn ($row, $i) => $this->importProject($row, $i)),
            ];
            // Les solutions référencent les catégories : importées en dernier
            $stats['solutions'] = $this->importAll($solutions, fn ($row, $i) => $this->importSolution($row, $i));

            $meta = array_filter(
                ['sourceOfTruth' => $projects['sourceOfTruth'] ?? null, 'note' => $projects['note'] ?? null],
                fn ($v) => $v !== null,
            );
            if ($meta !== []) {
                SiteSetting::query()->updateOrCreate(['key' => 'projects_meta'], ['value' => $meta]);
            }

            return $stats;
        }));
    }

    /** @return array{0: int, 1: int} [créés, mis à jour] */
    private function importAll(array $rows, callable $callback): array
    {
        $created = $updated = 0;
        foreach (array_values($rows) as $index => $row) {
            $model = $callback($row, $index);
            $model->wasRecentlyCreated ? $created++ : $updated++;
        }

        return [$created, $updated];
    }

    private function importCategory(array $row, int $index): Category
    {
        $slug = $this->slug($row, 'categories.json', $index);
        $category = Category::query()->firstOrNew(['slug' => $slug]);
        $category->fill([
            'sort_order' => $row['order'] ?? $index + 1,
            'label' => $row['label'] ?? [],
            'description' => $row['description'] ?? null,
            'status' => $this->status($row['status'] ?? 'draft', "categorie $slug"),
        ])->save();

        return $category;
    }

    private function importProject(array $row, int $index): Project
    {
        $slug = $this->slug($row, 'projects.json', $index);
        $project = Project::query()->firstOrNew(['slug' => $slug]);
        $project->fill([
            'sort_order' => $row['order'] ?? $index + 1,
            'featured' => (bool) ($row['featured'] ?? false),
            'name' => $row['name'] ?? $slug,
            'category' => $row['category'] ?? [],
            'summary' => $row['summary'] ?? [],
            'client' => $row['client'] ?? null,
            'period' => isset($row['period']) ? (string) $row['period'] : null,
            'technologies' => $row['technologies'] ?? [],
            'media' => $row['media'] ?? null,
            'url' => $row['url'] ?? null,
            'missing' => $row['missing'] ?? [],
        ])->save();

        return $project;
    }

    private function importSolution(array $row, int $index): Solution
    {
        $slug = $this->slug($row, 'solutions.json', $index);
        $categoryId = null;
        if (! empty($row['categoryId'])) {
            $categoryId = Category::query()->where('slug', $row['categoryId'])->value('id')
                ?? throw new RuntimeException("Solution « $slug » : catégorie inconnue « {$row['categoryId']} ».");
        }
        $price = $row['price'] ?? [];

        $solution = Solution::query()->firstOrNew(['slug' => $slug]);
        $solution->fill([
            'status' => $this->status($row['status'] ?? 'draft', "solution $slug"),
            'category_id' => $categoryId,
            'featured' => (bool) ($row['featured'] ?? false),
            'sort_order' => $index + 1,
            'updated_on' => $row['updatedAt'] ?? null,
            'name' => $row['name'] ?? [],
            'short_description' => $row['shortDescription'] ?? null,
            'problem' => $row['problem'] ?? null,
            'description' => $row['description'] ?? null,
            'notice' => $row['notice'] ?? null,
            'features' => $row['features'] ?? [],
            'technologies' => $row['technologies'] ?? [],
            'requirements' => $row['requirements'] ?? [],
            'deliverables' => $row['deliverables'] ?? [],
            'options' => $row['options'] ?? [],
            'screenshots' => $row['screenshots'] ?? [],
            'price_amount' => $price['amount'] ?? null,
            'price_currency' => $price['currency'] ?? null,
            'price_model' => $price['model'] ?? 'quote',
            'delivery_days' => $row['deliveryDays'] ?? null,
            'demo_url' => $row['demoUrl'] ?? null,
            'license' => $row['license'] ?? null,
            'match' => $row['match'] ?? null,
        ])->save();

        return $solution;
    }

    private function slug(array $row, string $file, int $index): string
    {
        $slug = $row['slug'] ?? null;
        if (! is_string($slug) || ! preg_match('/^[a-z0-9-]+$/', $slug)) {
            throw new RuntimeException("$file, élément " . ($index + 1) . ' : slug absent ou invalide.');
        }

        return $slug;
    }

    private function status(mixed $value, string $context): ContentStatus
    {
        return ContentStatus::tryFrom((string) $value)
            ?? throw new RuntimeException("$context : statut inconnu « $value ».");
    }

    private function read(string $file): array
    {
        $path = $this->directory . '/' . $file;
        if (! is_file($path)) {
            throw new RuntimeException("Fichier introuvable : $path");
        }
        $data = json_decode((string) file_get_contents($path), true);
        if (! is_array($data)) {
            throw new RuntimeException("JSON illisible : $path (" . json_last_error_msg() . ')');
        }

        return $data;
    }

    // ------------------------------------------------------------------ export

    /**
     * Réécrit les fichiers JSON depuis la base. Un fichier inchangé n'est pas réécrit.
     *
     * @return array<string, array{count: int, written: bool}>
     */
    public function export(bool $publicOnly = false): array
    {
        $categories = Category::query()->ordered()->get()->map(fn (Category $c) => SiteSerializer::category($c))->all();

        $solutionQuery = Solution::query()->ordered()->with('category');
        if ($publicOnly) {
            $solutionQuery->public();
        }
        $solutions = $solutionQuery->get()->map(fn (Solution $s) => SiteSerializer::solution($s))->all();

        $projects = Project::query()->ordered()->get()->map(fn (Project $p) => SiteSerializer::project($p))->all();
        $projectsFile = [
            ...SiteSetting::read('projects_meta', []),
            'projects' => $projects,
        ];

        return [
            'categories.json' => $this->write('categories.json', SiteJson::encode($categories), count($categories)),
            'solutions.json' => $this->write('solutions.json', SiteJson::encode($solutions, SiteJson::COMPACT), count($solutions)),
            'projects.json' => $this->write('projects.json', SiteJson::encode($projectsFile), count($projects)),
        ];
    }

    private function write(string $file, string $content, int $count): array
    {
        $path = $this->directory . '/' . $file;
        if (! is_dir($this->directory)) {
            throw new RuntimeException("Dossier introuvable : {$this->directory}");
        }
        $current = is_file($path) ? file_get_contents($path) : null;
        if ($current === $content) {
            return ['count' => $count, 'written' => false];
        }
        if (file_put_contents($path, $content, LOCK_EX) === false) {
            throw new RuntimeException("Écriture impossible : $path");
        }

        return ['count' => $count, 'written' => true];
    }
}

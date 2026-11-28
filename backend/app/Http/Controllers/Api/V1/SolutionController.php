<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SolutionResource;
use App\Models\Solution;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SolutionController extends Controller
{
    /**
     * GET /api/v1/solutions : fiches « exemple » et « published » uniquement.
     * Query : locale (fr|en|ar : textes aplatis dans cette langue), category (slug), search, featured, page.
     */
    public function index(Request $request): mixed
    {
        $validator = Validator::make($request->query(), [
            'locale' => ['nullable', 'in:fr,en,ar'],
            'category' => ['nullable', 'string', 'max:80'],
            'search' => ['nullable', 'string', 'max:100'],
            'featured' => ['nullable', 'in:0,1,true,false'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        if ($validator->fails()) {
            return response()->json(['error' => 'invalid', 'fields' => array_keys($validator->errors()->toArray())], 422);
        }

        $query = Solution::query()->public()->with('category')->ordered();

        if ($category = $request->query('category')) {
            $query->whereHas('category', fn (Builder $q) => $q->where('slug', $category));
        }
        if ($request->has('featured') && $request->query('featured') !== '') {
            $query->where('featured', filter_var($request->query('featured'), FILTER_VALIDATE_BOOLEAN));
        }
        if (($search = trim((string) $request->query('search', ''))) !== '') {
            $this->applySearch($query, $search);
        }

        $paginator = $query->paginate((int) $request->query('per_page', 12))->withQueryString();

        return SolutionResource::collection($paginator);
    }

    public function show(Request $request, string $slug): mixed
    {
        $locale = $request->query('locale');
        if ($locale !== null && ! in_array($locale, ['fr', 'en', 'ar'], true)) {
            return response()->json(['error' => 'invalid', 'fields' => ['locale']], 422);
        }

        $solution = Solution::query()->public()->with('category')->where('slug', $slug)->first();
        if (! $solution) {
            return response()->json(['error' => 'not-found'], 404);
        }

        return new SolutionResource($solution);
    }

    /** Recherche dans le slug et les textes (toutes langues) ; insensible à la casse (ILIKE sur PostgreSQL). */
    private function applySearch(Builder $query, string $term): void
    {
        $operator = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
        $pattern = '%' . addcslashes($term, '\\%_') . '%';

        $query->where(function (Builder $q) use ($operator, $pattern) {
            $q->where('slug', $operator, $pattern);
            foreach (['name', 'short_description', 'problem', 'description'] as $column) {
                foreach (config('site.locales') as $locale) {
                    $q->orWhere("$column->$locale", $operator, $pattern);
                }
            }
        });
    }
}

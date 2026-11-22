<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request): mixed
    {
        if (! $this->validLocale($request)) {
            return response()->json(['error' => 'invalid', 'fields' => ['locale']], 422);
        }

        return ProjectResource::collection(Project::query()->ordered()->get());
    }

    public function show(Request $request, string $slug): mixed
    {
        if (! $this->validLocale($request)) {
            return response()->json(['error' => 'invalid', 'fields' => ['locale']], 422);
        }
        $project = Project::query()->where('slug', $slug)->first();

        return $project ? new ProjectResource($project) : response()->json(['error' => 'not-found'], 404);
    }

    private function validLocale(Request $request): bool
    {
        $locale = $request->query('locale');

        return $locale === null || in_array($locale, ['fr', 'en', 'ar'], true);
    }
}

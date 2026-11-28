<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /** GET /api/v1/solution-categories : catégories publiques, dans l'ordre d'affichage. */
    public function index(Request $request): mixed
    {
        $locale = $request->query('locale');
        if ($locale !== null && ! in_array($locale, ['fr', 'en', 'ar'], true)) {
            return response()->json(['error' => 'invalid', 'fields' => ['locale']], 422);
        }

        return CategoryResource::collection(Category::query()->public()->ordered()->get());
    }
}

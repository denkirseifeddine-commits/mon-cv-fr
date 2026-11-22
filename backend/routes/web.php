<?php

use Illuminate\Support\Facades\Route;

// Pas de site public ici : le site vitrine est statique (racine du dépôt). Seuls /admin et /api/v1 sont servis.
Route::redirect('/', '/admin');

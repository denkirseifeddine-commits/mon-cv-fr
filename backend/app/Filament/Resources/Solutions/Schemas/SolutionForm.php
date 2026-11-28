<?php

namespace App\Filament\Resources\Solutions\Schemas;

use App\Enums\ContentStatus;
use App\Filament\Support\Multilingual;
use Closure;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TagsInput;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;

class SolutionForm
{
    /** Codes du questionnaire (assets/data/questionnaire.json) proposés pour le bloc « match ». */
    private const MATCH_SUGGESTIONS = [
        'needs' => ['website', 'ecommerce', 'automation', 'crm', 'application', 'ai'],
        'goals' => [],
        'industries' => [],
        'complexity' => ['simple', 'intermediate', 'advanced'],
        'customization' => ['ready', 'some-changes', 'custom'],
    ];

    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Tabs::make('solution')->columnSpanFull()->persistTabInQueryString()->tabs([
                Tab::make('Général')->schema([
                    Section::make('Identification')->columns(3)->schema([
                        TextInput::make('slug')
                            ->label('Identifiant (slug)')
                            ->helperText('Minuscules, chiffres et tirets. Une fiche d\'exemple commence par « exemple- ».')
                            ->required()
                            ->maxLength(80)
                            ->regex('/^[a-z0-9-]+$/')
                            ->unique(ignoreRecord: true)
                            ->rules([fn (Get $get): Closure => function (string $attribute, $value, Closure $fail) use ($get) {
                                if (self::isExample($get('status')) && ! str_starts_with((string) $value, 'exemple-')) {
                                    $fail('Le slug d\'une fiche d\'exemple doit commencer par « exemple- ».');
                                }
                            }]),
                        Select::make('status')
                            ->label('Statut')
                            ->options(ContentStatus::class)
                            ->default(ContentStatus::Draft->value)
                            ->required()
                            ->live()
                            ->native(false)
                            ->helperText('Exemple : fiche non commercialisée, affichée avec la mention « Exemple, non commercialisé » ; ni prix ni délai.'),
                        Select::make('category_id')
                            ->label('Catégorie')
                            ->options(fn () => Multilingual::categoryOptions())
                            ->searchable()
                            ->native(false),
                        Toggle::make('featured')->label('À la une'),
                        TextInput::make('sort_order')->label('Ordre d\'affichage')->numeric()->minValue(0)->default(0),
                        DatePicker::make('updated_on')->label('Dernière mise à jour')->native(false)->disabled()->dehydrated(false)
                            ->helperText('Renseignée automatiquement à chaque enregistrement.'),
                    ]),
                    Section::make('Textes')->schema([
                        Multilingual::tabs('name', 'Nom', maxLength: 150),
                        Multilingual::tabs('short_description', 'Description courte', textarea: true, rows: 2),
                        Multilingual::tabs('problem', 'Problème auquel la solution répond', textarea: true, rows: 3),
                        Multilingual::tabs('description', 'Description', textarea: true, rows: 5),
                        Multilingual::tabs('notice', 'Mention affichée (ex. « Exemple, non commercialisé »)', required: false),
                    ]),
                ]),
                Tab::make('Contenu')->schema([
                    Repeater::make('features')->label('Fonctionnalités (4 à 6)')->addActionLabel('Ajouter une fonctionnalité')
                        ->schema(Multilingual::stacked('', 'Texte', textarea: true))->defaultItems(0)->collapsible()->reorderable()->columnSpanFull(),
                    TagsInput::make('technologies')->label('Technologies (noms d\'outils, sans version)')->columnSpanFull(),
                    Repeater::make('requirements')->label('Prérequis côté client (1 à 3)')->addActionLabel('Ajouter un prérequis')
                        ->schema(Multilingual::stacked('', 'Texte', textarea: true))->defaultItems(0)->collapsible()->reorderable()->columnSpanFull(),
                    Repeater::make('deliverables')->label('Livrables (2 à 4)')->addActionLabel('Ajouter un livrable')
                        ->schema(Multilingual::stacked('', 'Texte', textarea: true))->defaultItems(0)->collapsible()->reorderable()->columnSpanFull(),
                    Repeater::make('options')->label('Options (0 à 3)')->addActionLabel('Ajouter une option')
                        ->schema([
                            ...Multilingual::stacked('name', 'Nom'),
                            ...Multilingual::stacked('description', 'Description', textarea: true, required: false),
                        ])->defaultItems(0)->collapsible()->reorderable()->columnSpanFull(),
                ]),
                Tab::make('Prix et démo')->schema([
                    Section::make('Prix et délai')
                        ->description('Une fiche d\'exemple n\'a ni prix ni délai (« Sur devis », « À définir »). Ne renseigner que des valeurs réelles.')
                        ->columns(4)
                        ->hidden(fn (Get $get) => self::isExample($get('status')))
                        ->schema([
                            TextInput::make('price_amount')->label('Montant')->numeric()->minValue(0),
                            TextInput::make('price_currency')->label('Devise (ISO)')->length(3)->regex('/^[A-Z]{3}$/')->placeholder('EUR'),
                            Select::make('price_model')->label('Modèle de prix')->options([
                                'quote' => 'Sur devis',
                                'fixed' => 'Prix fixe',
                                'from' => 'À partir de',
                                'subscription' => 'Abonnement',
                            ])->default('quote')->native(false),
                            TextInput::make('delivery_days')->label('Délai (jours)')->numeric()->integer()->minValue(1),
                        ]),
                    TextInput::make('demo_url')->label('Adresse de la démo')->url()->maxLength(2048)
                        ->hidden(fn (Get $get) => self::isExample($get('status'))),
                    Section::make('Licence')->columns(3)->schema([
                        TextInput::make('license.name')->label('Licence'),
                        TextInput::make('license.url')->label('Adresse de la licence')->url(),
                        Toggle::make('license.verified')->label('Licence vérifiée'),
                    ])->hidden(fn (Get $get) => self::isExample($get('status'))),
                    Repeater::make('screenshots')->label('Captures d\'écran')->addActionLabel('Ajouter une capture')
                        ->schema([
                            TextInput::make('src')->label('Chemin (ex. assets/solutions/x.jpg)')->required(),
                            ...Multilingual::stacked('alt', 'Texte alternatif'),
                        ])->defaultItems(0)->collapsible()->columnSpanFull()
                        ->hidden(fn (Get $get) => self::isExample($get('status'))),
                ]),
                Tab::make('Recommandation')->schema([
                    Section::make('Correspondance avec le questionnaire')
                        ->description('Codes des questions de assets/data/questionnaire.json. Sans effet sur l\'affichage : utilisé par le moteur de recommandation.')
                        ->schema([
                            self::matchTags('needs', 'Besoins (need)'),
                            self::matchTags('goals', 'Objectifs (goal)'),
                            self::matchTags('industries', 'Secteurs (industry) : vide = tous'),
                            self::matchTags('complexity', 'Complexité (complexity)'),
                            self::matchTags('customization', 'Personnalisation (customization)'),
                        ]),
                ]),
            ]),
        ]);
    }

    private static function matchTags(string $key, string $label): TagsInput
    {
        return TagsInput::make("match.$key")->label($label)->suggestions(self::MATCH_SUGGESTIONS[$key]);
    }

    private static function isExample(mixed $status): bool
    {
        return ($status instanceof ContentStatus ? $status->value : $status) === ContentStatus::Exemple->value;
    }

    /**
     * Règles d'une fiche « exemple » (docs/CONTENT-MODEL.md) : ni prix, ni délai, ni démo, ni licence, ni capture.
     * Appelé avant l'enregistrement par les pages de création et de modification.
     */
    public static function normalize(array $data): array
    {
        if (self::isExample($data['status'] ?? null)) {
            $data['price_amount'] = null;
            $data['price_currency'] = null;
            $data['price_model'] = 'quote';
            $data['delivery_days'] = null;
            $data['demo_url'] = null;
            $data['screenshots'] = [];
            $data['license'] = ['name' => null, 'url' => null, 'verified' => false];
        }

        return $data;
    }
}

<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

use function Laravel\Prompts\password;

class AdminCreate extends Command
{
    protected $signature = 'admin:create
        {--email= : Adresse e-mail (défaut : ADMIN_EMAIL)}
        {--name= : Nom affiché (défaut : ADMIN_NAME)}';

    protected $description = 'Crée ou met à jour un administrateur du backoffice. Le mot de passe vient de ADMIN_PASSWORD (environnement du shell) ou d\'une saisie masquée.';

    public function handle(): int
    {
        $email = $this->option('email') ?: config('site.admin.email');
        $name = $this->option('name') ?: config('site.admin.name') ?: 'Administrateur';
        if (! $email) {
            $this->error('Adresse e-mail absente : renseignez ADMIN_EMAIL ou l\'option --email.');

            return self::FAILURE;
        }

        $secret = getenv('ADMIN_PASSWORD') ?: null;
        if ($secret === null) {
            if (! $this->input->isInteractive()) {
                $this->error('Mot de passe absent : définissez ADMIN_PASSWORD dans l\'environnement du shell (pas dans un fichier versionné) ou lancez la commande en mode interactif.');

                return self::FAILURE;
            }
            $secret = password('Mot de passe (12 caractères au moins)', required: true);
        }

        $validator = Validator::make(
            ['email' => $email, 'password' => $secret],
            ['email' => ['required', 'email:rfc'], 'password' => ['required', 'string', 'min:12']],
        );
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $user = User::query()->firstOrNew(['email' => $email]);
        $existed = $user->exists;
        $user->name = $name;
        $user->password = $secret;   // haché par le cast « hashed »
        $user->email_verified_at ??= now();
        $user->save();

        $this->info(($existed ? 'Administrateur mis à jour : ' : 'Administrateur créé : ') . $email);

        return self::SUCCESS;
    }
}

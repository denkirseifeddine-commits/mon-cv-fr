#!/usr/bin/env node
/**
 * Régénère les versions téléchargeables des deux CV :
 *   - assets/cv/*.pdf  : impression de la page HTML par Chromium (Playwright)
 *   - assets/cv/*.docx : version Word compatible ATS (scripts/build-cv-docx.py)
 *
 * Usage : node scripts/build-cv.mjs   (lançable depuis n'importe quel dossier)
 * Prérequis : Playwright (avec Chromium), python3 avec python-docx et pypdf.
 * Ne modifie jamais les pages HTML sources.
 */
import { spawnSync } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Playwright est installé globalement : require (CommonJS) respecte NODE_PATH, contrairement à import.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER_CV = path.join(RACINE, 'assets', 'cv');
const SCRIPT_DOCX = path.join(RACINE, 'scripts', 'build-cv-docx.py');
const AUTEUR = 'Seif Eddine Denkir';

/** Les trois CV : page HTML source, nom de base des fichiers produits, titre des métadonnées. */
const CV = [
    {
        html: 'cv.html',
        fichier: 'cv-seif-eddine-denkir',
        titre: 'CV — Seif Eddine Denkir',
    },
    {
        html: 'cv-chef-de-projet.html',
        fichier: 'cv-chef-de-projet-seif-eddine-denkir',
        titre: 'CV Chef de projet — Seif Eddine Denkir',
    },
    {
        html: 'cv-commercial.html',
        fichier: 'cv-commercial-seif-eddine-denkir',
        titre: 'CV Relation client & communication — Seif Eddine Denkir',
    },
];

/**
 * Chromium ne règle ni l'auteur ni le titre du PDF autrement que par la page :
 * pypdf écrit les métadonnées du fichier. Les valeurs passent en arguments, pas dans le code.
 */
const SCRIPT_METADONNEES_PDF = `
import os, sys
from pypdf import PdfReader, PdfWriter
chemin, titre, auteur = sys.argv[1:4]
ecrivain = PdfWriter(clone_from=PdfReader(chemin))
ecrivain.add_metadata({"/Title": titre, "/Author": auteur})
tmp = chemin + ".tmp"
with open(tmp, "wb") as fichier:
    ecrivain.write(fichier)
os.replace(tmp, chemin)
`;

/** Lance une commande et échoue avec sa sortie d'erreur si elle ne réussit pas. */
function lancer(commande, args) {
    const resultat = spawnSync(commande, args, { encoding: 'utf8' });
    if (resultat.error) {
        throw new Error(`${commande} : ${resultat.error.message}`);
    }
    if (resultat.status !== 0) {
        throw new Error(`${commande} a échoué :\n${resultat.stderr || resultat.stdout}`);
    }
    return resultat;
}

/** Imprime la page HTML en PDF A4 : texte sélectionnable, pas d'image de texte. */
async function produirePdf(navigateur, source, sortie, titre) {
    const page = await navigateur.newPage();
    try {
        await page.goto(pathToFileURL(source).href, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready.then(() => true));
        // Titre du PDF : modifie seulement le DOM en mémoire, jamais le fichier HTML.
        await page.evaluate((t) => { document.title = t; }, titre);
        await page.pdf({
            path: sortie,
            format: 'A4',
            printBackground: false,
            preferCSSPageSize: true,
            tagged: true,
            outline: true,
        });
    } finally {
        await page.close();
    }
    lancer('python3', ['-c', SCRIPT_METADONNEES_PDF, sortie, titre, AUTEUR]);
}

async function main() {
    await mkdir(DOSSIER_CV, { recursive: true });
    const navigateur = await chromium.launch();
    try {
        for (const cv of CV) {
            const source = path.join(RACINE, cv.html);
            const pdf = path.join(DOSSIER_CV, `${cv.fichier}.pdf`);
            const docx = path.join(DOSSIER_CV, `${cv.fichier}.docx`);

            await produirePdf(navigateur, source, pdf, cv.titre);
            lancer('python3', [SCRIPT_DOCX, source, docx, cv.titre, AUTEUR]);

            for (const fichier of [pdf, docx]) {
                const { size } = await stat(fichier);
                console.log(`${path.relative(RACINE, fichier)}  ${(size / 1024).toFixed(1)} Ko`);
            }
        }
    } finally {
        await navigateur.close();
    }
}

main().catch((erreur) => {
    console.error(erreur.message);
    process.exitCode = 1;
});

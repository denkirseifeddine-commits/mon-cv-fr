#!/usr/bin/env python3
"""Vérifie le site statique : liens internes, ancres, JSON, fichiers d'entrée,
imports relatifs des modules JavaScript et références des fichiers CSS.

Lancement : python3 scripts/check-site.py (depuis n'importe où).
Bibliothèque standard uniquement. Code de sortie 1 s'il y a au moins une erreur.
"""
import json
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

# Racine du dépôt = dossier parent de scripts/
ROOT = Path(__file__).resolve().parent.parent

# Dossiers ignorés pendant le parcours, à n'importe quel niveau
DOSSIERS_IGNORES = {".git", "node_modules", "docs"}

# Liens externes ou spéciaux (http:, https:, //, mailto:, tel:, data:, javascript:...) :
# on ignore tout ce qui commence par un schéma, ce qui couvre les préfixes listés.
EXTERNE = re.compile(r"^(?:[a-z][a-z0-9+.-]*:|//)", re.IGNORECASE)

# Fichiers d'entrée obligatoires (chemins relatifs à la racine)
FICHIERS_REQUIS = ["index.html", "cv.html", "assets/portfolio.css", "assets/portfolio.js"]

# Imports statiques JavaScript : import ... from 'x', import 'x', export ... from 'x'.
# Le groupe 2 capture le chemin ; la clause "from" est facultative (import 'x').
IMPORT_STATIQUE = re.compile(
    r"""(?<![\w$.])(?:import|export)\b(?:[^'"`;()]*?\bfrom)?\s*(['"])([^'"\n]+)\1""")

# Imports dynamiques JavaScript : import('x'). Le groupe 2 capture le chemin.
IMPORT_DYNAMIQUE = re.compile(r"""(?<![\w$.])import\s*\(\s*(['"])([^'"\n]+)\1\s*\)""")

# Références CSS : @import "x.css", @import url(x.css), url(...).
# Un @import est consommé en entier par la première alternative, son url() n'est donc pas compté deux fois.
# Groupes utiles : 2 (@import url), 4 (@import "..."), 6 (url(...)).
REFERENCE_CSS = re.compile(
    r"""@import\s+(?:url\(\s*(['"]?)([^'")]*?)\1\s*\)|(['"])([^'"]*)\3)"""
    r"""|url\(\s*(['"]?)([^'")]*?)\5\s*\)""",
    re.IGNORECASE)


class Analyseur(HTMLParser):
    """Collecte les id et les attributs href/src, avec leur numéro de ligne."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.liens = []  # liste de (ligne, valeur)

    def handle_starttag(self, tag, attrs):
        # Gère aussi les balises auto-fermantes (<use/>, <img/>) via handle_startendtag
        ligne = self.getpos()[0]
        for nom, valeur in attrs:
            if valeur is None:
                continue
            if nom == "id":
                self.ids.add(valeur)
            elif nom in ("href", "src"):
                self.liens.append((ligne, valeur.strip()))


class Verificateur:
    """Accumule les problèmes et le nombre de liens vérifiés."""

    def __init__(self):
        self.problemes = []  # liste de (niveau, fichier, ligne, message)
        self.liens_verifies = 0
        self.fichiers_js = 0
        self.imports_verifies = 0
        self.fichiers_css = 0
        self.references_css = 0
        self._cache = {}  # chemin -> (ids, liens), pour ne lire chaque fichier qu'une fois

    def signaler(self, niveau, chemin, ligne, message):
        self.problemes.append((niveau, chemin.relative_to(ROOT).as_posix(), ligne, message))

    def analyser(self, chemin):
        """Retourne (ids, liens) d'un fichier HTML, avec mise en cache."""
        if chemin not in self._cache:
            analyseur = Analyseur()
            analyseur.feed(chemin.read_text(encoding="utf-8", errors="replace"))
            analyseur.close()
            self._cache[chemin] = (analyseur.ids, analyseur.liens)
        return self._cache[chemin]

    def verifier_lien(self, source, ligne, valeur):
        """Vérifie une valeur href/src trouvée dans le fichier source."""
        if EXTERNE.match(valeur):
            return  # externe ou spécial : non vérifié
        self.liens_verifies += 1

        # Lien d'ancre vide
        if valeur == "#":
            self.signaler("AVERTISSEMENT", source, ligne, "lien vide (#)")
            return

        # Ancre pure : l'id doit exister dans le même fichier
        if valeur.startswith("#"):
            ids_source, _ = self.analyser(source)
            if unquote(valeur[1:]) not in ids_source:
                self.signaler("ERREUR", source, ligne, f"ancre introuvable dans ce fichier : {valeur}")
            return

        # Chemin absolu : interdit (sauf href="/" dans 404.html)
        if valeur.startswith("/"):
            if source.relative_to(ROOT).as_posix() == "404.html" and valeur == "/":
                return
            self.signaler("ERREUR", source, ligne,
                          f"chemin absolu, incompatible avec GitHub Pages : {valeur}")
            return

        # Chemin relatif : on retire ?query et #fragment, puis on résout par rapport au fichier
        parties = urlsplit(valeur)
        chemin_brut = unquote(parties.path)
        if chemin_brut:
            cible = Path(os.path.normpath(source.parent / chemin_brut))
        else:
            cible = source  # lien du type "?x" ou "#..." : la cible est le fichier lui-même

        # Dossier : il faut un index.html dedans
        if cible.is_dir():
            cible = cible / "index.html"
            if not cible.is_file():
                self.signaler("ERREUR", source, ligne, f"dossier sans index.html : {valeur}")
                return
        elif not cible.exists():
            self.signaler("ERREUR", source, ligne, f"cible introuvable : {valeur}")
            return

        # Fragment vers une page HTML : l'id doit exister dans la cible
        fragment = unquote(parties.fragment)
        if fragment and cible.suffix == ".html":
            ids_cible, _ = self.analyser(cible)
            if fragment not in ids_cible:
                self.signaler("ERREUR", source, ligne,
                              f"ancre introuvable dans {cible.relative_to(ROOT).as_posix()} : #{fragment}")

    def verifier_json(self):
        """Vérifie que chaque fichier assets/data/**/*.json est un JSON valide."""
        dossier = ROOT / "assets" / "data"
        if not dossier.is_dir():
            return
        for chemin in sorted(dossier.rglob("*.json")):
            try:
                with chemin.open(encoding="utf-8") as f:
                    json.load(f)
            except json.JSONDecodeError as e:
                self.signaler("ERREUR", chemin, e.lineno, f"JSON invalide : {e.msg}")
            except (OSError, UnicodeDecodeError) as e:
                self.signaler("ERREUR", chemin, 0, f"fichier illisible : {e}")

    def verifier_entrees(self):
        """Vérifie la présence des fichiers d'entrée (ligne 0 = pas de ligne concernée)."""
        for rel in FICHIERS_REQUIS:
            if not (ROOT / rel).is_file():
                self.signaler("ERREUR", ROOT / rel, 0, "fichier d'entrée absent")

    def verifier_import_js(self, source, ligne, valeur):
        """Vérifie un import relatif (./ ou ../) : extension .js obligatoire et cible existante."""
        if valeur.startswith("/") and not valeur.startswith("//"):
            self.imports_verifies += 1
            self.signaler("ERREUR", source, ligne,
                          f"chemin absolu, incompatible avec GitHub Pages : {valeur}")
            return
        if not valeur.startswith(("./", "../")):
            return  # non relatif (URL, nom de paquet...) : non vérifié
        self.imports_verifies += 1
        chemin_brut = unquote(urlsplit(valeur).path)
        if not chemin_brut.endswith(".js"):
            self.signaler("ERREUR", source, ligne,
                          f"import relatif sans extension .js : {valeur}")
            return
        cible = Path(os.path.normpath(source.parent / chemin_brut))
        if not cible.is_file():
            self.signaler("ERREUR", source, ligne, f"cible introuvable : {valeur}")

    def verifier_js(self):
        """Vérifie les imports relatifs de chaque fichier *.js sous assets/."""
        for source in fichiers_avec_extension(ROOT / "assets", ".js"):
            self.fichiers_js += 1
            texte = masquer_commentaires_ligne(source.read_text(encoding="utf-8", errors="replace"))
            trouves = []
            for regex in (IMPORT_STATIQUE, IMPORT_DYNAMIQUE):
                for m in regex.finditer(texte):
                    trouves.append((m.start(), m.group(2)))
            for debut, valeur in sorted(trouves):
                ligne = texte.count("\n", 0, debut) + 1
                self.verifier_import_js(source, ligne, valeur)

    def verifier_css(self):
        """Vérifie les @import et url(...) de chaque fichier *.css du dépôt."""
        for source in fichiers_avec_extension(ROOT, ".css"):
            self.fichiers_css += 1
            texte = source.read_text(encoding="utf-8", errors="replace")
            for m in REFERENCE_CSS.finditer(texte):
                valeur = next(g for g in (m.group(2), m.group(4), m.group(6)) if g is not None).strip()
                if not valeur or valeur.startswith("#") or EXTERNE.match(valeur):
                    continue  # vide, ancre SVG (#id), externe ou data: : non vérifié
                ligne = texte.count("\n", 0, m.start()) + 1
                self.references_css += 1
                if valeur.startswith("/"):
                    self.signaler("ERREUR", source, ligne,
                                  f"chemin absolu, incompatible avec GitHub Pages : {valeur}")
                    continue
                chemin_brut = unquote(urlsplit(valeur).path)
                if not chemin_brut:
                    continue  # référence sans chemin (ex. "?x") : rien à vérifier
                cible = Path(os.path.normpath(source.parent / chemin_brut))
                if not cible.is_file():
                    self.signaler("ERREUR", source, ligne, f"cible introuvable : {valeur}")


def masquer_commentaires_ligne(texte):
    """Remplace les lignes commençant par // par des lignes vides (les numéros de ligne sont conservés)."""
    return "\n".join("" if ligne.lstrip().startswith("//") else ligne for ligne in texte.split("\n"))


def fichiers_avec_extension(racine, extension):
    """Retourne tous les fichiers de racine dont le nom finit par extension, sauf dans les dossiers ignorés."""
    trouves = []
    for dirpath, dirnames, filenames in os.walk(racine):
        dirnames[:] = [d for d in dirnames if d not in DOSSIERS_IGNORES]
        for nom in filenames:
            if nom.endswith(extension):
                trouves.append(Path(dirpath) / nom)
    return sorted(trouves)


def fichiers_html():
    """Retourne tous les *.html du dépôt, sauf dans les dossiers ignorés."""
    return fichiers_avec_extension(ROOT, ".html")


def main():
    verif = Verificateur()
    html = fichiers_html()

    for fichier in html:
        _, liens = verif.analyser(fichier)
        for ligne, valeur in liens:
            verif.verifier_lien(fichier, ligne, valeur)

    verif.verifier_json()
    verif.verifier_entrees()
    verif.verifier_js()
    verif.verifier_css()

    for niveau, fichier, ligne, message in verif.problemes:
        print(f"{niveau} {fichier}:{ligne} {message}")

    erreurs = sum(1 for p in verif.problemes if p[0] == "ERREUR")
    avertissements = sum(1 for p in verif.problemes if p[0] == "AVERTISSEMENT")
    print(f"{len(html)} fichier(s) HTML, {verif.liens_verifies} lien(s) vérifié(s), "
          f"{verif.fichiers_js} fichier(s) JS, {verif.imports_verifies} import(s), "
          f"{verif.fichiers_css} fichier(s) CSS, {verif.references_css} référence(s) CSS, "
          f"{erreurs} erreur(s), {avertissements} avertissement(s)")
    return 1 if erreurs else 0


if __name__ == "__main__":
    sys.exit(main())

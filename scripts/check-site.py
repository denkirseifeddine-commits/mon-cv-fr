#!/usr/bin/env python3
"""Vérifie le site statique : liens internes, ancres, JSON, fichiers d'entrée,
imports relatifs des modules JavaScript, références des fichiers CSS, langue des
pages (lang, dir, dossier) et liens hreflang (existence, réciprocité, x-default).

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


# Langues du site : valeurs admises pour <html lang>
LANGUES = ("fr", "en", "ar")
# Langues qui ont leur propre dossier au premier niveau (le français est à la racine)
LANGUES_DOSSIER = ("en", "ar")
# Pages sans contrôle de langue : HTML autonome, CV français, outil interne
PAGES_SANS_LANGUE = {"404.html", "cv.html"}
DOSSIER_SANS_LANGUE = "design-system/"
# Préfixe des URL hreflang et du sitemap (production)
BASE_PUBLIQUE = "https://mon-cv-fr.vercel.app/"


class Analyseur(HTMLParser):
    """Collecte les id, les attributs href/src (avec leur numéro de ligne), les attributs
    lang/dir de la balise <html> et les <link rel="alternate" hreflang>."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.liens = []  # liste de (ligne, valeur)
        self.html = None  # (ligne, attributs) de la balise <html>, None si absente
        self.hreflang = []  # liste de (ligne, code, href)

    def handle_starttag(self, tag, attrs):
        # Gère aussi les balises auto-fermantes (<use/>, <img/>) via handle_startendtag
        ligne = self.getpos()[0]
        if tag == "html" and self.html is None:
            self.html = (ligne, {nom: valeur for nom, valeur in attrs if valeur is not None})
        if tag == "link":
            attributs = {nom: valeur for nom, valeur in attrs if valeur is not None}
            if "alternate" in attributs.get("rel", "").lower().split() and "hreflang" in attributs:
                self.hreflang.append((ligne, attributs["hreflang"].strip(), attributs.get("href", "").strip()))
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
        self.pages_langue = 0  # pages dont la langue a été vérifiée
        self.pages_hreflang = 0  # pages qui déclarent des hreflang
        self.liens_hreflang = 0  # liens <link hreflang> vérifiés
        self._cache = {}  # chemin -> Analyseur, pour ne lire chaque fichier qu'une fois

    def signaler(self, niveau, chemin, ligne, message):
        self.problemes.append((niveau, chemin.relative_to(ROOT).as_posix(), ligne, message))

    def analyser_complet(self, chemin):
        """Retourne l'Analyseur d'un fichier HTML, avec mise en cache."""
        if chemin not in self._cache:
            analyseur = Analyseur()
            analyseur.feed(chemin.read_text(encoding="utf-8", errors="replace"))
            analyseur.close()
            self._cache[chemin] = analyseur
        return self._cache[chemin]

    def analyser(self, chemin):
        """Retourne (ids, liens) d'un fichier HTML, avec mise en cache."""
        analyseur = self.analyser_complet(chemin)
        return analyseur.ids, analyseur.liens

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


    def verifier_langue(self, source):
        """Vérifie <html lang> (fr, en ou ar), la langue selon le dossier et l'attribut dir."""
        analyseur = self.analyser_complet(source)
        rel = source.relative_to(ROOT).as_posix()
        if analyseur.html is None:
            self.signaler("ERREUR", source, 0, "balise <html> introuvable")
            return
        ligne, attributs = analyseur.html
        self.pages_langue += 1
        lang = attributs.get("lang", "").strip()
        if lang not in LANGUES:
            self.signaler("ERREUR", source, ligne,
                          f"attribut lang absent ou invalide (fr, en ou ar attendu) : {lang or '(vide)'}")
            return
        attendue = langue_attendue(rel)
        if lang != attendue:
            self.signaler("ERREUR", source, ligne,
                          f"lang=\"{lang}\" incohérent avec le dossier (\"{attendue}\" attendu)")
        dir_attendu = "rtl" if lang == "ar" else "ltr"
        dir_page = attributs.get("dir", "").strip()
        if dir_page != dir_attendu:
            self.signaler("ERREUR", source, ligne,
                          f"dir=\"{dir_page or '(absent)'}\" incohérent avec lang=\"{lang}\" (\"{dir_attendu}\" attendu)")

    def resoudre_hreflang(self, href):
        """Fichier local désigné par une URL hreflang du domaine public, ou None si aucun fichier n'existe."""
        if not href.startswith(BASE_PUBLIQUE):
            return None
        relatif = unquote(urlsplit(href).path)[1:]
        cible = Path(os.path.normpath(ROOT / relatif))
        if not relatif or relatif.endswith("/"):
            cible = cible / "index.html"
        return cible if cible.is_file() else None

    def annonce_en_retour(self, cible, code, source):
        """Vrai si la page cible déclare hreflang=code vers la page source."""
        for _, code_cible, href in self.analyser_complet(cible).hreflang:
            pointe = self.resoudre_hreflang(href)
            if code_cible == code and pointe is not None and pointe.resolve() == source.resolve():
                return True
        return False

    def verifier_hreflang(self, source):
        """Vérifie les <link rel="alternate" hreflang> : URL locales existantes, réciprocité, x-default."""
        analyseur = self.analyser_complet(source)
        if not analyseur.hreflang:
            return
        self.pages_hreflang += 1
        rel = source.relative_to(ROOT).as_posix()
        lang_source = analyseur.html[1].get("lang", "").strip() if analyseur.html else ""
        cibles = {}  # code -> (ligne, chemin local)
        for ligne, code, href in analyseur.hreflang:
            self.liens_hreflang += 1
            if code not in LANGUES and code != "x-default":
                self.signaler("ERREUR", source, ligne, f"hreflang inconnu : {code}")
                continue
            if code in cibles:
                self.signaler("ERREUR", source, ligne, f"hreflang {code} déclaré plusieurs fois")
                continue
            if not href.startswith(BASE_PUBLIQUE):
                self.signaler("ERREUR", source, ligne, f"hreflang {code} : URL hors de {BASE_PUBLIQUE} : {href}")
                continue
            cible = self.resoudre_hreflang(href)
            if cible is None:
                self.signaler("ERREUR", source, ligne, f"hreflang {code} : cible introuvable : {href}")
                continue
            cibles[code] = (ligne, cible)

        # x-default doit exister et pointer vers la version française de la page
        if "x-default" not in cibles:
            self.signaler("ERREUR", source, analyseur.hreflang[0][0], "hreflang x-default absent")
        else:
            ligne, cible = cibles["x-default"]
            attendu = ROOT / sans_prefixe_langue(rel)
            if cible.resolve() != attendu.resolve():
                self.signaler("ERREUR", source, ligne,
                              f"x-default doit pointer vers la version française "
                              f"({sans_prefixe_langue(rel)}), pas vers {cible.relative_to(ROOT).as_posix()}")

        # Réciprocité : si A annonce B, B doit annoncer A avec le hreflang de la langue de A
        if lang_source not in LANGUES:
            return
        for code, (ligne, cible) in cibles.items():
            if code in ("x-default", lang_source) or cible.resolve() == source.resolve():
                continue
            if not self.annonce_en_retour(cible, lang_source, source):
                self.signaler("ERREUR", source, ligne,
                              f"réciprocité absente : {cible.relative_to(ROOT).as_posix()} doit annoncer "
                              f"{rel} avec hreflang=\"{lang_source}\"")


def langue_attendue(rel):
    """Langue attendue d'une page d'après son dossier : en/… → en, ar/… → ar, le reste → fr."""
    premier = rel.split("/", 1)[0]
    return premier if premier in LANGUES_DOSSIER else "fr"


def sans_prefixe_langue(rel):
    """Chemin de la version française d'une page : en/services/index.html → services/index.html."""
    langue = langue_attendue(rel)
    return rel if langue == "fr" else rel[len(langue) + 1:]


def page_traduite(source):
    """Vrai si la page doit porter une langue (hors 404.html, cv.html et design-system/)."""
    rel = source.relative_to(ROOT).as_posix()
    return rel not in PAGES_SANS_LANGUE and not rel.startswith(DOSSIER_SANS_LANGUE)


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
        if page_traduite(fichier):
            verif.verifier_langue(fichier)
        verif.verifier_hreflang(fichier)

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
    print(f"{verif.pages_langue} page(s) à langue vérifiée, {verif.pages_hreflang} page(s) avec hreflang, "
          f"{verif.liens_hreflang} lien(s) hreflang vérifié(s)")
    return 1 if erreurs else 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Produit la version Word (.docx) compatible ATS d'un CV à partir de sa page HTML.

Usage : python3 scripts/build-cv-docx.py <page.html> <sortie.docx> <titre> <auteur>
Appelé par scripts/build-cv.mjs, qui fournit les chemins et les métadonnées.

La page est lue avec html.parser (bibliothèque standard). Correspondance :
  h1                      -> titre du nom (style « Title »)
  p.cv-titre              -> sous-titre, en gras
  p (autres)              -> paragraphe « Normal »
  ul.coordonnees > li     -> une ligne de coordonnées, sans puce
  h2                      -> « Heading 1 »
  h3                      -> « Heading 2 »
  ul > li                 -> « List Bullet »
  strong, b               -> gras
  a                       -> texte seul (les URL restent visibles)
La barre de navigation (classe « barre ») et head/script/style sont ignorées.

Règles ATS : une seule colonne, aucun tableau, aucune zone de texte, aucun
en-tête ni pied de page, police Calibri 10,5 pt, titres en gras, marges de 1,8 cm,
langue français, propriétés du document (titre, auteur).
"""

import re
import sys
from datetime import datetime
from html.parser import HTMLParser

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

POLICE = "Calibri"
TAILLE_CORPS = Pt(10.5)
TAILLE_NOM = Pt(20)
TAILLE_SOUS_TITRE = Pt(12)

# Balises sans contenu : elles ne sont jamais empilées.
BALISES_VIDES = {"area", "base", "br", "col", "embed", "hr", "img", "input",
                 "link", "meta", "source", "track", "wbr"}
# Balises dont le contenu n'est jamais imprimé.
BALISES_IGNOREES = {"head", "script", "style", "title"}
# Balises qui produisent un paragraphe Word.
BALISES_BLOCS = {"h1", "h2", "h3", "p", "li"}

# Correspondance entre le genre de bloc et le style Word.
STYLE_PAR_GENRE = {
    "nom": "Title",
    "titre1": "Heading 1",
    "titre2": "Heading 2",
    "sous_titre": "Normal",
    "coord": "Normal",
    "paragraphe": "Normal",
    "puce": "List Bullet",
}


class PageCV(HTMLParser):
    """Extrait les blocs de texte de la page, dans l'ordre du document."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.pile = []        # balises ouvertes
        self.masque = None    # profondeur de la pile où commence une zone ignorée
        self.gras = 0         # imbrication de <strong> / <b>
        self.listes = []      # pour chaque <ul> ouvert : True si liste de coordonnées
        self.courant = None   # bloc en cours de lecture
        self.blocs = []       # résultat : dictionnaires {genre, runs}

    # --- Ouverture et fermeture des balises -------------------------------

    def handle_starttag(self, balise, attrs):
        if balise in BALISES_VIDES:
            return
        classes = (dict(attrs).get("class") or "").split()
        if self.masque is None and (balise in BALISES_IGNOREES or "barre" in classes):
            self.masque = len(self.pile)
            self.pile.append(balise)
            return
        self.pile.append(balise)
        if self.masque is not None:
            return
        if balise == "ul":
            self.listes.append("coordonnees" in classes)
        elif balise in ("strong", "b"):
            self.gras += 1
        elif balise in BALISES_BLOCS:
            self._ouvrir_bloc(balise, classes)

    def handle_endtag(self, balise):
        if balise in BALISES_VIDES or balise not in self.pile:
            return
        # Ferme jusqu'à la balise correspondante (tolère le HTML mal formé).
        while self.pile:
            ouverte = self.pile.pop()
            self._fermer(ouverte, len(self.pile))
            if ouverte == balise:
                break

    def _fermer(self, balise, profondeur):
        if self.masque is not None:
            if profondeur == self.masque:
                self.masque = None
            return
        if balise == "ul":
            self.listes.pop()
        elif balise in ("strong", "b"):
            self.gras -= 1
        elif balise in BALISES_BLOCS:
            self._fermer_bloc()

    # --- Texte -------------------------------------------------------------

    def handle_data(self, data):
        if self.masque is not None:
            return
        texte = re.sub(r"\s+", " ", data)
        if not texte.strip():
            return
        if self.courant is None:
            print(f"avertissement : texte hors bloc ignoré : {texte.strip()!r}",
                  file=sys.stderr)
            return
        runs = self.courant["runs"]
        if runs and runs[-1][0].endswith(" ") and texte.startswith(" "):
            texte = texte[1:]
        gras = self.gras > 0 or self.courant["gras"]
        runs.append([texte, gras])

    # --- Blocs -------------------------------------------------------------

    def _ouvrir_bloc(self, balise, classes):
        if self.courant is not None:
            self._fermer_bloc()
        if balise == "h1":
            genre = "nom"
        elif balise == "h2":
            genre = "titre1"
        elif balise == "h3":
            genre = "titre2"
        elif balise == "li":
            genre = "coord" if self.listes and self.listes[-1] else "puce"
        elif "cv-titre" in classes:
            genre = "sous_titre"
        else:
            genre = "paragraphe"
        gras_par_defaut = genre in ("nom", "titre1", "titre2", "sous_titre")
        self.courant = {"genre": genre, "runs": [], "gras": gras_par_defaut}

    def _fermer_bloc(self):
        bloc, self.courant = self.courant, None
        if bloc is None:
            return
        runs = bloc["runs"]
        if runs:
            runs[0][0] = runs[0][0].lstrip()
            runs[-1][0] = runs[-1][0].rstrip()
        runs = [r for r in runs if r[0]]
        if runs:
            self.blocs.append({"genre": bloc["genre"], "runs": runs})


# --- Construction du document Word -----------------------------------------

def _fixer_police(style, taille=None, gras=None):
    """Force Calibri sur un style, sans héritage des polices de thème."""
    rpr = style.element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    for attribut in ("asciiTheme", "hAnsiTheme", "eastAsiaTheme", "cstheme"):
        rfonts.attrib.pop(qn("w:" + attribut), None)
    for attribut in ("ascii", "hAnsi", "eastAsia", "cs"):
        rfonts.set(qn("w:" + attribut), POLICE)
    if taille is not None:
        style.font.size = taille
    if gras is not None:
        style.font.bold = gras
    style.font.italic = False
    style.font.color.rgb = RGBColor(0, 0, 0)


def _configurer_styles(doc):
    """Règle les styles utilisés, sans bordures ni couleurs de thème."""
    # Langue par défaut du modèle python-docx (en-US) remplacée par le français.
    for lang in doc.styles.element.xpath("./w:docDefaults//w:lang"):
        lang.set(qn("w:val"), "fr-FR")

    normal = doc.styles["Normal"]
    _fixer_police(normal, TAILLE_CORPS, gras=False)
    normal.paragraph_format.space_after = Pt(3)
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.line_spacing = 1.1
    # Langue du texte : français. w:lang doit rester le dernier élément de rPr ici.
    lang = OxmlElement("w:lang")
    lang.set(qn("w:val"), "fr-FR")
    normal.element.get_or_add_rPr().append(lang)

    titre = doc.styles["Title"]
    _fixer_police(titre, TAILLE_NOM, gras=True)
    titre.paragraph_format.space_before = Pt(0)
    titre.paragraph_format.space_after = Pt(2)
    _retirer_bordures(titre)

    for nom, avant in (("Heading 1", 10), ("Heading 2", 6)):
        style = doc.styles[nom]
        _fixer_police(style, TAILLE_CORPS if nom == "Heading 2" else Pt(12), gras=True)
        style.paragraph_format.space_before = Pt(avant)
        style.paragraph_format.space_after = Pt(3 if nom == "Heading 1" else 1)
        style.paragraph_format.keep_with_next = True
        _retirer_bordures(style)

    puce = doc.styles["List Bullet"]
    _fixer_police(puce, TAILLE_CORPS, gras=False)
    puce.paragraph_format.space_after = Pt(2)


def _retirer_bordures(style):
    ppr = style.element.pPr
    if ppr is not None:
        for bordure in ppr.findall(qn("w:pBdr")):
            ppr.remove(bordure)


def construire(page, sortie, titre, auteur):
    doc = Document()

    # Page A4, marges de 1,8 cm, aucun en-tête ni pied de page.
    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.left_margin = section.right_margin = Cm(1.8)
    section.top_margin = section.bottom_margin = Cm(1.8)

    _configurer_styles(doc)

    for bloc in page.blocs:
        genre = bloc["genre"]
        paragraphe = doc.add_paragraph(style=STYLE_PAR_GENRE[genre])
        if genre == "coord":
            paragraphe.paragraph_format.space_after = Pt(0)
        for texte, gras in bloc["runs"]:
            run = paragraphe.add_run(texte)
            if genre == "sous_titre":
                run.font.size = TAILLE_SOUS_TITRE
                run.font.bold = True
            elif gras and genre == "paragraphe":
                run.font.bold = True

    # Propriétés du document : titre, auteur, langue.
    cp = doc.core_properties
    cp.title = titre
    cp.author = auteur
    cp.last_modified_by = auteur
    cp.language = "fr-FR"
    cp.subject = ""
    cp.keywords = ""
    cp.comments = ""
    cp.category = ""
    maintenant = datetime.now().replace(microsecond=0)
    cp.created = maintenant
    cp.modified = maintenant
    cp.revision = 1

    doc.save(sortie)


def main(argv):
    if len(argv) != 5:
        print("usage : build-cv-docx.py <page.html> <sortie.docx> <titre> <auteur>",
              file=sys.stderr)
        return 2
    _, source, sortie, titre, auteur = argv
    with open(source, encoding="utf-8") as fichier:
        contenu = fichier.read()
    page = PageCV()
    page.feed(contenu)
    page.close()
    if not page.blocs:
        print(f"erreur : aucun texte trouvé dans {source}", file=sys.stderr)
        return 1
    construire(page, sortie, titre, auteur)
    print(f"{sortie} : {len(page.blocs)} paragraphes")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

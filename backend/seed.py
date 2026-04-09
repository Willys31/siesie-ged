"""
Script de données de démonstration — SieSie
=============================================
Usage : python seed.py   (depuis le répertoire backend/, venv activé)

Crée :
  - 1 compte admin  : admin@gedpme.com / admin123
  - 1 compte user   : user@gedpme.com  / user123
  - 10 documents fictifs avec tags et fichiers factices
"""

import os
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

# Assure que les imports internes (config, models…) fonctionnent
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config.settings import settings
from config.database import Base
from models.user import User, UserRole
from models.document import Document
from models.tag import Tag
import models  # enregistre TOUS les modèles dans Base.metadata

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Moteur synchrone (psycopg2) ──────────────────────────────────────────────
sync_engine  = create_engine(settings.DATABASE_URL_SYNC, echo=False)
SessionLocal = sessionmaker(bind=sync_engine)

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ── Données utilisateurs ──────────────────────────────────────────────────────
USERS = [
    {
        "email":       "admin@gedpme.com",
        "nom_complet": "Administrateur GED",
        "mot_de_passe": "admin123",
        "role":        UserRole.admin,
    },
    {
        "email":       "user@gedpme.com",
        "nom_complet": "Utilisateur Test",
        "mot_de_passe": "user123",
        "role":        UserRole.utilisateur,
    },
]

# ── Données documents ─────────────────────────────────────────────────────────
DOCS_DATA = [
    {
        "titre":        "Facture_2024_001",
        "type_fichier": "application/pdf",
        "taille":       245_760,
        "description":  "Facture client — Premier trimestre 2024. Montant TTC : 4 500 €",
        "tags":         ["facture", "2024", "comptabilité"],
        "ext":          ".pdf",
        "days_ago":     5,
    },
    {
        "titre":        "Contrat_Client_ABC",
        "type_fichier": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "taille":       189_440,
        "description":  "Contrat de prestation de services pour Client ABC. Durée : 12 mois.",
        "tags":         ["contrat", "client-abc", "juridique"],
        "ext":          ".docx",
        "days_ago":     12,
    },
    {
        "titre":        "Budget_Previsionnel_2025",
        "type_fichier": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "taille":       512_000,
        "description":  "Budget prévisionnel annuel 2025 : charges et produits estimés.",
        "tags":         ["budget", "2025", "finance"],
        "ext":          ".xlsx",
        "days_ago":     3,
    },
    {
        "titre":        "Rapport_Activite_Q3_2024",
        "type_fichier": "application/pdf",
        "taille":       1_048_576,
        "description":  "Rapport d'activité du troisième trimestre 2024. Indicateurs clés et analyse.",
        "tags":         ["rapport", "2024", "direction"],
        "ext":          ".pdf",
        "days_ago":     20,
    },
    {
        "titre":        "Organigramme_Equipe",
        "type_fichier": "image/png",
        "taille":       312_000,
        "description":  "Organigramme officiel de l'équipe mis à jour en octobre 2024.",
        "tags":         ["rh", "organisation"],
        "ext":          ".png",
        "days_ago":     30,
    },
    {
        "titre":        "Politique_Confidentialite_RGPD",
        "type_fichier": "application/pdf",
        "taille":       178_000,
        "description":  "Politique de confidentialité conforme au RGPD. Dernière révision : 2024.",
        "tags":         ["rgpd", "juridique", "conformité"],
        "ext":          ".pdf",
        "days_ago":     45,
    },
    {
        "titre":        "Tableau_Bord_Commercial",
        "type_fichier": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "taille":       389_000,
        "description":  "Tableau de bord commercial — Suivi des ventes par région et par produit.",
        "tags":         ["commercial", "ventes", "tableau-de-bord"],
        "ext":          ".xlsx",
        "days_ago":     7,
    },
    {
        "titre":        "Procedure_Onboarding_RH",
        "type_fichier": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "taille":       156_000,
        "description":  "Procédure d'intégration des nouveaux collaborateurs. Checklist et parcours.",
        "tags":         ["rh", "procédure", "onboarding"],
        "ext":          ".docx",
        "days_ago":     60,
    },
    {
        "titre":        "Charte_Informatique_2024",
        "type_fichier": "application/pdf",
        "taille":       203_000,
        "description":  "Charte d'utilisation des ressources informatiques. Version 2024.",
        "tags":         ["informatique", "sécurité", "charte"],
        "ext":          ".pdf",
        "days_ago":     90,
    },
    {
        "titre":        "Compte_Rendu_CA_Octobre2024",
        "type_fichier": "application/pdf",
        "taille":       98_000,
        "description":  "Compte rendu de la réunion du Conseil d'Administration — Octobre 2024.",
        "tags":         ["ca", "réunion", "direction"],
        "ext":          ".pdf",
        "days_ago":     15,
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_or_create_tag(session, nom: str) -> Tag:
    tag = session.query(Tag).filter_by(nom=nom).first()
    if not tag:
        tag = Tag(nom=nom)
        session.add(tag)
        session.flush()
    return tag


def create_fake_file(ext: str) -> str:
    """Crée un fichier factice dans UPLOAD_DIR et retourne son chemin absolu."""
    filename  = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / filename

    if ext == ".pdf":
        # PDF minimal valide
        content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" \
                  b"2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n" \
                  b"xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n" \
                  b"0000000058 00000 n\ntrailer\n<< /Size 3 /Root 1 0 R >>\n" \
                  b"startxref\n114\n%%EOF\n"
    elif ext in (".docx", ".xlsx"):
        # Magic bytes ZIP (format Office Open XML)
        content = b"PK\x03\x04\x14\x00\x00\x00\x00\x00"
    elif ext in (".png", ".jpg", ".jpeg"):
        # PNG 1×1 transparent minimal
        content = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02,
            0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00,
            0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42,
            0x60, 0x82,
        ])
    else:
        content = b"SieSie - Fichier de demonstration\n"

    file_path.write_bytes(content)
    return str(file_path)


# ── Seed principal ────────────────────────────────────────────────────────────

def seed():
    print("╔══════════════════════════════════════╗")
    print("║       Seed SieSie — Démo            ║")
    print("╚══════════════════════════════════════╝\n")

    # S'assure que les tables existent (crée celles qui manquent)
    Base.metadata.create_all(sync_engine, checkfirst=True)

    session = SessionLocal()
    try:
        created_users: list[User] = []

        # ── Utilisateurs ──────────────────────────────────────────────────────
        print("▶ Utilisateurs")
        for u in USERS:
            existing = session.query(User).filter_by(email=u["email"]).first()
            if existing:
                print(f"  [SKIP] {u['email']} existe déjà")
                created_users.append(existing)
                continue
            user = User(
                email=u["email"],
                nom_complet=u["nom_complet"],
                mot_de_passe_hash=pwd_context.hash(u["mot_de_passe"]),
                role=u["role"],
                est_actif=True,
            )
            session.add(user)
            session.flush()
            created_users.append(user)
            print(f"  [OK]   {u['email']}  ({u['role'].value})")

        # ── Documents ─────────────────────────────────────────────────────────
        print("\n▶ Documents")
        admin_user = created_users[0]

        existing_count = session.query(Document).count()
        if existing_count > 0:
            print(f"  [SKIP] {existing_count} document(s) existent déjà")
        else:
            for i, d in enumerate(DOCS_DATA, 1):
                chemin   = create_fake_file(d["ext"])
                date_up  = datetime.utcnow() - timedelta(days=d["days_ago"])

                doc = Document(
                    titre=d["titre"],
                    description=d["description"],
                    type_fichier=d["type_fichier"],
                    taille_fichier=d["taille"],
                    chemin_stockage=chemin,
                    uploaded_par_id=admin_user.id,
                    date_upload=date_up,
                    date_modification=date_up,
                    est_archive=False,
                )
                session.add(doc)
                session.flush()

                for tag_nom in d["tags"]:
                    tag = get_or_create_tag(session, tag_nom)
                    if tag not in doc.tags:
                        doc.tags.append(tag)

                size_kb = d["taille"] // 1024
                print(f"  [{i:02d}] {d['titre']}{d['ext']}  ({size_kb} Ko)")

        session.commit()

        print("\n╔══════════════════════════════════════════════════════════╗")
        print("║  Seed terminé avec succès !                              ║")
        print("╠══════════════════════════════════════════════════════════╣")
        print("║  Comptes de démonstration :                              ║")
        print("║  admin@gedpme.com  /  admin123   (Administrateur)        ║")
        print("║  user@gedpme.com   /  user123    (Utilisateur)           ║")
        print("╚══════════════════════════════════════════════════════════╝")

    except Exception as exc:
        session.rollback()
        print(f"\n[ERREUR] {exc}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()

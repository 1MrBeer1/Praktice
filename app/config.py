import os

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(ROOT_DIR, "..", "database", "panel.db")

SQLALCHEMY_DATABASE_URI = f"sqlite:///{DB_PATH}"
SQLALCHEMY_TRACK_MODIFICATIONS = False
SECRET_KEY = "supersecretkey"
DEBUG = True

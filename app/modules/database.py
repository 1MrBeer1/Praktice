from app import db

# Пример модели для логов
class ActionLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, default=db.func.now())

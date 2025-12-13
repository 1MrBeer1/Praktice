import os
from flask import jsonify, request, send_file

BASE_DIR = "/home/root/Praktice/app/storage"

def safe(path):
    return os.path.normpath(os.path.join(BASE_DIR, path.lstrip("/")))

def list_files():
    path = request.args.get("path", "/")
    abs_path = safe(path)

    if not os.path.exists(abs_path):
        return jsonify({"error": "Path not found"}), 404

    items = []
    for name in os.listdir(abs_path):
        full = os.path.join(abs_path, name)
        items.append({
            "name": name,
            "path": (path.rstrip("/") + "/" + name).replace("//", "/"),
            "is_dir": os.path.isdir(full),
            "size": os.path.getsize(full) if os.path.isfile(full) else 0
        })

    return jsonify({"path": path, "items": items})


def read_file():
    path = request.args.get("path")
    abs_path = safe(path)

    if not os.path.isfile(abs_path):
        return jsonify({"error": "File not found"}), 404

    return jsonify({
        "content": open(abs_path, "r", encoding="utf-8").read()
    })


def create_file():
    data = request.json
    path = safe(data["path"] + "/" + data["name"])
    open(path, "w", encoding="utf-8").write(data.get("content", ""))
    return jsonify({"status": "ok"})


def update_file():
    data = request.json
    abs_path = safe(data["path"])
    open(abs_path, "w", encoding="utf-8").write(data["content"])
    return jsonify({"status": "ok"})


def delete_file():
    data = request.json
    abs_path = safe(data["path"])

    if os.path.isdir(abs_path):
        os.rmdir(abs_path)
    else:
        os.remove(abs_path)

    return jsonify({"status": "ok"})


def create_folder():
    data = request.json
    abs_path = safe(data["path"] + "/" + data["name"])
    os.makedirs(abs_path, exist_ok=True)
    return jsonify({"status": "ok"})


def upload_file():
    file = request.files["file"]
    path = safe(request.form["path"] + "/" + file.filename)
    file.save(path)
    return jsonify({"status": "ok"})


def download_file():
    path = request.args.get("path")
    abs_path = safe(path)
    return send_file(abs_path, as_attachment=True)

from flask import Flask, jsonify, render_template, request, send_file
from flask_sqlalchemy import SQLAlchemy
from config import SQLALCHEMY_DATABASE_URI, SECRET_KEY, DEBUG

import os
import platform
import time
import signal
import psutil

db = SQLAlchemy()

# -----------------------------
# FILESYSTEM CONFIG
# -----------------------------
BASE_DIR = "/home/root"


# -----------------------------
# PATH HELPERS
# -----------------------------
def norm_front(path):
    if not path or path == "":
        return "/"
    path = str(path).strip()
    return path if path.startswith("/") else "/" + path


def norm_internal(path):
    if not path or path == "/":
        return ""
    return path.strip("/")


def safe_join(base, path):
    internal = norm_internal(path)
    final = os.path.abspath(os.path.join(base, internal))
    if not final.startswith(base):
        raise ValueError("Forbidden path")
    return final


# -----------------------------
# FILESYSTEM CORE
# -----------------------------
def fs_list(path):
    path = norm_front(path)
    abs_path = safe_join(BASE_DIR, path)

    items = []
    for name in os.listdir(abs_path):
        full = os.path.join(abs_path, name)
        items.append({
            "name": name,
            "path": (path.rstrip("/") + "/" + name).replace("//", "/"),
            "is_dir": os.path.isdir(full),
            "size": os.path.getsize(full) if os.path.isfile(full) else None
        })

    return {"path": path, "items": items}


def fs_read(path):
    with open(safe_join(BASE_DIR, path), "r", encoding="utf-8") as f:
        return f.read()


def fs_write(path, content):
    with open(safe_join(BASE_DIR, path), "w", encoding="utf-8") as f:
        f.write(content)


def fs_delete(path):
    abs_path = safe_join(BASE_DIR, path)
    if os.path.isdir(abs_path):
        os.rmdir(abs_path)
    else:
        os.remove(abs_path)


def fs_create_folder(path, name):
    p = (path.rstrip("/") + "/" + name).replace("//", "/")
    os.makedirs(safe_join(BASE_DIR, p), exist_ok=True)


def fs_upload(path, file):
    p = (path.rstrip("/") + "/" + file.filename).replace("//", "/")
    file.save(safe_join(BASE_DIR, p))


# -----------------------------
# FLASK APP
# -----------------------------
def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = SECRET_KEY
    app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.debug = DEBUG

    db.init_app(app)

    with app.app_context():
        db.create_all()

    # -----------------------------
    # FRONTEND
    # -----------------------------
    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/files")
    def files_page():
        return render_template("files.html")

    @app.route("/hardware")
    def hardware_page():
        return render_template("Hardware.html")

    @app.route("/processes")
    def processes_page():
        return render_template("processes.html")

    # -----------------------------
    # FILE API
    # -----------------------------
    @app.route("/api/files", methods=["GET"])
    def api_files_list():
        return jsonify(fs_list(request.args.get("path", "/")))

    @app.route("/api/files/read")
    def api_files_read():
        return jsonify({"content": fs_read(request.args["path"])})

    @app.route("/api/files", methods=["POST"])
    def api_files_create():
        d = request.json
        fs_write(f"{d['path'].rstrip('/')}/{d['name']}", d.get("content", ""))
        return jsonify(True)

    @app.route("/api/files/update", methods=["POST"])
    def api_files_update():
        d = request.json
        fs_write(d["path"], d["content"])
        return jsonify(True)

    @app.route("/api/files/delete", methods=["POST"])
    def api_files_delete():
        fs_delete(request.json["path"])
        return jsonify(True)

    @app.route("/api/files/folder", methods=["POST"])
    def api_files_folder():
        d = request.json
        fs_create_folder(d["path"], d["name"])
        return jsonify(True)

    @app.route("/api/files/upload", methods=["POST"])
    def api_files_upload():
        fs_upload(request.form.get("path", "/"), request.files["file"])
        return jsonify(True)

    @app.route("/api/files/download")
    def api_files_download():
        return send_file(safe_join(BASE_DIR, request.args["path"]), as_attachment=True)

    # -----------------------------
    # HARDWARE API
    # -----------------------------
    @app.route("/api/hardware")
    def api_hardware():
        try:
            temps = psutil.sensors_temperatures()
            cpu_temp = temps.get("cpu_thermal", [None])[0]
            cpu_temp = cpu_temp.current if cpu_temp else None
        except:
            cpu_temp = None

        return jsonify({
            "basic": {
                "platform": platform.system(),
                "release": platform.release(),
                "processor": platform.processor(),
                "python_version": platform.python_version()
            },
            "metrics": {
                "cpu_percent": psutil.cpu_percent(),
                "ram_percent": psutil.virtual_memory().percent
            },
            "temps": {
                "cpu": cpu_temp,
                "error": cpu_temp is None
            },
            "is_admin": os.geteuid() == 0,
            "timestamp": time.time()
        })

    # -----------------------------
    # PROCESSES API (ЕДИНСТВЕННЫЙ!)
    # -----------------------------
    @app.route("/api/processes")
    def api_processes():
        q = request.args.get("search", "").lower()
        items = []

        for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                if q and q not in (p.info["name"] or "").lower():
                    continue
                items.append({
                    "pid": p.info["pid"],
                    "name": p.info["name"],
                    "cpu": p.info["cpu_percent"],
                    "ram": round(p.info["memory_percent"], 2)
                })
            except:
                pass

        items.sort(key=lambda x: x["cpu"], reverse=True)
        return jsonify({"items": items})

    @app.route("/api/processes/kill", methods=["POST"])
    def api_kill_process():
        os.kill(int(request.json["pid"]), signal.SIGTERM)
        return jsonify({"status": "terminated"})

    @app.route("/api/processes/kill_force", methods=["POST"])
    def api_kill_force():
        os.kill(int(request.json["pid"]), signal.SIGKILL)
        return jsonify({"status": "killed"})

    # -----------------------------
    # LOGS API (journalctl)
    # -----------------------------
    import subprocess

    @app.route("/logs")
    def logs_page():
        return render_template("logs.html")


    @app.route("/api/logs", methods=["GET"])
    def api_logs():
        """
        params:
        lines=200
        unit=ssh.service (optional)
        """
        lines = request.args.get("lines", 200)
        unit = request.args.get("unit")

        cmd = ["journalctl", "-n", str(lines), "--no-pager"]

        if unit:
            cmd.extend(["-u", unit])

        try:
            result = subprocess.check_output(
                cmd,
                stderr=subprocess.STDOUT,
                text=True
            )
            return jsonify({
                "ok": True,
                "logs": result
            })
        except subprocess.CalledProcessError as e:
            return jsonify({
                "ok": False,
                "error": e.output
            }), 500


    return app


# -----------------------------
# START
# -----------------------------
if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000)

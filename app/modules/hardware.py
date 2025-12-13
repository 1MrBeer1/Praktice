import psutil
import platform
import os

def get_basic_info():
    return {
        "platform": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "python_version": platform.python_version(),
    }

def get_system_metrics():
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    return {
        "cpu_percent": cpu,
        "ram_total": round(mem.total / (1024**3), 2),
        "ram_used": round(mem.used / (1024**3), 2),
        "ram_percent": mem.percent,
        "disk_total": round(disk.total / (1024**3), 2),
        "disk_used": round(disk.used / (1024**3), 2),
        "disk_percent": disk.percent,
    }

def get_temperatures():
    try:
        st = psutil.sensors_temperatures()
        temps = {k: [{"label": s.label, "current": s.current} for s in v] for k, v in st.items()}
        return temps
    except Exception:
        return {"error": "temperatures not available"}

def is_root():
    try:
        return os.geteuid() == 0
    except AttributeError:
        return False

import psutil
import subprocess

def list_processes():
    procs = []
    for p in psutil.process_iter(['pid', 'name', 'username']):
        procs.append(p.info)
    return procs

def run_process(command):
    try:
        p = subprocess.Popen(command, shell=True)
        return {"success": True, "pid": p.pid}
    except Exception as e:
        return {"error": str(e)}

def kill_process(pid):
    try:
        p = psutil.Process(pid)
        p.terminate()
        p.wait(timeout=3)
        return {"success": True, "pid": pid}
    except Exception as e:
        return {"error": str(e)}

async function loadLogs() {
    const unit = document.getElementById("unit").value;
    const lines = document.getElementById("lines").value;

    const params = new URLSearchParams();
    params.append("lines", lines);
    if (unit) params.append("unit", unit);

    const res = await fetch("/api/logs?" + params.toString());
    const data = await res.json();

    const el = document.getElementById("logs");

    if (!data.ok) {
        el.textContent = "ERROR:\n" + data.error;
        return;
    }

    el.textContent = data.logs;
    el.scrollTop = el.scrollHeight;
}

// автообновление
setInterval(loadLogs, 3000);
loadLogs();

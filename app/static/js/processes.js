let cpuChart = null;
let cpuHistory = [];

function showAlert(msg) {
    const a = document.getElementById("alert");
    if (!msg) { a.classList.add("d-none"); return; }
    a.innerText = msg;
    a.classList.remove("d-none");
    setTimeout(()=>a.classList.add("d-none"), 3000);
}

async function killProc(pid) {
    if (!confirm(`Terminate PID ${pid}?`)) return;

    const res = await fetch("/api/processes/kill", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({pid})
    });

    loadProcesses();
}

async function killForce(pid) {
    if (!confirm(`KILL (SIGKILL) PID ${pid}?`)) return;

    const res = await fetch("/api/processes/kill_force", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({pid})
    });

    loadProcesses();
}

async function loadProcesses() {
    const query = document.getElementById("searchInput").value;

    const res = await fetch(`/api/processes?search=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.error) return showAlert(data.error);

    const tbody = document.getElementById("proc-body");
    tbody.innerHTML = "";

    let cpuSum = 0;

    for (const p of data.items) {
        cpuSum += p.cpu;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.pid}</td>
            <td>${p.name}</td>
            <td>${p.cpu.toFixed(1)}%</td>
            <td>${p.ram.toFixed(2)}%</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="killProc(${p.pid})">SIGTERM</button>
                <button class="btn btn-sm btn-danger ms-1" onclick="killForce(${p.pid})">SIGKILL</button>
            </td>
        `;
        tbody.appendChild(tr);
    }

    updateCpuGraph(cpuSum);
}

function updateCpuGraph(cpuLoad) {
    cpuHistory.push(cpuLoad);
    if (cpuHistory.length > 30) cpuHistory.shift();

    if (!cpuChart) {
        cpuChart = new Chart(document.getElementById("cpuchart"), {
            type: "line",
            data: {
                labels: Array(cpuHistory.length).fill(""),
                datasets: [{
                    label: "CPU Load %",
                    data: cpuHistory,
                }]
            },
        });
    } else {
        cpuChart.data.labels = Array(cpuHistory.length).fill("");
        cpuChart.data.datasets[0].data = cpuHistory;
        cpuChart.update();
    }
}

window.addEventListener("DOMContentLoaded", () => {
    loadProcesses();
    setInterval(loadProcesses, 2000);
});

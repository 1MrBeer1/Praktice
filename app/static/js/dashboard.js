async function loadData() {
    const r = await fetch("/api/hardware");
    const data = await r.json();

    document.getElementById("cpu_bar").style.width = data.metrics.cpu_percent + "%";

    let ram_p = data.metrics.ram_percent;
    document.getElementById("ram_bar").style.width = ram_p + "%";

    let temp = data.temps.error ? 0 : data.temps.cpu;
    document.getElementById("temp_bar").style.width = temp + "%";

    document.getElementById("system_info").innerHTML = `
        <b>Платформа:</b> ${data.basic.platform}<br>
        <b>Процессор:</b> ${data.basic.processor}<br>
        <b>Python:</b> ${data.basic.python_version}<br>
        <b>Release:</b> ${data.basic.release}<br>
    `;

    document.getElementById("health_status").innerHTML = `
        Использование CPU: ${data.metrics.cpu_percent}%<br>
        Использование RAM: ${data.metrics.ram_percent}%<br>
    `;

    document.getElementById("admin_info").innerHTML = data.is_admin
        ? "<b style='color:green'>Admin: доступ есть</b>"
        : "<b style='color:red'>Admin: нет доступа</b>";
}

loadData();
setInterval(loadData, 500);

// static/js/hardware.js
let cpuChartCtx = null;
let ramChartCtx = null;
let cpuChart = null;
let ramChart = null;
let history = { cpu: [], ram: [], labels: [] };

function fetchHardware() {
  fetch('/api/hardware')
    .then(r => r.json())
    .then(data => {
      // Базовая информация
      const basic = data.basic;
      const basicText = 
        `Platform: ${basic.platform} ${basic.release} ${basic.version}\n` +
        `Architecture: ${basic.architecture}\n` +
        `Processor: ${basic.processor}\n` +
        `Python: ${basic.python_version}\n` +
        `Is admin: ${data.is_admin}\n`;
      document.getElementById('basicInfo').innerText = basicText;

      // Метрики
      const cpu = data.metrics.cpu_percent || 0;
      const ram = data.metrics.ram_percent || 0;
      const disk = data.metrics.disk_percent || 0;
      document.getElementById('cpuVal').innerText = cpu + '%';
      document.getElementById('ramVal').innerText = ram + '%';
      document.getElementById('diskVal').innerText = disk + '%';

      document.getElementById('cpuBar').style.width = cpu + '%';
      document.getElementById('ramBar').style.width = ram + '%';
      document.getElementById('diskBar').style.width = disk + '%';

      // Temperatures
      const temps = data.temps;
      const tempsEl = document.getElementById('temps');
      if (temps.error) {
        tempsEl.innerText = temps.error;
      } else {
        let out = '';
        for (const sensor in temps) {
          out += sensor + ':\n';
          temps[sensor].forEach(s => {
            out += `  ${s.label || 'core'}: ${s.current}°C\n`;
          });
        }
        tempsEl.innerText = out || 'No temperature data';
      }

      // Добавление в историю для графиков
      const now = new Date().toLocaleTimeString();
      history.labels.push(now);
      history.cpu.push(cpu);
      history.ram.push(ram);
      if (history.labels.length > 20) {
        history.labels.shift(); history.cpu.shift(); history.ram.shift();
      }
      updateCharts();
    })
    .catch(err => {
      console.error('fetchHardware error', err);
    });
}

function initCharts() {
  cpuChartCtx = document.getElementById('cpuChart').getContext('2d');
  ramChartCtx = document.getElementById('ramChart').getContext('2d');

  cpuChart = new Chart(cpuChartCtx, {
    type: 'line',
    data: {
      labels: history.labels,
      datasets: [{ label: 'CPU %', data: history.cpu, borderColor: 'rgba(59,130,246,1)', backgroundColor: 'rgba(59,130,246,0.2)', fill: true }]
    },
    options: { responsive: true, scales: { y: { min: 0, max: 100 } } }
  });

  ramChart = new Chart(ramChartCtx, {
    type: 'line',
    data: {
      labels: history.labels,
      datasets: [{ label: 'RAM %', data: history.ram, borderColor: 'rgba(16,185,129,1)', backgroundColor: 'rgba(16,185,129,0.2)', fill: true }]
    },
    options: { responsive: true, scales: { y: { min: 0, max: 100 } } }
  });
}

function updateCharts() {
  if (!cpuChart || !ramChart) return;
  cpuChart.data.labels = history.labels;
  cpuChart.data.datasets[0].data = history.cpu;
  cpuChart.update();
  ramChart.data.labels = history.labels;
  ramChart.data.datasets[0].data = history.ram;
  ramChart.update();
}

window.addEventListener('DOMContentLoaded', () => {
  initCharts();
  fetchHardware();
  setInterval(fetchHardware, 3000); // обновлять каждые 3 сек
});

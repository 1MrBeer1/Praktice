// static/js/main.js
async function fetchSystem(){
  const res = await fetch('/api/system');
  const data = await res.json();
  document.getElementById('sysinfo').textContent = JSON.stringify(data.info, null, 2);
  return data;
}

let cpuChart = null;
let cpuData = {labels:[], datasets:[{label:'CPU %', data:[], fill:false, borderColor:'rgb(75, 192, 192)'}]};

function createChart(){
  const ctx = document.getElementById('cpuChart').getContext('2d');
  cpuChart = new Chart(ctx, { type:'line', data:cpuData, options:{animation:false, responsive:true, scales:{y:{min:0,max:100}} } });
}

async function refreshMetrics(){
  const data = await fetchSystem();
  const m = data.metrics;
  document.getElementById('cpu').textContent = `CPU: ${m.cpu_percent}%`;
  document.getElementById('ram').textContent = `RAM: ${m.ram_percent}%`;
  document.getElementById('disk').textContent = `DISK: ${m.disk_percent}%`;

  const now = new Date().toLocaleTimeString();
  cpuData.labels.push(now);
  cpuData.datasets[0].data.push(m.cpu_percent);
  if (cpuData.labels.length > 20){
    cpuData.labels.shift();
    cpuData.datasets[0].data.shift();
  }
  cpuChart.update();

  // optional: persist metric to DB
  fetch('/api/metrics/save', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({cpu_percent:m.cpu_percent, ram_percent:m.ram_percent, disk_percent:m.disk_percent})});
}

async function loadProcesses(){
  const res = await fetch('/api/processes');
  const procs = await res.json();
  const tbody = document.querySelector('#procTable tbody');
  tbody.innerHTML = '';
  for (const p of procs){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.pid}</td><td>${p.name}</td><td>${p.cpu_percent || 0}</td><td>${p.memory_percent || 0}</td>
      <td><button data-pid="${p.pid}" class="killbtn">Kill</button></td>`;
    tbody.appendChild(tr);
  }
  document.querySelectorAll('.killbtn').forEach(btn=>{
    btn.onclick = async (e)=>{
      const pid = btn.dataset.pid;
      await fetch(`/api/processes/kill/${pid}`, {method:'POST'});
      loadProcesses();
    };
  });
}

async function loadFiles(){
  const res = await fetch('/api/files/list?path=.');
  const data = await res.json();
  const ul = document.getElementById('filesList');
  ul.innerHTML = '';
  if (data.error){
    ul.innerHTML = `<li style="color:red">${data.error}</li>`;
    return;
  }
  for (const f of data){
    const li = document.createElement('li');
    li.textContent = `${f.name} ${f.is_dir ? '[DIR]' : ''}`;
    ul.appendChild(li);
  }
}

window.addEventListener('DOMContentLoaded', ()=>{
  createChart();
  refreshMetrics();
  loadProcesses();
  loadFiles();
  setInterval(refreshMetrics, 5000);
  document.getElementById('refreshProc').onclick = loadProcesses;
  document.getElementById('refreshFiles').onclick = loadFiles;
});

let secuencias = [];
let actual = 0;

document.addEventListener("DOMContentLoaded", () => {
  fetch("http://localhost:3000/api/secuencias")
    .then(res => res.json())
    .then(data => {
      secuencias = data;
      llenarSelectores(data);
      mostrarEstadisticas([data[actual]]);
    });

  document.getElementById("btnSiguiente")?.addEventListener("click", () => {
    if (actual < secuencias.length - 1) {
      actual++;
      mostrarEstadisticas([secuencias[actual]]);
    }
  });

  document.getElementById("btnAnterior")?.addEventListener("click", () => {
    if (actual > 0) {
      actual--;
      mostrarEstadisticas([secuencias[actual]]);
    }
  });

  document.getElementById("secuencia1").addEventListener("change", compararSeleccionadas);
  document.getElementById("secuencia2").addEventListener("change", compararSeleccionadas);
});

function llenarSelectores(data) {
  const select1 = document.getElementById("secuencia1");
  const select2 = document.getElementById("secuencia2");

  data.forEach(seq => {
    const opt1 = new Option(`ID ${seq.id}`, seq.id);
    const opt2 = new Option(`ID ${seq.id}`, seq.id);
    select1.appendChild(opt1);
    select2.appendChild(opt2);
  });
}

function compararSeleccionadas() {
  const id1 = document.getElementById("secuencia1").value;
  const id2 = document.getElementById("secuencia2").value;

  const seleccionadas = secuencias.filter(s =>
    s.id == id1 || (id2 && s.id == id2)
  );

  if (seleccionadas.length > 0) {
    mostrarEstadisticas(seleccionadas);
  }
}

function mostrarEstadisticas(secs) {
  if (!secs || secs.length === 0) return;

  const combinada = secs.map(s =>
    ((s.secuencia1 || '') + (s.secuencia2 || '')).toUpperCase()
  ).join('');

  const total = combinada.length || 1;

  const g = (combinada.match(/G/g) || []).length;
  const c = (combinada.match(/C/g) || []).length;
  const a = (combinada.match(/A/g) || []).length;
  const t = (combinada.match(/T/g) || []).length;

  const gc = ((g + c) / total * 100).toFixed(1);
  const at = ((a + t) / total * 100).toFixed(1);

  document.getElementById("valorGC").textContent = `${gc}%`;
  document.getElementById("valorAT").textContent = `${at}%`;

  renderizarGraficoBasesBiologicas(secs);
}

function renderizarGraficoBasesBiologicas(secs) {
  const etiquetas = ["A", "T", "C", "G"];
  const colores = ["#48cdd6", "#f2856d", "#84e291", "#b384f2"]; // Por si agregas más

  const datasets = secs.map((s, i) => {
    const nombre = `Secuencia ${s.id}`;
    const cadena = ((s.secuencia1 || '') + (s.secuencia2 || '')).toUpperCase();
    const datos = etiquetas.map(letra =>
      (cadena.match(new RegExp(letra, 'g')) || []).length
    );

    return {
      label: nombre,
      data: datos,
      backgroundColor: colores[i % colores.length]
    };
  });

  const ctx = document.getElementById("graficoAmbiguas").getContext("2d");
  if (window.chartRef) {
    window.chartRef.destroy();
  }

  window.chartRef = new Chart(ctx, {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: datasets
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}


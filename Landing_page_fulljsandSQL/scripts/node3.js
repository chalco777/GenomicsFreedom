document.addEventListener("DOMContentLoaded", () => {
  fetch('http://localhost:3000/api/secuencias')
    .then(response => response.json())
    .then(data => {
      const tbody = document.querySelector('#tabla-secuencias tbody');
      tbody.innerHTML = '';

      data.forEach(secuencia => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
          <td>${secuencia.id}</td>
          <td>${secuencia.secuencia1}</td>
          <td>${secuencia.secuencia2}</td>
          <td>${new Date(secuencia.fecha_registro).toLocaleString()}</td>
        `;
        tbody.appendChild(fila);
      });
    })
    .catch(err => {
      console.error('Error al cargar secuencias:', err);
      alert('No se pudieron cargar las secuencias');
    });
});

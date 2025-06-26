function guardarSecuencias() {
  const secuencia1 = document.getElementById('secuencia1').value;
  const secuencia2 = document.getElementById('secuencia2').value;

  fetch('http://localhost:3000/api/secuencias', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ secuencia1, secuencia2 })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('Secuencias guardadas correctamente ');
      
      document.getElementById('secuencia1').value = '';
      document.getElementById('secuencia2').value = '';
    } else {
      alert('Error al guardar secuencias ');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error al conectar con el backend ');
  });
}

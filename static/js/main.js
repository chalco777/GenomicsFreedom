// Crear fondo interactivo con partículas de ADN
function createInteractiveBackground() {
    const bg = document.getElementById('interactive-bg');
    if (!bg) return;
    
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('dna-particle');
        
        // Tamaño aleatorio
        const size = Math.random() * 20 + 5;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Posición aleatoria
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // Animación
        particle.style.animation = `float ${Math.random() * 10 + 5}s infinite ease-in-out`;
        particle.style.animationDelay = `${Math.random() * 5}s`;
        
        // Color aleatorio (tonos de rojo)
        const opacity = Math.random() * 0.4 + 0.1;
        const redValue = Math.floor(Math.random() * 55 + 200);
        particle.style.backgroundColor = `rgba(${redValue}, 57, 70, ${opacity})`;
        
        bg.appendChild(particle);
    }
}

// Visualizar contenido de archivo FASTA
function setupFilePreview() {
    const fileInput = document.getElementById('fasta-file');
    const fileContent = document.getElementById('file-content');
    
    if (fileInput && fileContent) {
        //cuando el usuario elija algo se activa el evento change
        fileInput.addEventListener('change', function(e) {
            //e es evento, target es el elemento que disparó el evento, files es una lista de archivos seleccionados
            const file = e.target.files[0];
            if (file) {
                //FileReader es una API del navegador para leer archivos locales sin enviarlos al servidor.
                const reader = new FileReader();
                //evento de tipo load de file reader, se activa cuando el archivo ha sido leído completament
                reader.onload = function(e) {
                    fileContent.value = e.target.result;
                };
                //llamo el inicio de la operacion lectura
                reader.readAsText(file);
            }
        });
    }
}

// Añadir nueva entrada de secuencia
function addSequenceEntry() {
    const container = document.getElementById('manual-sequences');
    if (!container) return;
    
    const newEntry = document.createElement('div');
    newEntry.className = 'sequence-entry';
    newEntry.innerHTML = `
        <div class="form-group">
            <label>Título de la Secuencia</label>
            <input type="text" name="manual_titles[]" placeholder="Ej: Gen TP53 humano">
        </div>
        
        <div class="form-group">
            <label>Secuencia Genética (ADN)</label>
            <textarea name="manual_sequences[]" placeholder="Ingresa la secuencia de nucleótidos (A, T, C, G)..."></textarea>
        </div>
    `;
    container.appendChild(newEntry);
}

// Inicializar eventos
document.addEventListener('DOMContentLoaded', function() {
    createInteractiveBackground(); // dibuja las partículas
    setupFilePreview();
    // conecta FileReader
    // Botón para añadir secuencia
    const addSequenceBtn = document.getElementById('add-sequence');
    if (addSequenceBtn) {
        addSequenceBtn.addEventListener('click', addSequenceEntry);
    }
});

// Al final de main.js, resplado extra gg
if (document.getElementById('interactive-bg')) {
    createInteractiveBackground();
}

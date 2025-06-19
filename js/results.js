// Visualizar secuencia de ADN
function visualizeDNA() {
    const dnaContainer = document.getElementById('dna-sequence-display');
    if (!dnaContainer) return;
    
    dnaContainer.innerHTML = '';
    
    // Generar una secuencia de ADN aleatoria para visualización
    const bases = ['A', 'T', 'C', 'G'];
    let dnaSequence = '';
    const sequenceLength = 120;
    
    for (let i = 0; i < sequenceLength; i++) {
        const base = bases[Math.floor(Math.random() * bases.length)];
        dnaSequence += `<span class="dna-base ${base}">${base}</span>`;
    }
    
    dnaContainer.innerHTML = dnaSequence;
}

// Actualizar título de secuencia en resultados
function updateSequenceTitle() {
    const sequenceTitle = localStorage.getItem('sequenceTitle');
    if (sequenceTitle) {
        const outputElement = document.getElementById('full-analysis-output');
        if (outputElement) {
            const content = outputElement.textContent;
            const updatedContent = content.replace(/Sequence: .+/, `Sequence: ${sequenceTitle}`);
            outputElement.textContent = updatedContent;
        }
    }
}

// Inicializar página de resultados
document.addEventListener('DOMContentLoaded', function() {
    // Crear fondo interactivo
    const bg = document.getElementById('interactive-bg');
    if (bg) {
        // Reutilizar la función de fondo de la página principal
        const mainScript = document.createElement('script');
        mainScript.src = 'js/main.js';
        document.head.appendChild(mainScript);
        
        // Esperar a que cargue el script principal
        mainScript.onload = function() {
            if (typeof createInteractiveBackground === 'function') {
                createInteractiveBackground();
            }
        };
    }
    
    // Visualizar secuencia de ADN
    visualizeDNA();
    
    // Actualizar título de secuencia
    updateSequenceTitle();
    
    // Configurar búsqueda de motivos
    const motifInput = document.getElementById('motif-input');
    const searchBtn = document.querySelector('.panel:has(#motif-input) .btn-primary');
    
    if (motifInput && searchBtn) {
        searchBtn.addEventListener('click', function() {
            const motif = motifInput.value.trim().toUpperCase();
            if (motif) {
                // Simular búsqueda
                const resultsList = searchBtn.closest('.panel').querySelector('ul');
                if (resultsList) {
                    resultsList.innerHTML = '';
                    
                    // Generar resultados ficticios
                    const positions = [
                        Math.floor(Math.random() * 1000),
                        Math.floor(Math.random() * 1000),
                        Math.floor(Math.random() * 1000),
                        Math.floor(Math.random() * 1000)
                    ].sort((a, b) => a - b);
                    
                    positions.forEach(pos => {
                        const li = document.createElement('li');
                        li.textContent = `Posición ${pos}-${pos + motif.length}: ${motif}`;
                        resultsList.appendChild(li);
                    });
                }
            }
        });
    }
});
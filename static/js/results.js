// Visualizar secuencia de ADN
function visualizeDNA() {
    const dnaContainer = document.getElementById('dna-sequence-display');
    if (!dnaContainer) return;

    // Obtener datos de secuencias del elemento oculto
    const sequencesDataElement = document.getElementById('sequences-data');
    if (!sequencesDataElement) return;
    
    const sequences = JSON.parse(sequencesDataElement.dataset.sequences);
    const sequenceSelect = document.getElementById('sequence-select');
    if (!sequenceSelect) return;

    const sequenceIndex = parseInt(sequenceSelect.value);
    const sequence = sequences[sequenceIndex].sequence;

    // Generar visualización de ADN
    let dnaSequence = '';
    const displaySequence = sequence.substring(0, 120);

    for (let i = 0; i < displaySequence.length; i++) {
        const base = displaySequence[i].toUpperCase();
        const validBases = ['A', 'T', 'C', 'G'];
        const baseClass = validBases.includes(base) ? base : 'N';
        dnaSequence += `<span class="dna-base ${baseClass}">${base}</span>`;
    }

    if (sequence.length > 120) {
        dnaSequence += `<span style="color: var(--text-gray);">... (${sequence.length - 120} más)</span>`;
    }

    dnaContainer.innerHTML = dnaSequence;
}

// Actualizar visualización al cambiar secuencia
function setupSequenceSelector() {
    const sequenceSelect = document.getElementById('sequence-select');
    if (!sequenceSelect) return;

    sequenceSelect.addEventListener('change', visualizeDNA);
}

// Inicializar página de resultados
document.addEventListener('DOMContentLoaded', function() {
    // Visualizar secuencia de ADN
    visualizeDNA();
    
    // Configurar selector de secuencia
    setupSequenceSelector();
    
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
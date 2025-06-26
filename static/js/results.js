// results.js - Funcionalidades interactivas para la página de resultados

document.addEventListener('DOMContentLoaded', function() {
    // Obtener datos de las secuencias y distancias
    const sequencesDataEl = document.getElementById('sequences-data');
    const distanceDataEl = document.getElementById('distance-data');
    
    let sequences = [];
    let distanceMatrix = {};
    
    if (sequencesDataEl) {
        try {
            sequences = JSON.parse(sequencesDataEl.dataset.sequences);
        } catch (e) {
            console.error('Error parsing sequences data:', e);
        }
    }
    
    if (distanceDataEl) {
        try {
            distanceMatrix = JSON.parse(distanceDataEl.dataset.distances);
        } catch (e) {
            console.error('Error parsing distance data:', e);
        }
    }
    
    // Inicializar funcionalidades
    initSequenceVisualization();
    initDistanceCalculator();
    
    function initSequenceVisualization() {
        const sequenceSelect = document.getElementById('sequence-select');
        const dnaDisplay = document.getElementById('dna-sequence-display');
        
        if (!sequenceSelect || !dnaDisplay || !sequences.length) return;
        
        // Función para actualizar la visualización de la secuencia
        function updateSequenceDisplay() {
            const selectedIndex = parseInt(sequenceSelect.value);
            const selectedSequence = sequences[selectedIndex];
            
            if (!selectedSequence) return;
            
            // Limpiar display anterior
            dnaDisplay.innerHTML = '';
            
            // Mostrar hasta 120 bases
            const sequenceToShow = selectedSequence.sequence.slice(0, 120);
            
            // Crear elementos para cada base
            sequenceToShow.split('').forEach(base => {
                const span = document.createElement('span');
                span.textContent = base;
                span.className = `dna-base ${base.toUpperCase()}`;
                dnaDisplay.appendChild(span);
            });
            
            // Agregar indicador si hay más bases
            if (selectedSequence.sequence.length > 120) {
                const moreIndicator = document.createElement('span');
                moreIndicator.style.color = 'var(--text-gray)';
                moreIndicator.textContent = ` ... (${selectedSequence.sequence.length - 120} más)`;
                dnaDisplay.appendChild(moreIndicator);
            }
        }
        
        // Event listener para cambio de secuencia
        sequenceSelect.addEventListener('change', updateSequenceDisplay);
        
        // Inicializar con la primera secuencia
        updateSequenceDisplay();
    }
    
    function initDistanceCalculator() {
        const seq1Select = document.getElementById('seq-select-1');
        const seq2Select = document.getElementById('seq-select-2');
        const distanceResult = document.getElementById('distance-result');
        
        if (!seq1Select || !seq2Select || !distanceResult) return;
        
        function updateDistance() {
            const seq1 = seq1Select.value;
            const seq2 = seq2Select.value;
            
            // Agregar efecto de carga
            distanceResult.classList.add('loading');
            
            setTimeout(() => {
                if (seq1 === seq2) {
                    // Misma secuencia
                    distanceResult.textContent = '0.0000';
                    distanceResult.style.color = 'var(--accent-green)';
                } else {
                    // Buscar distancia en la matriz
                    const key1 = `${seq1}|${seq2}`;
                    const key2 = `${seq2}|${seq1}`;
                    
                    let distance = distanceMatrix[key1] || distanceMatrix[key2];
                    
                    if (distance !== undefined) {
                        distanceResult.textContent = distance.toFixed(4);
                        
                        // Cambiar color basado en la distancia
                        if (distance < 0.1) {
                            distanceResult.style.color = 'var(--accent-green)'; // Verde para alta similitud
                        } else if (distance < 0.3) {
                            distanceResult.style.color = '#f1c40f'; // Amarillo para similitud media
                        } else {
                            distanceResult.style.color = 'var(--primary-red)'; // Rojo para baja similitud
                        }
                        
                        // Agregar efecto de pulso
                        distanceResult.classList.add('distance-highlight');
                        setTimeout(() => {
                            distanceResult.classList.remove('distance-highlight');
                        }, 1000);
                        
                    } else {
                        distanceResult.textContent = 'N/A';
                        distanceResult.style.color = 'var(--text-gray)';
                    }
                }
                
                // Remover efecto de carga
                distanceResult.classList.remove('loading');
            }, 300); // Simular tiempo de procesamiento
        }
        
        // Event listeners para ambos selectores
        seq1Select.addEventListener('change', updateDistance);
        seq2Select.addEventListener('change', updateDistance);
        
        // Inicializar con los valores por defecto
        updateDistance();
    }
    
    // Funcionalidad adicional: Búsqueda de motivos
    initMotifSearch();
    
    function initMotifSearch() {
        const motifInput = document.getElementById('motif-input');
        const searchButton = document.querySelector('.panel button[style*="width: 100%"]');
        
        if (!motifInput || !searchButton) return;
        
        searchButton.addEventListener('click', function() {
            const motif = motifInput.value.trim().toUpperCase();
            
            if (!motif) {
                alert('Por favor, ingrese un motivo para buscar');
                return;
            }
            
            searchMotifInSequences(motif);
        });
        
        // También buscar al presionar Enter
        motifInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }
    
    function searchMotifInSequences(motif) {
        const results = [];
        
        // Validar motivo
        const validBases = /^[ATCGN]+$/i;
        if (!validBases.test(motif)) {
            showNotification('El motivo debe contener solo bases válidas (A, T, C, G, N)', 'error');
            return;
        }
        
        sequences.forEach((seq, seqIndex) => {
            const sequence = seq.sequence.toUpperCase();
            let position = 0;
            
            while ((position = sequence.indexOf(motif, position)) !== -1) {
                results.push({
                    sequenceTitle: seq.title,
                    position: position + 1, // 1-indexed
                    endPosition: position + motif.length,
                    context: getSequenceContext(sequence, position, motif.length)
                });
                position++;
            }
        });
        
        // Mostrar resultados
        displayMotifResults(motif, results);
        
        // Mostrar notificación de éxito
        if (results.length > 0) {
            showNotification(`Se encontraron ${results.length} coincidencias`, 'success');
        } else {
            showNotification('No se encontraron coincidencias', 'warning');
        }
    }
    
    function getSequenceContext(sequence, position, motifLength, contextSize = 10) {
        const start = Math.max(0, position - contextSize);
        const end = Math.min(sequence.length, position + motifLength + contextSize);
        const before = sequence.slice(start, position);
        const motif = sequence.slice(position, position + motifLength);
        const after = sequence.slice(position + motifLength, end);
        
        return { before, motif, after };
    }
    
    function displayMotifResults(motif, results) {
        // Buscar el contenedor de resultados existente o crearlo
        let resultsContainer = document.querySelector('.motif-results');
        
        if (!resultsContainer) {
            // Buscar el panel de motivos
            const motifPanels = Array.from(document.querySelectorAll('.panel h3')).filter(h3 => 
                h3.textContent.toLowerCase().includes('motivo')
            );
            
            if (motifPanels.length > 0) {
                const panel = motifPanels[0].closest('.panel');
                resultsContainer = document.createElement('div');
                resultsContainer.className = 'motif-results';
                resultsContainer.style.marginTop = '1.5rem';
                
                // Insertar después del botón de búsqueda
                const button = panel.querySelector('button');
                if (button && button.parentNode) {
                    button.parentNode.insertBefore(resultsContainer, button.nextSibling);
                }
            }
        }
        
        if (!resultsContainer) return;
        
        // Limpiar resultados anteriores
        resultsContainer.innerHTML = '';
        
        // Crear contenido de resultados
        const resultsTitle = document.createElement('h4');
        resultsTitle.textContent = `Resultados para "${motif}":`;
        resultsTitle.style.color = 'var(--accent-green)';
        resultsContainer.appendChild(resultsTitle);
        
        if (results.length === 0) {
            const noResults = document.createElement('p');
            noResults.textContent = 'No se encontraron coincidencias.';
            noResults.style.color = 'var(--text-gray)';
            resultsContainer.appendChild(noResults);
            return;
        }
        
        const resultsList = document.createElement('div');
        resultsList.style.marginTop = '1rem';
        
        results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'motif-result-item';
            resultItem.style.cssText = `
                background-color: rgba(42, 157, 143, 0.1);
                margin: 0.5rem 0;
                padding: 1rem;
                border-radius: 5px;
                border-left: 3px solid var(--accent-green);
                transition: all 0.3s ease;
            `;
            
            resultItem.innerHTML = `
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
                    <strong style="color: var(--accent-green);">${result.sequenceTitle}</strong>
                    <span style="color: var(--text-gray); font-size: 0.9rem;">
                        Posición ${result.position}-${result.endPosition}
                    </span>
                </div>
                ${result.context ? `
                    <div style="font-family: 'Courier New', monospace; font-size: 0.9rem; background-color: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 3px; overflow-x: auto;">
                        <span style="color: #95a5a6;">${result.context.before}</span><span style="color: var(--accent-green); font-weight: bold; background-color: rgba(42, 157, 143, 0.3);">${result.context.motif}</span><span style="color: #95a5a6;">${result.context.after}</span>
                    </div>
                ` : ''}
            `;
            
            // Agregar hover effect
            resultItem.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'rgba(42, 157, 143, 0.2)';
                this.style.transform = 'translateX(5px)';
            });
            
            resultItem.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'rgba(42, 157, 143, 0.1)';
                this.style.transform = 'translateX(0)';
            });
            
            resultsList.appendChild(resultItem);
        });
        
        resultsContainer.appendChild(resultsList);
        
        // Agregar estadísticas
        const stats = document.createElement('div');
        stats.style.cssText = `
            margin-top: 1rem;
            padding: 15px;
            background-color: rgba(42, 157, 143, 0.1);
            border-radius: 5px;
            border: 1px solid rgba(42, 157, 143, 0.3);
        `;
        
        const uniqueSequences = new Set(results.map(r => r.sequenceTitle)).size;
        const avgPositions = results.length > 0 ? (results.reduce((sum, r) => sum + r.position, 0) / results.length).toFixed(1) : 0;
        
        stats.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; text-align: center;">
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-green);">${results.length}</div>
                    <div style="color: var(--text-gray); font-size: 0.9rem;">Total coincidencias</div>
                </div>
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-green);">${uniqueSequences}</div>
                    <div style="color: var(--text-gray); font-size: 0.9rem;">Secuencias afectadas</div>
                </div>
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-green);">${avgPositions}</div>
                    <div style="color: var(--text-gray); font-size: 0.9rem;">Posición promedio</div>
                </div>
            </div>
        `;
        
        resultsContainer.appendChild(stats);
    }
    
    // Funcionalidad de exportación
    initExportFunctions();
    
    function initExportFunctions() {
        const exportButton = document.querySelector('button:contains("Exportar FASTA")');
        
        if (exportButton) {
            exportButton.addEventListener('click', function() {
                exportToFASTA();
            });
        }
    }
    
    function exportToFASTA() {
        if (!sequences.length) {
            alert('No hay secuencias para exportar');
            return;
        }
        
        let fastaContent = '';
        sequences.forEach(seq => {
            fastaContent += `>${seq.title}\n${seq.sequence}\n`;
        });
        
        // Crear y descargar archivo
        const blob = new Blob([fastaContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sequences_export.fasta';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
});

// Funciones de utilidad

function showNotification(message, type = 'success') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 10px; cursor: pointer; font-weight: bold;">&times;</button>
    `;
    
    // Agregar al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

function addTooltip(element, text) {
    element.classList.add('tooltip');
    const tooltipText = document.createElement('span');
    tooltipText.className = 'tooltiptext';
    tooltipText.textContent = text;
    element.appendChild(tooltipText);
}

// Agregar tooltips a elementos relevantes cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Agregar tooltips a bases de ADN
    setTimeout(() => {
        const dnaBases = document.querySelectorAll('.dna-base');
        dnaBases.forEach((base, index) => {
            addTooltip(base, `Posición ${index + 1}: ${base.textContent}`);
        });
    }, 1000);
    
    // Agregar tooltip al resultado de distancia
    const distanceResult = document.getElementById('distance-result');
    if (distanceResult) {
        addTooltip(distanceResult, 'Distancia genética calculada mediante alineamiento múltiple');
    }
});

// Función auxiliar para seleccionar elementos que contienen texto específico
function querySelector(selector) {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements);
}
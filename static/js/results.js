document.addEventListener('DOMContentLoaded', function() {
    // Obtener datos de las secuencias y distancias
    const sequencesDataEl = document.getElementById('sequences-data');
    const distanceDataEl = document.getElementById('distance-data');
    
    const sequences = JSON.parse(sequencesDataEl.dataset.sequences);
    const distanceMatrix = JSON.parse(distanceDataEl.dataset.distances);
    
    // Inicializar funcionalidades
    initSequenceVisualization();
    initDistanceCalculator();
    initExportFunctions();
    
    function getBaseColor(base) {
        const colors = {
            'A': '#e74c3c',
            'T': '#3498db',
            'C': '#f39c12',
            'G': '#27ae60',
            'N': '#95a5a6'
        };
        return colors[base.toUpperCase()] || '#ffffff';
    }
    
    function initSequenceVisualization() {
        const sequenceSelect = document.getElementById('sequence-select');
        const dnaDisplay = document.getElementById('dna-sequence-display');
        
        function updateSequenceDisplay() {
            const selectedIndex = parseInt(sequenceSelect.value);
            const selectedSequence = sequences[selectedIndex];
            
            dnaDisplay.innerHTML = '';
            
            const sequenceToShow = selectedSequence.sequence.slice(0, 120);
            
            sequenceToShow.split('').forEach(base => {
                const span = document.createElement('span');
                span.textContent = base;
                span.className = `dna-base ${base.toUpperCase()}`;
                dnaDisplay.appendChild(span);
            });
            
            if (selectedSequence.sequence.length > 120) {
                const moreIndicator = document.createElement('span');
                moreIndicator.style.color = 'var(--text-gray)';
                moreIndicator.textContent = ` ... (${selectedSequence.sequence.length - 120} más)`;
                dnaDisplay.appendChild(moreIndicator);
            }
        }
        
        sequenceSelect.addEventListener('change', updateSequenceDisplay);
        updateSequenceDisplay();
    }
    
    function initDistanceCalculator() {
        const seq1Select = document.getElementById('seq-select-1');
        const seq2Select = document.getElementById('seq-select-2');
        const methodSelect = document.getElementById('distance-method');
        const distanceResult = document.getElementById('distance-result');
        const methodText = document.getElementById('method-text');
        const comparisonPanel = document.getElementById('comparison-panel');
        const comparisonResults = document.getElementById('comparison-results');
        
        // Descripciones de métodos
        const methodDescriptions = {
            'precalculated': 'Calculado con BioPython usando alineamiento múltiple y corrección evolutiva',
            'hamming': 'Distancia simple: proporción de posiciones diferentes entre secuencias',
            'identity': 'Similitud: proporción de posiciones idénticas (inverso de Hamming)'
        };
        
        function updateDistance() {
            const seq1Index = parseInt(seq1Select.value);
            const seq2Index = parseInt(seq2Select.value);
            const method = methodSelect.value;
            
            // Actualizar descripción del método
            methodText.textContent = methodDescriptions[method];
            
            distanceResult.classList.add('loading');
            
            setTimeout(() => {
                let distance = 0;
                let displayValue = '';
                
                if (seq1Index === seq2Index) {
                    // Misma secuencia
                    distance = method === 'identity' ? 1.0 : 0.0;
                    displayValue = method === 'identity' ? '1.0000 (100%)' : '0.0000';
                } else {
                    const seq1 = sequences[seq1Index];
                    const seq2 = sequences[seq2Index];
                    
                    switch(method) {
                        case 'precalculated':
                            distance = getPrecalculatedDistance(seq1.title, seq2.title);
                            displayValue = distance !== null ? distance.toFixed(4) : 'N/A';
                            break;
                        case 'hamming':
                            distance = calculateHammingDistance(seq1.sequence, seq2.sequence);
                            displayValue = distance.toFixed(4);
                            break;
                        case 'identity':
                            distance = calculateIdentityScore(seq1.sequence, seq2.sequence);
                            displayValue = `${distance.toFixed(4)} (${(distance * 100).toFixed(1)}%)`;
                            break;
                    }
                }
                
                // Mostrar resultado
                distanceResult.textContent = displayValue;
                updateDistanceColor(distance, method);
                
                // Mostrar comparación si no es el mismo par de secuencias
                if (seq1Index !== seq2Index) {
                    showComparison(seq1Index, seq2Index);
                } else {
                    comparisonPanel.style.display = 'none';
                }
                
                distanceResult.classList.remove('loading');
                
                // Efecto de highlight
                distanceResult.classList.add('distance-highlight');
                setTimeout(() => {
                    distanceResult.classList.remove('distance-highlight');
                }, 1000);
                
            }, 300);
        }
        
        function getPrecalculatedDistance(title1, title2) {
            const key1 = `${title1}|${title2}`;
            const key2 = `${title2}|${title1}`;
            return distanceMatrix[key1] || distanceMatrix[key2] || null;
        }
        
        function calculateHammingDistance(seq1, seq2) {
            const minLength = Math.min(seq1.length, seq2.length);
            let differences = 0;
            
            for (let i = 0; i < minLength; i++) {
                if (seq1[i].toUpperCase() !== seq2[i].toUpperCase()) {
                    differences++;
                }
            }
            
            // Incluir diferencia de longitud
            const lengthDiff = Math.abs(seq1.length - seq2.length);
            differences += lengthDiff;
            
            const maxLength = Math.max(seq1.length, seq2.length);
            return differences / maxLength;
        }
        
        function calculateIdentityScore(seq1, seq2) {
            return 1 - calculateHammingDistance(seq1, seq2);
        }
        
        function updateDistanceColor(distance, method) {
            let color;
            
            if (method === 'identity') {
                // Para similitud: más alto = más verde
                if (distance > 0.9) {
                    color = 'var(--accent-green)';
                } else if (distance > 0.7) {
                    color = '#f1c40f';
                } else {
                    color = 'var(--primary-red)';
                }
            } else {
                // Para distancia: más bajo = más verde
                if (distance < 0.1) {
                    color = 'var(--accent-green)';
                } else if (distance < 0.3) {
                    color = '#f1c40f';
                } else {
                    color = 'var(--primary-red)';
                }
            }
            
            distanceResult.style.color = color;
        }
        
        function showComparison(seq1Index, seq2Index) {
            const seq1 = sequences[seq1Index];
            const seq2 = sequences[seq2Index];
            
            // Calcular todos los métodos
            const precalculated = getPrecalculatedDistance(seq1.title, seq2.title);
            const hamming = calculateHammingDistance(seq1.sequence, seq2.sequence);
            const identity = calculateIdentityScore(seq1.sequence, seq2.sequence);
            
            // Crear HTML de comparación
            let html = '';
            
            const methods = [
                {
                    name: 'BioPython',
                    value: precalculated,
                    format: v => v !== null ? v.toFixed(4) : 'N/A',
                    description: 'Alineamiento múltiple'
                },
                {
                    name: 'Hamming',
                    value: hamming,
                    format: v => v.toFixed(4),
                    description: 'Diferencias simples'
                },
                {
                    name: 'Identidad',
                    value: identity,
                    format: v => `${(v * 100).toFixed(1)}%`,
                    description: 'Similitud porcentual'
                }
            ];
            
            methods.forEach(method => {
                html += `
                    <div style="text-align: center; padding: 1rem; background-color: rgba(42, 157, 143, 0.1); border-radius: 5px;">
                        <div style="font-weight: bold; color: var(--accent-green); margin-bottom: 0.5rem;">
                            ${method.name}
                        </div>
                        <div style="font-size: 1.2rem; color: white; margin-bottom: 0.3rem;">
                            ${method.format(method.value)}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-gray);">
                            ${method.description}
                        </div>
                    </div>
                `;
            });
            
            comparisonResults.innerHTML = html;
            comparisonPanel.style.display = 'block';
        }
        
        // Event listeners
        seq1Select.addEventListener('change', updateDistance);
        seq2Select.addEventListener('change', updateDistance);
        methodSelect.addEventListener('change', updateDistance);
        
        // Inicializar
        updateDistance();
    }
    
    function initExportFunctions() {
        const exportButton = document.getElementById('export-fasta-btn');
        const copyButton = document.getElementById('copy-sequences-btn');
        
        if (exportButton) {
            exportButton.addEventListener('click', exportToFASTA);
        }
        
        if (copyButton) {
            copyButton.addEventListener('click', copySequencesToClipboard);
        }
        
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(button => {
            if (button.textContent.includes('Exportar FASTA') && !button.id) {
                button.addEventListener('click', exportToFASTA);
            }
        });
    }
    
    function copySequencesToClipboard() {
        let fastaContent = '';
        sequences.forEach(seq => {
            fastaContent += `>${seq.title}\n${seq.sequence}\n`;
        });
        
        navigator.clipboard.writeText(fastaContent).then(() => {
            showNotification('Secuencias copiadas al portapapeles', 'success');
        }).catch(err => {
            const textArea = document.createElement('textarea');
            textArea.value = fastaContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Secuencias copiadas al portapapeles', 'success');
        });
    }
    
    function exportToFASTA() {
        const exportButton = document.getElementById('export-fasta-btn') || 
                           Array.from(document.querySelectorAll('button')).find(btn => 
                               btn.textContent.includes('Exportar FASTA'));
        
        const originalHTML = exportButton.innerHTML;
        exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';
        exportButton.disabled = true;
        
        fetch('/export_fasta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sequences: sequences
            })
        })
        .then(response => {
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            const now = new Date();
            const timestamp = now.toISOString().slice(0,19).replace(/[:-]/g, '').replace('T', '_');
            a.download = `genomics_freedom_export_${timestamp}.fasta`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            window.URL.revokeObjectURL(url);
            
            showNotification(`Archivo FASTA exportado: ${a.download}`, 'success');
        })
        .catch(error => {
            showNotification('Error al exportar archivo FASTA: ' + error.message, 'error');
        })
        .finally(() => {
            exportButton.innerHTML = originalHTML;
            exportButton.disabled = false;
        });
    }
});

// Funciones de utilidad

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 10px; cursor: pointer; font-weight: bold;">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
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

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const dnaBases = document.querySelectorAll('.dna-base');
        dnaBases.forEach((base, index) => {
            addTooltip(base, `Posición ${index + 1}: ${base.textContent}`);
        });
    }, 1000);
    
    const distanceResult = document.getElementById('distance-result');
    if (distanceResult) {
        addTooltip(distanceResult, 'Distancia genética calculada mediante alineamiento múltiple');
    }
});
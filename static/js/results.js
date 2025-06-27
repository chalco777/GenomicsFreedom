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
        const distanceResult = document.getElementById('distance-result');
        
        function updateDistance() {
            const seq1 = seq1Select.value;
            const seq2 = seq2Select.value;
            
            distanceResult.classList.add('loading');
            
            setTimeout(() => {
                if (seq1 === seq2) {
                    distanceResult.textContent = '0.0000';
                    distanceResult.style.color = 'var(--accent-green)';
                } else {
                    const key1 = `${seq1}|${seq2}`;
                    const key2 = `${seq2}|${seq1}`;
                    
                    let distance = distanceMatrix[key1] || distanceMatrix[key2];
                    
                    if (distance !== undefined) {
                        distanceResult.textContent = distance.toFixed(4);
                        
                        if (distance < 0.1) {
                            distanceResult.style.color = 'var(--accent-green)';
                        } else if (distance < 0.3) {
                            distanceResult.style.color = '#f1c40f';
                        } else {
                            distanceResult.style.color = 'var(--primary-red)';
                        }
                        
                        distanceResult.classList.add('distance-highlight');
                        setTimeout(() => {
                            distanceResult.classList.remove('distance-highlight');
                        }, 1000);
                        
                    } else {
                        distanceResult.textContent = 'N/A';
                        distanceResult.style.color = 'var(--text-gray)';
                    }
                }
                
                distanceResult.classList.remove('loading');
            }, 300);
        }
        
        seq1Select.addEventListener('change', updateDistance);
        seq2Select.addEventListener('change', updateDistance);
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
document.addEventListener('DOMContentLoaded', function() {
    // Obtener datos de las secuencias y distancias obtenidos desde el flask
    const sequencesDataEl = document.getElementById('sequences-data');
    const distanceDataEl = document.getElementById('distance-data');
    
    const sequences = JSON.parse(sequencesDataEl.dataset.sequences);
    const distanceMatrix = JSON.parse(distanceDataEl.dataset.distances);
    
    // Inicializar funcionalidades
    initSequenceVisualization();
    initSequenceStatsSelector();
    initDistanceCalculator();
    initMultipleAlignment();
    initExportFunctions();
    initMotifSearch();
    
    function initMultipleAlignment() {
        const generateBtn = document.getElementById('generate-alignment-btn');
        const viewSelect = document.getElementById('alignment-view-select');
        const thresholdSlider = document.getElementById('similarity-threshold');
        const thresholdValue = document.getElementById('threshold-value');
        
        // Actualizar valor del threshold
        thresholdSlider.addEventListener('input', function() {
            thresholdValue.textContent = this.value + '%';
        });
        
        // Generar alineamiento al hacer clic
        generateBtn.addEventListener('click', generateMultipleAlignment);
        
        // Cambiar vista del alineamiento
        viewSelect.addEventListener('change', updateAlignmentView);
        
        // Generar matriz de similitud inicial
        generateSimilarityMatrix();
    }
    
    function generateMultipleAlignment() {
        const generateBtn = document.getElementById('generate-alignment-btn');
        const alignmentStats = document.getElementById('alignment-stats');
        
        // Mostrar estado de carga
        const originalHTML = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;
        
        // Simular procesamiento
        setTimeout(() => {
            const alignment = performSimpleAlignment();
            displayAlignment(alignment);
            updateAlignmentStats(alignment);
            
            alignmentStats.style.display = 'block';
            showNotification('Multiple alignment generated successfully', 'success');
            
            generateBtn.innerHTML = originalHTML;
            generateBtn.disabled = false;
        }, 1500);
    }
    
    function performSimpleAlignment() {
        //crea un array con longitudes de secuencias y escoge la de mayor tamaño
        const maxLength = Math.max(...sequences.map(s => s.sequence.length)); 
        const alignedSequences = []; //aligned sequecnes contendra objeto y cada objeto tiene tres propiedades definidas por llaves

        sequences.forEach(seq => {
            //rellena con guiones - al final de la secuencia si es más corta que maxLength
            const paddedSeq = seq.sequence.padEnd(maxLength, '-');
            //guarda el objeto con su titul, la nueva sec, y su longitud original
            alignedSequences.push({
                title: seq.title,
                sequence: paddedSeq,
                originalLength: seq.sequence.length
            });
        });
        
        return {
            sequences: alignedSequences,
            length: maxLength,
            conservedPositions: calculateConservedPositions(alignedSequences),
            similarity: calculateAverageSimilarity(alignedSequences),
            gapsCount: calculateTotalGaps(alignedSequences)
        };
    }
    
    function calculateConservedPositions(alignedSeqs) {
        const length = alignedSeqs[0].sequence.length; 
        //toma longitud de primera seq como referencia
        let conserved = 0;
        //FULL PROGRAMACIÓN FUNCIONAL!!!    
        for (let i = 0; i < length; i++) {
            //para todas las secuencias, me da un array con sus valores en la posición i
            const bases = alignedSeqs.map(seq => seq.sequence[i]);
            //PARA todas las bases , se queda solo con las diferentes de guion y las hace unicas, (maximo puede tener 4 valores)
            const uniqueBases = new Set(bases.filter(base => base !== '-'));
            
            if (uniqueBases.size === 1 && !uniqueBases.has('-')) {
                conserved++; //si hay un solo caracter unico y no es un guion, cuenta como conservado
            }
        }
        
        return conserved; //retorna el numero de posiciones conservadas
    }
    
    function calculateAverageSimilarity(alignedSeqs) {
        //me da el PROMEDIO total de similitudes entre todas las PAREJAS POSIBLES de secuencias alineadas
        let totalSimilarity = 0;
        let comparisons = 0;
        
        for (let i = 0; i < alignedSeqs.length; i++) {
            for (let j = i + 1; j < alignedSeqs.length; j++) {
                //compara la similutud sin incluir pares iguales
                const similarity = calculatePairwiseSimilarity(
                    alignedSeqs[i].sequence, 
                    alignedSeqs[j].sequence
                );
                totalSimilarity += similarity; //suma
                comparisons++; //cuenta, para luego dividir por la suma y sacar el promedio
            }
        }
        
        return totalSimilarity / comparisons;
    }
    
    function calculatePairwiseSimilarity(seq1, seq2) {
        //Calcula cuánto se parecen dos secuencias alineadas, posición por posición. Solo considera posiciones sin guiones.
        let matches = 0;
        let validPositions = 0;
        
        for (let i = 0; i < seq1.length; i++) {
            if (seq1[i] !== '-' && seq2[i] !== '-') {
                validPositions++;
                if (seq1[i] === seq2[i]) {
                    matches++;
                }
            }
        }
        
        return (matches / validPositions) * 100;
    }
    
    function calculateTotalGaps(alignedSeqs) {
        // Cuenta el número total de guiones en todas las secuencias alineadas
        return alignedSeqs.reduce((total, seq) => {
                            //expresion regular que retorna una lista con todos los guiones, luego se cuenta el tamaño de esa lista y se suma con todas las demas listas de todas las secuencias
            return total + (seq.sequence.match(/-/g) || []).length;
        }, 0);
    }
    
    function displayAlignment(alignment) {
        const alignmentContent = document.getElementById('alignment-content');
        const viewSelect = document.getElementById('alignment-view-select');
        //leo el valor del selector
        const viewType = viewSelect.value;
        let html = '';
        
        switch (viewType) {
            case 'preview':
                html = generateAlignmentPreview(alignment);
                break;
            case 'full':
                html = generateFullAlignment(alignment);
                break;
            case 'consensus':
                html = generateConsensusView(alignment);
                break;
            default:
                html = generateAlignmentPreview(alignment);
        }
        //inserta el html dentro del elemento con id=alignmentContent, reemplazando lo q hubiese
        alignmentContent.innerHTML = html;
    }
    
    function generateAlignmentPreview(alignment) {
        //genera una vista previa del alineamiento mostrando los primeros 50 bp de cada secuencia
        const previewLength = 50;
        //aplica estilo al html que se mostrará
        let html = '<div style="margin-bottom: 1rem;">';
        html += '<div style="color: var(--accent-green); font-weight: bold; margin-bottom: 0.5rem;">Alignment Preview (first 50 bp):</div>';
        
        //para cada secuencia de alignment, toma su secuencia y la corta a los primeros 50 bp
        //Recorre cada objeto seq dentro de alignment.sequences.
        alignment.sequences.forEach((seq, index) => {
            const preview = seq.sequence.substring(0, previewLength);
            html += `<div style="margin-bottom: 0.3rem;">`;
            html += `<span style="color: var(--accent-blue); width: 150px; display: inline-block;">${seq.title.substring(0, 15)}:</span>`;
            html += `<span style="letter-spacing: 1px;">${formatAlignmentSequence(preview)}</span>`;
            html += `</div>`;
        });
        
        if (alignment.length > previewLength) {
            html += `<div style="color: var(--text-gray); margin-top: 0.5rem; font-style: italic;">`;
            html += `... and ${alignment.length - previewLength} more positions`;
            html += `</div>`;
        }
        
        html += '</div>';
        return html;
    }
    
    function generateFullAlignment(alignment) {
        const chunkSize = 80;
        let html = '<div>';
        html += '<div style="color: var(--accent-green); font-weight: bold; margin-bottom: 1rem;">Full Alignment:</div>';
        
        for (let start = 0; start < alignment.length; start += chunkSize) {
            html += `<div style="margin-bottom: 2rem; background-color: rgba(30, 30, 30, 0.3); padding: 1rem; border-radius: 5px;">`;
            html += `<div style="color: var(--text-gray); margin-bottom: 0.8rem; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">Positions ${start + 1}-${Math.min(start + chunkSize, alignment.length)}:</div>`;
            
            alignment.sequences.forEach((seq, index) => {
                //Para cada secuencia, extrae el fragmento de longitud 80 (o menos, al final).
                
                const chunk = seq.sequence.substring(start, start + chunkSize);
                const shortTitle = seq.title.length > 15 ? seq.title.substring(0, 15) + '...' : seq.title;
                //Línea de la secuencia con fuente monoespaciada, muestra el título corto en azul y, al pasar el ratón, el title completo.
                html += `<div style="margin-bottom: 0.4rem; font-family: 'Courier New', monospace;">`;
                html += `<span style="color: var(--accent-blue); width: 140px; display: inline-block; font-size: 0.9rem; font-weight: bold;" title="${seq.title}">${shortTitle}:</span>`;
                html += `<span style="letter-spacing: 1px; word-break: break-all;">${formatAlignmentSequence(chunk)}</span>`;
                html += `</div>`;
            });
            
            html += `<div style="margin-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem;">`;
            html += `<span style="color: var(--text-gray); width: 140px; display: inline-block; font-size: 0.9rem;">Conservation:</span>`;
            html += `<span style="letter-spacing: 1px;">${generateConservationLine(alignment, start, chunkSize)}</span>`;
            html += `</div>`;
            
            html += `</div>`;
        }
        
        html += '</div>';
        return html;
    }

    function generateConservationLine(alignment, start, chunkSize) {
        let conservationLine = '';
        const end = Math.min(start + chunkSize, alignment.length);
        
        for (let pos = start; pos < end; pos++) {
            //para cada secuencia del alineamiento, toma su base en la posición pos
            const bases = alignment.sequences.map(seq => seq.sequence[pos]);
            //toma las bases unicas, filtra y retiene las bases que no son guiones
            const uniqueBases = new Set(bases.filter(base => base !== '-'));
            
            if (uniqueBases.size === 1 && !uniqueBases.has('-')) {
                conservationLine += '<span style="color: var(--accent-green); font-weight: bold;">*</span>';
            } else if (uniqueBases.size <= 2) {
                conservationLine += '<span style="color: #f1c40f;">:</span>';
            } else {
                conservationLine += '<span style="color: var(--text-gray);">.</span>';
            }
        }
        
        return conservationLine;
    }
    
    function generateConsensusView(alignment) {
        const consensus = calculateConsensusSequence(alignment);
        let html = '<div>';
        html += '<div style="color: var(--accent-green); font-weight: bold; margin-bottom: 1rem;">Consensus Sequence:</div>';
        
        html += `<div style="background-color: rgba(42, 157, 143, 0.1); padding: 1rem; border-radius: 5px; margin-bottom: 1rem;">`;
        html += `<div style="color: var(--accent-green); font-weight: bold; margin-bottom: 0.5rem;">Consensus:</div>`;
        
        const formattedConsensus = formatConsensusWithLineBreaks(consensus.sequence, 80);
        html += `<div style="letter-spacing: 2px; font-size: 1.1rem; word-break: break-all; white-space: pre-wrap; font-family: 'Courier New', monospace; line-height: 1.8;">${formattedConsensus}</div>`;
        html += `</div>`;
        
        html += `<div style="margin-top: 1rem; background-color: rgba(30, 30, 30, 0.3); padding: 1rem; border-radius: 5px;">`;
        html += `<div style="color: var(--text-gray); margin-bottom: 0.5rem; font-weight: bold;">Consensus Statistics:</div>`;
        
        const stats = calculateConsensusStats(consensus);
        html += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;">`;
        html += `<div style="text-align: center;">`;
        html += `<div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-green);">${stats.fullyConserved}</div>`;
        html += `<div style="font-size: 0.9rem; color: var(--text-gray);">100% conserved positions</div>`;
        html += `</div>`;
        html += `<div style="text-align: center;">`;
        html += `<div style="font-size: 1.5rem; font-weight: bold; color: #f1c40f">${stats.partiallyConserved}</div>`;
        html += `<div style="font-size: 0.9rem; color: var(--text-gray);">>50% conserved positions</div>`;
        html += `</div>`;
        html += `<div style="text-align: center;">`;
        html += `<div style="font-size: 1.5rem; font-weight: bold; color: var(--primary-red);">${stats.variable}</div>`;
        html += `<div style="font-size: 0.9rem; color: var(--text-gray);">Variable positions</div>`;
        html += `</div>`;
        html += `</div>`;
        
        html += `<div style="margin-top: 1rem;">`;
        html += `<div style="color: var(--text-gray); margin-bottom: 0.5rem;">Legend:</div>`;
        html += `<div style="font-size: 0.9rem; line-height: 1.6;">`;
        html += `<span style="color: var(--accent-green); font-weight: bold;">●</span> 100% conserved position<br>`;
        html += `<span style="color: #f1c40f; font-weight: bold;">●</span> >50% conserved position<br>`;
        html += `<span style="color: var(--primary-red); font-weight: bold;">●</span> <50% conserved position<br>`;
        html += `<span style="color: var(--text-gray);">-</span> Gap in the sequence`;
        html += `</div>`;
        html += `</div>`;
        html += `</div>`;
        
        html += '</div>';
        return html;
    }

    function formatConsensusWithLineBreaks(sequence, lineLength = 80) {
        let formatted = '';
        let position = 1;
        
        for (let i = 0; i < sequence.length; i += lineLength) {
            const chunk = sequence.substring(i, i + lineLength);
            
            const positionLabel = `${String(position).padStart(6, ' ')}: `;
            
            const formattedChunk = chunk.split('').map(base => {
                if (base === '-') {
                    return `<span style="color: var(--text-gray);">-</span>`;
                } else {
                    const color = getBaseColor(base);
                    return `<span style="color: ${color}; font-weight: bold;">${base}</span>`;
                }
            }).join('');
            
            formatted += `<span style="color: #95a5a6; font-weight: normal;">${positionLabel}</span>${formattedChunk}`;
            
            if (i + lineLength < sequence.length) {
                formatted += '\n';
            }
            
            position += lineLength;
        }
        
        return formatted;
    }

    function calculateConsensusStats(consensus) {
        let fullyConserved = 0;
        let partiallyConserved = 0;
        let variable = 0;
        
        consensus.conservation.forEach(conservation => {
            if (conservation === 1.0) {
                fullyConserved++;
            } else if (conservation > 0.5) {
                partiallyConserved++;
            } else {
                variable++;
            }
        });
        
        return {
            fullyConserved,
            partiallyConserved,
            variable
        };
    }
    
    function calculateConsensusSequence(alignment) {
        const length = alignment.length;
        let consensus = '';
        let conservation = [];
        
        for (let i = 0; i < length; i++) {
            const baseCounts = {};
            let totalBases = 0;
            
            alignment.sequences.forEach(seq => {
                const base = seq.sequence[i];
                if (base !== '-') {
                    baseCounts[base] = (baseCounts[base] || 0) + 1;
                    totalBases++;
                }
            });
            
            if (totalBases === 0) {
                consensus += '-';
                conservation.push(0);
            } else {
                const mostCommon = Object.keys(baseCounts).reduce((a, b) => 
                    baseCounts[a] > baseCounts[b] ? a : b);
                const frequency = baseCounts[mostCommon] / totalBases;
                
                consensus += mostCommon;
                conservation.push(frequency);
            }
        }
        
        return { sequence: consensus, conservation };
    }
    
    function formatAlignmentSequence(sequence) {
        //aplica a cada base de la secuencia un color dependiendo de su tipo
        return sequence.split('').map(base => {
            if (base === '-') {
                return `<span style="color: var(--text-gray);">-</span>`;
            } else {
                const color = getBaseColor(base);
                return `<span style="color: ${color};">${base}</span>`;
            }
        }).join('');
    }
    
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
    
    function updateAlignmentView() {
        const alignmentContent = document.getElementById('alignment-content');
        if (alignmentContent && alignmentContent.innerHTML && !alignmentContent.innerHTML.includes('Haz clic')) {
            generateMultipleAlignment();
        }
    }
    
    function updateAlignmentStats(alignment) {
        document.getElementById('alignment-length').textContent = alignment.length.toLocaleString();
        document.getElementById('conserved-positions').textContent = alignment.conservedPositions.toLocaleString();
        document.getElementById('similarity-score').textContent = alignment.similarity.toFixed(1) + '%';
        document.getElementById('gaps-count').textContent = alignment.gapsCount.toLocaleString();
    }
    
    function generateSimilarityMatrix() {
        const matrixContainer = document.getElementById('similarity-matrix');
        
        let html = '<div class="dynamic-matrix-grid" style="display: grid; gap: 1px; background-color: rgba(255, 255, 255, 0.1); border-radius: 5px; overflow: hidden;">';
        
        const gridCols = sequences.length + 1;
        html = html.replace('display: grid;', `display: grid; grid-template-columns: repeat(${gridCols}, 1fr);`);
        
        html += '<div class="matrix-cell matrix-header">Sequence</div>';
        
        sequences.forEach(seq => {
            const shortTitle = seq.title.length > 10 ? seq.title.substring(0, 10) + '...' : seq.title;
            html += `<div class="matrix-cell matrix-header" title="${seq.title}">${shortTitle}</div>`;
        });
        
        sequences.forEach((seq1, i) => {
            const shortTitle1 = seq1.title.length > 10 ? seq1.title.substring(0, 10) + '...' : seq1.title;
            html += `<div class="matrix-cell matrix-header" title="${seq1.title}">${shortTitle1}</div>`;
            
            sequences.forEach((seq2, j) => {
                if (i === j) {
                    html += '<div class="matrix-cell" style="background-color: var(--accent-green); color: white; font-weight: bold;">100%</div>';
                } else {
                    const similarity = calculateSequenceSimilarity(seq1.sequence, seq2.sequence);
                    const color = getSimilarityColor(similarity);
                    html += `<div class="matrix-cell" style="background-color: ${color}; color: white;">${similarity.toFixed(1)}%</div>`;
                }
            });
        });
        
        html += '</div>';
        matrixContainer.innerHTML = html;
    }
    
    function calculateSequenceSimilarity(seq1, seq2) {
        const minLength = Math.min(seq1.length, seq2.length);
        let matches = 0;
        
        for (let i = 0; i < minLength; i++) {
            if (seq1[i].toUpperCase() === seq2[i].toUpperCase()) {
                matches++;
            }
        }
        
        return (matches / minLength) * 100;
    }
    
    function getSimilarityColor(similarity) {
        if (similarity >= 90) return 'rgba(39, 174, 96, 0.8)';
        if (similarity >= 70) return 'rgba(241, 196, 15, 0.8)';
        if (similarity >= 50) return 'rgba(230, 126, 34, 0.8)';
        return 'rgba(231, 76, 60, 0.8)';
    }
    
    function initSequenceStatsSelector() {
        const statsSelect = document.getElementById('sequence-stats-select');
        const statsContainer = document.getElementById('sequence-stats-container');
        
        function updateSequenceStats() {
            const selectedIndex = parseInt(statsSelect.value);
            const selectedSequence = sequences[selectedIndex];
            
            const statsHTML = generateSequenceStatsHTML(selectedSequence, selectedIndex);
            
            statsContainer.style.opacity = '0.5';
            setTimeout(() => {
                statsContainer.innerHTML = statsHTML;
                statsContainer.style.opacity = '1';
                addStatsCardEffects();
            }, 150);
        }
        
        statsSelect.addEventListener('change', updateSequenceStats);
        updateSequenceStats();
    }
    
    function generateSequenceStatsHTML(sequence, index) {
        const totalBases = sequence.length;
        const gcContent = sequence.gc;
        const atContent = 100 - gcContent;
        
        return `
            <div class="sequence-stat-card-detailed" style="animation: fadeInUp 0.5s ease;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                    <h4 style="color: var(--accent-green); margin: 0;">
                        <i class="fas fa-dna"></i> ${sequence.title}
                    </h4>
                    <span style="background-color: rgba(42, 157, 143, 0.2); color: var(--accent-green); padding: 4px 12px; border-radius: 15px; font-size: 0.9rem;">
                        Sequence #${index + 1}
                    </span>
                </div>
                
                <div class="main-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="main-stat-card">
                        <div class="main-stat-value" style="font-size: 1.8rem; font-weight: bold; color: var(--primary-red);">
                            ${totalBases.toLocaleString()}
                        </div>
                        <div class="main-stat-label" style="color: var(--text-gray); font-size: 0.9rem;">
                            Total Bases
                        </div>
                    </div>
                    <div class="main-stat-card">
                        <div class="main-stat-value" style="font-size: 1.8rem; font-weight: bold; color: var(--accent-green);">
                            ${gcContent.toFixed(2)}%
                        </div>
                        <div class="main-stat-label" style="color: var(--text-gray); font-size: 0.9rem;">
                            GC Content
                        </div>
                    </div>
                    <div class="main-stat-card">
                        <div class="main-stat-value" style="font-size: 1.8rem; font-weight: bold; color: var(--accent-blue);">
                            ${atContent.toFixed(2)}%
                        </div>
                        <div class="main-stat-label" style="color: var(--text-gray); font-size: 0.9rem;">
                            AT Content
                        </div>
                    </div>
                </div>
                
                <div style="background-color: rgba(30, 30, 30, 0.5); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h5 style="color: var(--text-gray); margin-bottom: 1rem; display: flex; align-items: center;">
                        <i class="fas fa-chart-pie" style="margin-right: 0.5rem;"></i>
                        Base Composition
                    </h5>
                    <div class="base-composition-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem;">
                        ${generateBaseCompositionHTML(sequence.bases, totalBases)}
                    </div>
                </div>
                
                <div style="background-color: rgba(30, 30, 30, 0.5); padding: 1.5rem; border-radius: 8px;">
                    <h5 style="color: var(--text-gray); margin-bottom: 1rem; display: flex; align-items: center;">
                        <i class="fas fa-chart-bar" style="margin-right: 0.5rem;"></i>
                        Visual Distribution
                    </h5>
                    ${generateProgressBarsHTML(sequence.bases, totalBases)}
                </div>
            </div>
        `;
    }
    
    function generateBaseCompositionHTML(bases, totalBases) {
        const baseColors = {
            'A': '#e74c3c',
            'T': '#3498db',
            'C': '#f39c12',
            'G': '#27ae60',
            'N': '#95a5a6'
        };
        
        let html = '';
        for (const [base, count] of Object.entries(bases)) {
            const percentage = (count / totalBases * 100);
            html += `
                <div class="base-stat-card" style="text-align: center; padding: 1rem; background-color: rgba(0,0,0,0.3); border-radius: 6px; border-top: 3px solid ${baseColors[base]};">
                    <div style="font-size: 1.5rem; font-weight: bold; color: ${baseColors[base]};">
                        ${base}
                    </div>
                    <div style="font-size: 1.2rem; color: white; margin: 0.5rem 0;">
                        ${count.toLocaleString()}
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-gray);">
                        ${percentage.toFixed(2)}%
                    </div>
                </div>
            `;
        }
        return html;
    }
    
    function generateProgressBarsHTML(bases, totalBases) {
        const baseColors = {
            'A': '#e74c3c',
            'T': '#3498db', 
            'C': '#f39c12',
            'G': '#27ae60',
            'N': '#95a5a6'
        };
        
        let html = '';
        for (const [base, count] of Object.entries(bases)) {
            const percentage = (count / totalBases * 100);
            html += `
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="color: ${baseColors[base]}; font-weight: bold;">${base}</span>
                        <span style="color: var(--text-gray); font-size: 0.9rem;">${count} (${percentage.toFixed(1)}%)</span>
                    </div>
                    <div style="background-color: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; background-color: ${baseColors[base]}; width: ${percentage}%; transition: width 0.8s ease; border-radius: 4px;"></div>
                    </div>
                </div>
            `;
        }
        return html;
    }
    
    function addStatsCardEffects() {
        const statCards = document.querySelectorAll('.base-stat-card, .main-stat-card');
        
        statCards.forEach(card => {
            card.style.transition = 'all 0.3s ease';
            card.style.cursor = 'pointer';
            
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            });
        });
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
                moreIndicator.textContent = ` ... (${selectedSequence.sequence.length - 120} more)`;
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
    
    function initMotifSearch() {
        const motifInput = document.getElementById('motif-input');
        const searchButton = document.querySelector('.panel button[style*="width: 100%"]');
        
        searchButton.addEventListener('click', function() {
            const motif = motifInput.value.trim().toUpperCase();
            
            searchMotifInSequences(motif);
        });
        
        motifInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }
    
    function searchMotifInSequences(motif) {
        const results = [];
        
        const validBases = /^[ATCGN]+$/i;
        
        sequences.forEach((seq, seqIndex) => {
            const sequence = seq.sequence.toUpperCase();
            let position = 0;
            
            while ((position = sequence.indexOf(motif, position)) !== -1) {
                results.push({
                    sequenceTitle: seq.title,
                    position: position + 1,
                    endPosition: position + motif.length,
                    context: getSequenceContext(sequence, position, motif.length)
                });
                position++;
            }
        });
        
        displayMotifResults(motif, results);
        
        if (results.length > 0) {
            showNotification(`Found ${results.length} matches`, 'success');
        } else {
            showNotification('No matches found', 'warning');
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
        let resultsContainer = document.querySelector('.motif-results');
        
        if (!resultsContainer) {
            const motifPanels = Array.from(document.querySelectorAll('.panel h3')).filter(h3 => 
                h3.textContent.toLowerCase().includes('motivo')
            );
            
            if (motifPanels.length > 0) {
                const panel = motifPanels[0].closest('.panel');
                resultsContainer = document.createElement('div');
                resultsContainer.className = 'motif-results';
                resultsContainer.style.marginTop = '1.5rem';
                
                const button = panel.querySelector('button');
                if (button && button.parentNode) {
                    button.parentNode.insertBefore(resultsContainer, button.nextSibling);
                }
            }
        }
        
        resultsContainer.innerHTML = '';
        
        const resultsTitle = document.createElement('h4');
        resultsTitle.textContent = `Results for "${motif}":`;
        resultsTitle.style.color = 'var(--accent-green)';
        resultsContainer.appendChild(resultsTitle);
        
        if (results.length === 0) {
            const noResults = document.createElement('p');
            noResults.textContent = 'No matches found.';
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
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong style="color: var(--accent-green);">${result.sequenceTitle}</strong>
                    <span style="color: var(--text-gray); font-size: 0.9rem;">
                        Position ${result.position}-${result.endPosition}
                    </span>
                </div>
                ${result.context ? `
                    <div style="font-family: 'Courier New', monospace; font-size: 0.9rem; background-color: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 3px; overflow-x: auto;">
                        <span style="color: #95a5a6;">${result.context.before}</span><span style="color: var(--accent-green); font-weight: bold; background-color: rgba(42, 157, 143, 0.3);">${result.context.motif}</span><span style="color: #95a5a6;">${result.context.after}</span>
                    </div>
                ` : ''}
            `;
            
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
                    <div style="color: var(--text-gray); font-size: 0.9rem;">Total matches</div>
                </div>
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-green);">${uniqueSequences}</div>
                    <div style="color: var(--text-gray); font-size: 0.9rem;">Sequences affected</div>
                </div>
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-green);">${avgPositions}</div>
                    <div style="color: var(--text-gray); font-size: 0.9rem;">Average position</div>
                </div>
            </div>
        `;
        
        resultsContainer.appendChild(stats);
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
            showNotification('Sequences copied to clipboard', 'success');
        }).catch(err => {
            const textArea = document.createElement('textarea');
            textArea.value = fastaContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Sequences copied to clipboard', 'success');
        });
    }
    
    function exportToFASTA() {
        const exportButton = document.getElementById('export-fasta-btn') || 
                           Array.from(document.querySelectorAll('button')).find(btn => 
                               btn.textContent.includes('Exportar FASTA'));
        
        const originalHTML = exportButton.innerHTML;
        exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
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
            
            showNotification(`FASTA file exported: ${a.download}`, 'success');
        })
        .catch(error => {
            showNotification('Error exporting FASTA file: ' + error.message, 'error');
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
            addTooltip(base, `Position ${index + 1}: ${base.textContent}`);
        });
    }, 1000);
    
    const distanceResult = document.getElementById('distance-result');
    if (distanceResult) {
        addTooltip(distanceResult, 'Genetic distance calculated by multiple alignment');
    }
});
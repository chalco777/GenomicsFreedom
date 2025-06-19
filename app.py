from flask import Flask, render_template, request, redirect, url_for
from Bio import SeqIO
from Bio.SeqUtils import gc_fraction
from io import StringIO
import json
import matplotlib
import seaborn as sns
matplotlib.use('Agg')  # Para evitar problemas con GUI
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO
from collections import Counter

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    sequences = []
    
    # Procesar secuencias manuales
    manual_sequences = request.form.getlist('manual_sequences[]')
    manual_titles = request.form.getlist('manual_titles[]')
    
    for title, seq in zip(manual_titles, manual_sequences):
        if seq.strip():
            sequences.append({'title': title, 'sequence': seq})
    
    # Procesar archivo FASTA
    fasta_file = request.files.get('fasta_file')
    if fasta_file and fasta_file.filename != '':
        fasta_content = fasta_file.read().decode('utf-8')
        fasta_io = StringIO(fasta_content)
        for record in SeqIO.parse(fasta_io, "fasta"):
            sequences.append({'title': record.id, 'sequence': str(record.seq)})
    
    # Si no hay secuencias, redirigir a la página principal
    if not sequences:
        return redirect(url_for('index'))
    
    # Calcular estadísticas para cada secuencia
    for seq_data in sequences:
        sequence = seq_data['sequence']
        seq_data['length'] = len(sequence)
        seq_data['gc'] = 100*gc_fraction(sequence, ambiguous="ignore")
        
        # Contar bases
        bases = {'A': 0, 'T': 0, 'C': 0, 'G': 0, 'N': 0}
        for base in sequence.upper():
            if base in bases:
                bases[base] += 1
            else:
                bases['N'] += 1  # Bases no reconocidas
        seq_data['bases'] = bases
    
    # Generar histograma de longitudes
    histogram_img = generate_histogram([s['length'] for s in sequences])
    
    # Calcular estadísticas globales
    global_stats = {
        'total_sequences': len(sequences),
        'total_bases': sum(s['length'] for s in sequences),
        'avg_gc': np.mean([s['gc'] for s in sequences]),
        'base_percentages': calculate_base_percentages(sequences)
    }
    
    # Renderizar la página de resultados con los datos
    return render_template('results.html', 
                           sequences=sequences, 
                           global_stats=global_stats,
                           histogram_img=histogram_img)

def calculate_base_percentages(sequences):
    """Calcula el porcentaje de cada base en todas las secuencias"""
    total_bases = sum(s['length'] for s in sequences)
    base_counts = Counter()
    
    for seq in sequences:
        for base, count in seq['bases'].items():
            base_counts[base] += count
    
    return {base: (count / total_bases) * 100 for base, count in base_counts.items()}

# Cambiar la función generate_histogram
def generate_histogram(lengths):
    """Genera un histograma de longitudes de secuencia con Seaborn"""
    import matplotlib.pyplot as plt
    import seaborn as sns
    import numpy as np
    from io import BytesIO
    import base64
    
    # Configuración global de estilo - SIN GRID, TRANSPARENTE
    plt.style.use('dark_background')  # Fondo oscuro para contraste
    plt.rcParams.update({
        'axes.facecolor': 'none',      # Fondo transparente para el área del gráfico
        'figure.facecolor': 'none',    # Fondo transparente para la figura completa
        'axes.edgecolor': 'white',     # Color blanco para los ejes
        'axes.labelcolor': 'white',    # Color blanco para las etiquetas
        'xtick.color': 'white',        # Color blanco para marcas del eje X
        'ytick.color': 'white',        # Color blanco para marcas del eje Y
        'grid.color': 'none'           # Sin grid
    })
    
    # Crear figura con fondo transparente
    plt.figure(figsize=(8, 4), facecolor='none')
    
    # Crear histograma SIN bordes y SIN grid
    ax = sns.histplot(
        lengths, 
        bins=15, 
        color='#e63946', 
        kde=True,
        edgecolor='none',  # Eliminar bordes de las barras (aquí es donde se debe hacer)
        line_kws={'color': 'white'}  # Línea KDE en blanco
    )
    
    # Eliminar grid completamente
    ax.grid(False)
    
    # Personalizar título y etiquetas
    plt.title('Distribución de Longitudes de Secuencias', fontsize=14, color='white')
    plt.xlabel('Longitud (bp)', fontsize=12, color='white')
    plt.ylabel('Número de Secuencias', fontsize=12, color='white')
    
    # Personalizar línea KDE
    if ax.lines:  # Si existe la línea KDE
        ax.lines[0].set_color('white')
    
    # Añadir línea de promedio
    if lengths:
        mean_length = np.mean(lengths)
        plt.axvline(
            mean_length, 
            color='#2a9d8f', 
            linestyle='dashed', 
            linewidth=2
        )
        
        # Texto de media bien posicionado
        plt.text(
            0.98, 
            0.98,  # 98% del ancho y alto
            f'Media: {mean_length:.0f} bp', 
            color='#2a9d8f', 
            fontsize=12,
            transform=plt.gca().transAxes,  # Coordenadas relativas
            horizontalalignment='right',    # Alinear derecha
            verticalalignment='top',        # Alinear arriba
            bbox=dict(
                facecolor='black', 
                alpha=0.5, 
                edgecolor='none', 
                boxstyle='round,pad=0.3'
            )
        )
    
    # Eliminar spines innecesarios
    sns.despine(left=True, bottom=True)
    
    # Personalizar spines visibles
    for spine in ['left', 'bottom']:
        ax.spines[spine].set_color('white')
        ax.spines[spine].set_linewidth(0.5)
    
    # Guardar en buffer con fondo transparente
    buffer = BytesIO()
    plt.savefig(
        buffer, 
        format='png', 
        bbox_inches='tight', 
        dpi=100, 
        transparent=True  # Fondo transparente
    )
    plt.close()
    
    # Convertir a base64 para incrustar en HTML
    img_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{img_data}"
if __name__ == '__main__':
    app.run(debug=True)
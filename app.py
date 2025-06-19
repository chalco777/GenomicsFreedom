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
    plt.figure(figsize=(8, 4))
    
    # Usar Seaborn para un histograma más profesional
    sns.set(style="whitegrid")
    ax = sns.histplot(lengths, bins=15, color='#e63946', kde=True, edgecolor='black')
    
    plt.title('Distribución de Longitudes de Secuencias', fontsize=14)
    plt.xlabel('Longitud (bp)', fontsize=12)
    plt.ylabel('Número de Secuencias', fontsize=12)
    
    # Añadir línea de promedio
    if lengths:
        mean_length = np.mean(lengths)
        plt.axvline(mean_length, color='#2a9d8f', linestyle='dashed', linewidth=2)
        plt.text(mean_length*1.05, plt.ylim()[1]*0.9, 
                 f'Media: {mean_length:.0f} bp', 
                 color='#2a9d8f', fontsize=12)
    
    # Guardar en buffer
    buffer = BytesIO()
    plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100)
    plt.close()
    
    # Convertir a base64 para incrustar en HTML
    img_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{img_data}"

if __name__ == '__main__':
    app.run(debug=True)
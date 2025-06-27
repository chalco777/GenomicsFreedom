from flask import Flask, render_template, request, redirect, url_for, jsonify
#render_template para combinar HTML con datos de Python
#request para manejar solicitudes HTTP, acceder a kson del cuerpo, manjear metodos GET POST, ver paramertros de la url
# redirect para redirigir a otra ruta
#url_for para generar URLs para las rutas de la aplicación
#jsonify para convertir datos de Python a JSON y enviarlos como respuesta HTTP


from Bio import SeqIO #leer secuencias
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
import os
import subprocess
from Bio import AlignIO, Phylo
from Bio.Phylo.TreeConstruction import DistanceCalculator, DistanceTreeConstructor
from Bio.Align import MultipleSeqAlignment
from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord

#Creo instancia que gestiona archivos y rutas, gestiona en sí la aplicacion web
app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
# Usar ruta relativa al archivo app.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MUSCLE_PATH = os.path.join(BASE_DIR, 'bin', 'muscle.exe')
#crea carpetas si no existen
os.makedirs(UPLOAD_FOLDER, exist_ok=True) #para archivos
os.makedirs('static', exist_ok=True) # para css,jss, imagens

#Cuando el usuario visite la URL raíz /, ejecuta la función que muestra el html index
#el navegaor pide, solicitud get, algo que mostrar, y el servidor responde con el contenido del index.html
@app.route('/')
def index():
    return render_template('index.html')
#cargo el index html y lo muestra en el navegador


#navegador envia, solitiud post, datos al servidor flask, que responde ejecutando analyz
@app.route('/analyze', methods=['POST'])
def analyze():
    sequences = []
    #request busca en el cuerpo de la solicitud post los datos enviados por el usuario
    #leen, del formulario HTML, todas las entradas cuyos name sean exactamente manual_sequences[] y manual_titles[]
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

    # Generar árbol filogenético y obtener distancias reales
    phylo_tree_img = None
    distance_matrix = None
    if len(sequences) > 1:  # Solo si hay más de una secuencia
        print(f"Generando árbol filogenético para {len(sequences)} secuencias...")
        phylo_tree_img, distance_matrix = generate_phylogenetic_tree_with_distances(sequences)
        print(f"Resultado: tree_img={'Generado' if phylo_tree_img else 'None'}, distances={'Generadas' if distance_matrix else 'None'}")
    
    # Renderizar la página de resultados con los datos
    return render_template('results.html',
                           sequences=sequences,
                           global_stats=global_stats,
                           histogram_img=histogram_img,
                           phylo_tree_img=phylo_tree_img,
                           distance_matrix=distance_matrix)

def calculate_base_percentages(sequences):
    """Calcula el porcentaje de cada base en todas las secuencias"""
    total_bases = sum(s['length'] for s in sequences)
    base_counts = Counter()
    
    for seq in sequences:
        for base, count in seq['bases'].items():
            base_counts[base] += count
    
    return {base: (count / total_bases) * 100 for base, count in base_counts.items()}

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

def generate_phylogenetic_tree_with_distances(sequences):
    """Genera un árbol filogenético y devuelve tanto la imagen como la matriz de distancias"""
    try:
        print("Iniciando generación de árbol filogenético...")
        print(f"Directorio de trabajo actual: {os.getcwd()}")
        print(f"Ruta de MUSCLE: {MUSCLE_PATH}")
        print(f"Ruta absoluta de MUSCLE: {os.path.abspath(MUSCLE_PATH)}")
        
        # Validar que MUSCLE existe
        if not os.path.exists(MUSCLE_PATH):
            print(f"ERROR: MUSCLE no encontrado en {MUSCLE_PATH}")
            print("Contenido del directorio actual:")
            for item in os.listdir('.'):
                print(f"  - {item}")
            if os.path.exists('bin'):
                print("Contenido del directorio bin:")
                for item in os.listdir('bin'):
                    print(f"  - bin/{item}")
            return generate_simple_phylogenetic_tree(sequences)
        
        # Crear archivo FASTA temporal
        input_file = os.path.join(UPLOAD_FOLDER, 'temp_input.fasta')
        aligned_file = os.path.join(UPLOAD_FOLDER, 'temp_aligned.fasta')
        
        print("Escribiendo secuencias en archivo temporal...")
        # Validar y limpiar secuencias antes de escribir
        valid_sequences = []
        for i, seq_data in enumerate(sequences):
            sequence = seq_data['sequence'].upper().strip()
            title = seq_data['title'].strip()
            
            # Validar que la secuencia no esté vacía
            if not sequence:
                print(f"ADVERTENCIA: Secuencia '{title}' está vacía, omitiendo...")
                continue
                
            # Limpiar título para evitar problemas con MUSCLE
            clean_title = title.replace(' ', '_').replace('|', '_').replace(':', '_').replace(';', '_')
            if not clean_title:
                clean_title = f"Seq_{i+1}"
                
            valid_sequences.append({'title': clean_title, 'sequence': sequence})
        
        if len(valid_sequences) < 2:
            print("ERROR: Se necesitan al menos 2 secuencias válidas")
            return generate_simple_phylogenetic_tree(sequences)
        
        # Escribir secuencias en formato FASTA
        with open(input_file, 'w') as f:
            for seq_data in valid_sequences:
                f.write(f">{seq_data['title']}\n{seq_data['sequence']}\n")
                
        print(f"Archivo FASTA creado con {len(valid_sequences)} secuencias válidas")
        
        print(f"Ejecutando MUSCLE: {MUSCLE_PATH}")
        # MUSCLE 5.3 usa sintaxis: -align input -output output
        muscle_cline = f'"{MUSCLE_PATH}" -align "{input_file}" -output "{aligned_file}"'
        print(f"Comando completo: {muscle_cline}")
        
        result = subprocess.run(muscle_cline, shell=True, capture_output=True, text=True, timeout=120)
        
        print(f"MUSCLE return code: {result.returncode}")
        if result.stderr:
            print(f"MUSCLE stderr: {result.stderr}")
        if result.stdout:
            print(f"MUSCLE stdout: {result.stdout}")
            
        # Verificar si el archivo de salida se creó y tiene contenido
        if os.path.exists(aligned_file):
            file_size = os.path.getsize(aligned_file)
            print(f"Archivo alineado creado: {aligned_file} ({file_size} bytes)")
            if file_size == 0:
                print("ADVERTENCIA: El archivo alineado está vacío")
                return generate_simple_phylogenetic_tree(sequences)
        else:
            print(f"ERROR: No se creó el archivo alineado: {aligned_file}")
            return generate_simple_phylogenetic_tree(sequences)
        
        if result.returncode != 0:
            print("MUSCLE terminó con error, usando método alternativo...")
            return generate_simple_phylogenetic_tree(sequences)
        
        print("Leyendo alineamiento...")
        # Leer alineamiento
        try:
            alignment = AlignIO.read(aligned_file, 'fasta')
            print(f"Alineamiento leído: {len(alignment)} secuencias")
        except Exception as e:
            print(f"Error leyendo alineamiento: {e}")
            return generate_simple_phylogenetic_tree(sequences)
        
        # Calcular distancias y árbol
        print("Calculando distancias...")
        calculator = DistanceCalculator('identity')
        dm = calculator.get_distance(alignment)
        constructor = DistanceTreeConstructor()
        tree = constructor.nj(dm)
        
        # Convertir matriz de distancias a formato utilizable
        seq_names = [seq['title'] for seq in sequences]
        distance_dict = {}
        
        for i, name1 in enumerate(seq_names):
            for j, name2 in enumerate(seq_names):
                if i < j:  # Solo calcular distancias únicas (triangular superior)
                    distance = dm[i, j]
                    distance_dict[f"{name1}|{name2}"] = round(distance, 4)
        
        print("Generando imagen del árbol...")
        # Generar imagen del árbol con fondo temático
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Crear un fondo degradado que combine con el tema de la página
        # Usando los colores de tu tema: tonos oscuros con acentos rojos/verdes
        from matplotlib.colors import LinearSegmentedColormap
        
        # Definir colores del degradado (de tu tema CSS)
        colors = ['#1a1a1a', '#2a2a2a', '#1e1e1e']  # Tonos oscuros
        n_bins = 100
        cmap = LinearSegmentedColormap.from_list('custom', colors, N=n_bins)
        
        # Crear fondo degradado
        gradient = np.linspace(0, 1, 256).reshape(1, -1)
        gradient = np.vstack((gradient, gradient))
        ax.imshow(gradient, aspect='auto', cmap=cmap, alpha=0.8,
                 extent=[ax.get_xlim()[0], ax.get_xlim()[1], 
                        ax.get_ylim()[0], ax.get_ylim()[1]])
        
        # Dibujar el árbol (manteniendo colores por defecto)
        Phylo.draw(tree, do_show=False, axes=ax)
        
        # Personalizar el título
        plt.title('Árbol Filogenético', color='white', fontsize=16, 
                 fontweight='bold', pad=20)
        
        # Hacer los ejes transparentes pero mantener el fondo
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['bottom'].set_visible(False)
        ax.spines['left'].set_visible(False)
        ax.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)
        
        # Ajustar márgenes
        plt.tight_layout()
        
        # Guardar como base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100, 
                   facecolor='#1a1a1a', edgecolor='none')
        plt.close()
        
        # Limpiar archivos temporales
        try:
            if os.path.exists(input_file):
                os.remove(input_file)
            if os.path.exists(aligned_file):
                os.remove(aligned_file)
        except:
            pass
        
        img_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        tree_img = f"data:image/png;base64,{img_data}"
        
        print("Árbol filogenético generado exitosamente!")
        return tree_img, distance_dict
        
    except Exception as e:
        print(f"Error generando árbol filogenético: {e}")
        import traceback
        traceback.print_exc()
        return generate_simple_phylogenetic_tree(sequences)

def generate_simple_phylogenetic_tree(sequences):
    """Genera un árbol filogenético simple sin MUSCLE usando distancias de Hamming"""
    try:
        print("Generando árbol filogenético simple...")
        
        # Calcular distancias de Hamming simples
        distance_dict = {}
        seq_names = [seq['title'] for seq in sequences]
        
        # Crear matriz de distancias manualmente
        distance_matrix = []
        for i, seq1 in enumerate(sequences):
            row = []
            for j, seq2 in enumerate(sequences):
                if i == j:
                    distance = 0.0
                else:
                    # Calcular distancia de Hamming simple
                    s1, s2 = seq1['sequence'], seq2['sequence']
                    min_len = min(len(s1), len(s2))
                    max_len = max(len(s1), len(s2))
                    
                    if min_len == 0:
                        distance = 1.0
                    else:
                        differences = sum(1 for k in range(min_len) if s1[k] != s2[k])
                        differences += abs(len(s1) - len(s2))  # Penalizar diferencias de longitud
                        distance = differences / max_len
                
                row.append(distance)
                
                # Guardar en diccionario para JavaScript
                if i < j:
                    distance_dict[f"{seq1['title']}|{seq2['title']}"] = round(distance, 4)
            
            distance_matrix.append(row)
        
        # Crear alineamiento simple (sin alinear realmente)
        from Bio.Align import MultipleSeqAlignment
        from Bio.SeqRecord import SeqRecord
        from Bio.Seq import Seq
        
        # Crear records para BioPython
        records = []
        max_length = max(len(seq['sequence']) for seq in sequences)
        
        for seq in sequences:
            # Pad sequences to same length
            padded_seq = seq['sequence'].ljust(max_length, '-')
            clean_title = seq['title'].replace(' ', '_').replace('|', '_')
            record = SeqRecord(Seq(padded_seq), id=clean_title)
            records.append(record)
        
        alignment = MultipleSeqAlignment(records)
        
        # Usar BioPython para crear el árbol
        calculator = DistanceCalculator('identity')
        dm = calculator.get_distance(alignment)
        constructor = DistanceTreeConstructor()
        tree = constructor.nj(dm)
        
        # Generar imagen del árbol
        plt.figure(figsize=(10, 6), facecolor='none')
        plt.style.use('dark_background')
        
        # Configurar colores para que todo sea blanco
        plt.rcParams.update({
            'axes.edgecolor': 'white',
            'axes.labelcolor': 'white', 
            'xtick.color': 'white',
            'ytick.color': 'white',
            'text.color': 'white',
            'lines.color': 'white',
            'patch.edgecolor': 'white'
        })
        
        # Dibujar árbol
        ax = plt.gca()
        Phylo.draw(tree, do_show=False, axes=ax)
        
        # Forzar que todas las líneas sean blancas
        for line in ax.lines:
            line.set_color('white')
            line.set_linewidth(2)
        
        # Forzar que todo el texto sea blanco
        for text in ax.texts:
            text.set_color('white')
            text.set_fontsize(10)
        
        plt.title('Árbol Filogenético (Distancias Simples)', color='white', fontsize=14, pad=20)
        
        # Hacer el fondo transparente
        ax.set_facecolor('none')
        for spine in ax.spines.values():
            spine.set_visible(False)
        
        # Guardar como base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100, transparent=True)
        plt.close()
        
        img_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        tree_img = f"data:image/png;base64,{img_data}"
        
        print("Árbol filogenético simple generado exitosamente!")
        return tree_img, distance_dict
        
    except Exception as e:
        print(f"Error en árbol filogenético simple: {e}")
        import traceback
        traceback.print_exc()
        return None, None

# Nueva ruta para obtener distancia específica
@app.route('/get_distance', methods=['POST'])
def get_distance():
    data = request.get_json()
    seq1 = data.get('seq1')
    seq2 = data.get('seq2')
    distance_matrix = data.get('distance_matrix', {})
    
    # Buscar la distancia en ambas direcciones
    key1 = f"{seq1}|{seq2}"
    key2 = f"{seq2}|{seq1}"
    
    distance = distance_matrix.get(key1) or distance_matrix.get(key2)
    
    if distance is not None:
        return jsonify({'distance': distance})
    else:
        return jsonify({'distance': 0.0})  # Misma secuencia

# Nueva ruta para exportar FASTA
@app.route('/export_fasta', methods=['POST'])
def export_fasta():
    from flask import make_response
    from datetime import datetime
    
    try:
        data = request.get_json()
        sequences = data.get('sequences', [])
        
        if not sequences:
            return jsonify({'error': 'No hay secuencias para exportar'}), 400
        
        # Generar contenido FASTA
        fasta_content = ""
        for seq in sequences:
            title = seq.get('title', 'Unnamed_sequence')
            sequence = seq.get('sequence', '')
            
            if sequence:
                fasta_content += f">{title}\n{sequence}\n"
        
        if not fasta_content:
            return jsonify({'error': 'No hay secuencias válidas para exportar'}), 400
        
        # Crear respuesta con archivo
        response = make_response(fasta_content)
        
        # Generar nombre de archivo con timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"genomics_freedom_export_{timestamp}.fasta"
        
        # Configurar headers para descarga
        response.headers['Content-Type'] = 'text/plain'
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.headers['Content-Length'] = len(fasta_content)
        
        return response
        
    except Exception as e:
        print(f"Error en exportación FASTA: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    
if __name__ == '__main__':
    app.run(debug=True)
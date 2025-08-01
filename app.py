from flask import Flask, render_template, request, redirect, url_for, jsonify
#render_template to combine HTML with Python data
#request to handle HTTP requests, access JSON body, handle GET POST methods, see url parameters
# redirect to redirect to another route
#url_for to generate URLs for app routes
#jsonify to convert Python data to JSON and send as HTTP response

from Bio import SeqIO #read sequences
from Bio.SeqUtils import gc_fraction
from io import StringIO
import json
import matplotlib
import seaborn as sns
matplotlib.use('Agg')  # To avoid GUI issues
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

#Create instance that manages files and routes, manages the web app itself
app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
# Use path relative to app.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MUSCLE_PATH = os.path.join(BASE_DIR, 'bin', 'muscle.exe')
#creates folders if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True) #for files
os.makedirs('static', exist_ok=True) # for css, js, images

#When the user visits the root URL /, executes the function that shows the index html
#the browser requests, get request, something to show, and the server responds with the content of index.html
@app.route('/')
def index():
    return render_template('index.html')
#loads the index html and shows it in the browser

#browser sends, post request, data to the flask server, which responds by executing analyze
@app.route('/analyze', methods=['POST'])
def analyze():
    sequences = []
    #request looks in the body of the post request for the data sent by the user
    #reads, from the HTML form, all entries whose name are exactly manual_sequences[] and manual_titles[]
    manual_sequences = request.form.getlist('manual_sequences[]')
    manual_titles = request.form.getlist('manual_titles[]')
    
    for title, seq in zip(manual_titles, manual_sequences):
        if seq.strip():
            sequences.append({'title': title, 'sequence': seq})
    
    # Process FASTA file
    fasta_file = request.files.get('fasta_file')
    if fasta_file and fasta_file.filename != '':
        fasta_content = fasta_file.read().decode('utf-8')
        fasta_io = StringIO(fasta_content)
        for record in SeqIO.parse(fasta_io, "fasta"):
            sequences.append({'title': record.id, 'sequence': str(record.seq)})
    
    # If there are no sequences, redirect to the main page
    if not sequences:
        return redirect(url_for('index'))
    
    # Calculate statistics for each sequence
    for seq_data in sequences:
        sequence = seq_data['sequence']
        seq_data['length'] = len(sequence)
        seq_data['gc'] = 100*gc_fraction(sequence, ambiguous="ignore")
        
        # Count bases
        bases = {'A': 0, 'T': 0, 'C': 0, 'G': 0, 'N': 0}
        for base in sequence.upper():
            if base in bases:
                bases[base] += 1
            else:
                bases['N'] += 1  # Unrecognized bases
        seq_data['bases'] = bases
    
    # Generate histogram of lengths
    histogram_img = generate_histogram([s['length'] for s in sequences])
    
    # Calculate global statistics
    global_stats = {
        'total_sequences': len(sequences),
        'total_bases': sum(s['length'] for s in sequences),
        'avg_gc': np.mean([s['gc'] for s in sequences]),
        'base_percentages': calculate_base_percentages(sequences)
    }

    # Generate phylogenetic tree and get real distances
    phylo_tree_img = None
    distance_matrix = None
    if len(sequences) > 1:  # Only if there is more than one sequence
        print(f"Generating phylogenetic tree for {len(sequences)} sequences...")
        phylo_tree_img, distance_matrix = generate_phylogenetic_tree_with_distances(sequences)
        print(f"Result: tree_img={'Generated' if phylo_tree_img else 'None'}, distances={'Generated' if distance_matrix else 'None'}")
    
    # Render the results page with the data
    return render_template('results.html',
                           sequences=sequences,
                           global_stats=global_stats,
                           histogram_img=histogram_img,
                           phylo_tree_img=phylo_tree_img,
                           distance_matrix=distance_matrix)

def calculate_base_percentages(sequences):
    """Calculates the percentage of each base in all sequences"""
    total_bases = sum(s['length'] for s in sequences)
    base_counts = Counter()
    
    for seq in sequences:
        for base, count in seq['bases'].items():
            base_counts[base] += count
    
    return {base: (count / total_bases) * 100 for base, count in base_counts.items()}

def generate_histogram(lengths):
    """Generates a histogram of sequence lengths with Seaborn"""
    import matplotlib.pyplot as plt
    import seaborn as sns
    import numpy as np
    from io import BytesIO
    import base64
    
    # Global style config - NO GRID, TRANSPARENT
    plt.style.use('dark_background')  # Dark background for contrast
    plt.rcParams.update({
        'axes.facecolor': 'none',      # Transparent background for plot area
        'figure.facecolor': 'none',    # Transparent background for the whole figure
        'axes.edgecolor': 'white',     # White color for axes
        'axes.labelcolor': 'white',    # White color for labels
        'xtick.color': 'white',        # White color for X axis ticks
        'ytick.color': 'white',        # White color for Y axis ticks
        'grid.color': 'none'           # No grid
    })
    
    # Create figure with transparent background
    plt.figure(figsize=(8, 4), facecolor='none')
    
    # Create histogram WITHOUT borders and WITHOUT grid
    ax = sns.histplot(
        lengths, 
        bins=15, 
        color='#e63946', 
        kde=True,
        edgecolor='none',  # Remove bar borders
        line_kws={'color': 'white'}  # KDE line in white
    )
    
    # Remove grid completely
    ax.grid(False)
    
    # Customize title and labels
    plt.title('Sequence Length Distribution', fontsize=14, color='white')
    plt.xlabel('Length (bp)', fontsize=12, color='white')
    plt.ylabel('Number of Sequences', fontsize=12, color='white')
    
    # Customize KDE line
    if ax.lines:  # If KDE line exists
        ax.lines[0].set_color('white')
    
    # Add mean line
    if lengths:
        mean_length = np.mean(lengths)
        plt.axvline(
            mean_length, 
            color='#2a9d8f', 
            linestyle='dashed', 
            linewidth=2
        )
        
        # Well-positioned mean text
        plt.text(
            0.98, 
            0.98,  # 98% of width and height
            f'Mean: {mean_length:.0f} bp', 
            color='#2a9d8f', 
            fontsize=12,
            transform=plt.gca().transAxes,  # Relative coordinates
            horizontalalignment='right',    # Align right
            verticalalignment='top',        # Align top
            bbox=dict(
                facecolor='black', 
                alpha=0.5, 
                edgecolor='none', 
                boxstyle='round,pad=0.3'
            )
        )
    
    # Remove unnecessary spines
    sns.despine(left=True, bottom=True)
    
    # Customize visible spines
    for spine in ['left', 'bottom']:
        ax.spines[spine].set_color('white')
        ax.spines[spine].set_linewidth(0.5)
    
    # Save to buffer with transparent background
    buffer = BytesIO()
    plt.savefig(
        buffer, 
        format='png', 
        bbox_inches='tight', 
        dpi=100, 
        transparent=True  # Transparent background
    )
    plt.close()
    
    # Convert to base64 for embedding in HTML
    img_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{img_data}"

def generate_phylogenetic_tree_with_distances(sequences):
    """Generates a phylogenetic tree and returns both the image and the distance matrix"""
    try:
        print("Starting phylogenetic tree generation...")
        print(f"Current working directory: {os.getcwd()}")
        print(f"MUSCLE path: {MUSCLE_PATH}")
        print(f"Absolute MUSCLE path: {os.path.abspath(MUSCLE_PATH)}")
        
        # Validate MUSCLE exists
        if not os.path.exists(MUSCLE_PATH):
            print(f"ERROR: MUSCLE not found at {MUSCLE_PATH}")
            print("Current directory contents:")
            for item in os.listdir('.'):
                print(f"  - {item}")
            if os.path.exists('bin'):
                print("bin directory contents:")
                for item in os.listdir('bin'):
                    print(f"  - bin/{item}")
            return generate_simple_phylogenetic_tree(sequences)
        
        # Create temporary FASTA file
        input_file = os.path.join(UPLOAD_FOLDER, 'temp_input.fasta')
        aligned_file = os.path.join(UPLOAD_FOLDER, 'temp_aligned.fasta')
        
        print("Writing sequences to temporary file...")
        # Validate and clean sequences before writing
        valid_sequences = []
        for i, seq_data in enumerate(sequences):
            sequence = seq_data['sequence'].upper().strip()
            title = seq_data['title'].strip()
            
            # Validate sequence is not empty
            if not sequence:
                print(f"WARNING: Sequence '{title}' is empty, skipping...")
                continue
                
            # Clean title to avoid MUSCLE issues
            clean_title = title.replace(' ', '_').replace('|', '_').replace(':', '_').replace(';', '_')
            if not clean_title:
                clean_title = f"Seq_{i+1}"
                
            valid_sequences.append({'title': clean_title, 'sequence': sequence})
        
        if len(valid_sequences) < 2:
            print("ERROR: At least 2 valid sequences are required")
            return generate_simple_phylogenetic_tree(sequences)
        
        # Write sequences in FASTA format
        with open(input_file, 'w') as f:
            for seq_data in valid_sequences:
                f.write(f">{seq_data['title']}\n{seq_data['sequence']}\n")
                
        print(f"FASTA file created with {len(valid_sequences)} valid sequences")
        
        print(f"Running MUSCLE: {MUSCLE_PATH}")
        # MUSCLE 5.3 uses syntax: -align input -output output
        muscle_cline = f'"{MUSCLE_PATH}" -align "{input_file}" -output "{aligned_file}"'
        print(f"Full command: {muscle_cline}")
        
        result = subprocess.run(muscle_cline, shell=True, capture_output=True, text=True, timeout=120)
        
        print(f"MUSCLE return code: {result.returncode}")
        if result.stderr:
            print(f"MUSCLE stderr: {result.stderr}")
        if result.stdout:
            print(f"MUSCLE stdout: {result.stdout}")
            
        # Check if output file was created and has content
        if os.path.exists(aligned_file):
            file_size = os.path.getsize(aligned_file)
            print(f"Aligned file created: {aligned_file} ({file_size} bytes)")
            if file_size == 0:
                print("WARNING: Aligned file is empty")
                return generate_simple_phylogenetic_tree(sequences)
        else:
            print(f"ERROR: Aligned file not created: {aligned_file}")
            return generate_simple_phylogenetic_tree(sequences)
        
        if result.returncode != 0:
            print("MUSCLE ended with error, using alternative method...")
            return generate_simple_phylogenetic_tree(sequences)
        
        print("Reading alignment...")
        # Read alignment
        try:
            alignment = AlignIO.read(aligned_file, 'fasta')
            print(f"Alignment read: {len(alignment)} sequences")
        except Exception as e:
            print(f"Error reading alignment: {e}")
            return generate_simple_phylogenetic_tree(sequences)
        
        # Calculate distances and tree
        print("Calculating distances...")
        calculator = DistanceCalculator('identity')
        dm = calculator.get_distance(alignment)
        constructor = DistanceTreeConstructor()
        tree = constructor.nj(dm)
        
        # Convert distance matrix to usable format
        seq_names = [seq['title'] for seq in sequences]
        distance_dict = {}
        
        for i, name1 in enumerate(seq_names):
            for j, name2 in enumerate(seq_names):
                if i < j:  # Only calculate unique distances (upper triangle)
                    distance = dm[i, j]
                    distance_dict[f"{name1}|{name2}"] = round(distance, 4)
        
        print("Generating tree image...")
        # Generate tree image with themed background
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Create a gradient background matching the page theme
        # Using your theme colors: dark tones with red/green accents
        from matplotlib.colors import LinearSegmentedColormap
        
        # Define gradient colors (from your CSS theme)
        colors = ['#1a1a1a', '#2a2a2a', '#1e1e1e']  # Dark tones
        n_bins = 100
        cmap = LinearSegmentedColormap.from_list('custom', colors, N=n_bins)
        
        # Create gradient background
        gradient = np.linspace(0, 1, 256).reshape(1, -1)
        gradient = np.vstack((gradient, gradient))
        ax.imshow(gradient, aspect='auto', cmap=cmap, alpha=0.8,
                 extent=[ax.get_xlim()[0], ax.get_xlim()[1], 
                        ax.get_ylim()[0], ax.get_ylim()[1]])
        
        # Draw the tree (keep default colors)
        Phylo.draw(tree, do_show=False, axes=ax)
        
        # Customize the title
        plt.title('Phylogenetic Tree', color='white', fontsize=16, 
                 fontweight='bold', pad=20)
        
        # Make axes transparent but keep background
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['bottom'].set_visible(False)
        ax.spines['left'].set_visible(False)
        ax.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)
        
        # Adjust margins
        plt.tight_layout()
        
        # Save as base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100, 
                   facecolor='#1a1a1a', edgecolor='none')
        plt.close()
        
        # Clean up temporary files
        try:
            if os.path.exists(input_file):
                os.remove(input_file)
            if os.path.exists(aligned_file):
                os.remove(aligned_file)
        except:
            pass
        
        img_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        tree_img = f"data:image/png;base64,{img_data}"
        
        print("Phylogenetic tree generated successfully!")
        return tree_img, distance_dict
        
    except Exception as e:
        print(f"Error generating phylogenetic tree: {e}")
        import traceback
        traceback.print_exc()
        return generate_simple_phylogenetic_tree(sequences)

def generate_simple_phylogenetic_tree(sequences):
    """Generates a simple phylogenetic tree without MUSCLE using Hamming distances"""
    try:
        print("Generating simple phylogenetic tree...")
        
        # Calculate simple Hamming distances
        distance_dict = {}
        seq_names = [seq['title'] for seq in sequences]
        
        # Create distance matrix manually
        distance_matrix = []
        for i, seq1 in enumerate(sequences):
            row = []
            for j, seq2 in enumerate(sequences):
                if i == j:
                    distance = 0.0
                else:
                    # Calculate simple Hamming distance
                    s1, s2 = seq1['sequence'], seq2['sequence']
                    min_len = min(len(s1), len(s2))
                    max_len = max(len(s1), len(s2))
                    
                    if min_len == 0:
                        distance = 1.0
                    else:
                        differences = sum(1 for k in range(min_len) if s1[k] != s2[k])
                        differences += abs(len(s1) - len(s2))  # Penalize length differences
                        distance = differences / max_len
                
                row.append(distance)
                
                # Save in dict for JavaScript
                if i < j:
                    distance_dict[f"{seq1['title']}|{seq2['title']}"] = round(distance, 4)
            
            distance_matrix.append(row)
        
        # Create simple alignment (without real alignment)
        from Bio.Align import MultipleSeqAlignment
        from Bio.SeqRecord import SeqRecord
        from Bio.Seq import Seq
        
        # Create records for BioPython
        records = []
        max_length = max(len(seq['sequence']) for seq in sequences)
        
        for seq in sequences:
            # Pad sequences to same length
            padded_seq = seq['sequence'].ljust(max_length, '-')
            clean_title = seq['title'].replace(' ', '_').replace('|', '_')
            record = SeqRecord(Seq(padded_seq), id=clean_title)
            records.append(record)
        
        alignment = MultipleSeqAlignment(records)
        
        # Use BioPython to create the tree
        calculator = DistanceCalculator('identity')
        dm = calculator.get_distance(alignment)
        constructor = DistanceTreeConstructor()
        tree = constructor.nj(dm)
        
        # Generate tree image
        plt.figure(figsize=(10, 6), facecolor='none')
        plt.style.use('dark_background')
        
        # Set all colors to white
        plt.rcParams.update({
            'axes.edgecolor': 'white',
            'axes.labelcolor': 'white', 
            'xtick.color': 'white',
            'ytick.color': 'white',
            'text.color': 'white',
            'lines.color': 'white',
            'patch.edgecolor': 'white'
        })
        
        # Draw tree
        ax = plt.gca()
        Phylo.draw(tree, do_show=False, axes=ax)
        
        # Force all lines to white
        for line in ax.lines:
            line.set_color('white')
            line.set_linewidth(2)
        
        # Force all text to white
        for text in ax.texts:
            text.set_color('white')
            text.set_fontsize(10)
        
        plt.title('Phylogenetic Tree (Simple Distances)', color='white', fontsize=14, pad=20)
        
        # Make background transparent
        ax.set_facecolor('none')
        for spine in ax.spines.values():
            spine.set_visible(False)
        
        # Save as base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100, transparent=True)
        plt.close()
        
        img_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        tree_img = f"data:image/png;base64,{img_data}"
        
        print("Simple phylogenetic tree generated successfully!")
        return tree_img, distance_dict
        
    except Exception as e:
        print(f"Error in simple phylogenetic tree: {e}")
        import traceback
        traceback.print_exc()
        return None, None

# New route to get specific distance
@app.route('/get_distance', methods=['POST'])
def get_distance():
    data = request.get_json()
    seq1 = data.get('seq1')
    seq2 = data.get('seq2')
    distance_matrix = data.get('distance_matrix', {})
    
    # Look for the distance in both directions
    key1 = f"{seq1}|{seq2}"
    key2 = f"{seq2}|{seq1}"
    
    distance = distance_matrix.get(key1) or distance_matrix.get(key2)
    
    if distance is not None:
        return jsonify({'distance': distance})
    else:
        return jsonify({'distance': 0.0})  # Same sequence

# New route to export FASTA
@app.route('/export_fasta', methods=['POST'])
def export_fasta():
    from flask import make_response
    from datetime import datetime
    
    try:
        data = request.get_json()
        sequences = data.get('sequences', [])
        
        if not sequences:
            return jsonify({'error': 'No sequences to export'}), 400
        
        # Generate FASTA content
        fasta_content = ""
        for seq in sequences:
            title = seq.get('title', 'Unnamed_sequence')
            sequence = seq.get('sequence', '')
            
            if sequence:
                fasta_content += f">{title}\n{sequence}\n"
        
        if not fasta_content:
            return jsonify({'error': 'No valid sequences to export'}), 400
        
        # Create response with file
        response = make_response(fasta_content)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"genomics_freedom_export_{timestamp}.fasta"
        
        # Set headers for download
        response.headers['Content-Type'] = 'text/plain'
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.headers['Content-Length'] = len(fasta_content)
        
        return response
        
    except Exception as e:
        print(f"Error in FASTA export: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    
if __name__ == '__main__':
    app.run(debug=True)


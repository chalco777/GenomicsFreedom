# GenomicsFreedom

GenomicsFreedom is an interactive web application built with **Flask** for exploring and visualizing genomic sequences. The project combines basic analyses (length, GC content, base distribution) with tools for multiple alignment, phylogenetic tree generation, and motif search, all within a modern interface.

---

## 🚀 Features

### 1. Flexible Sequence Input
- Manual entry of multiple sequences through dynamic forms.
- FASTA file upload with live preview in the browser.

![Input Panel](path/to/screenshots/input-panel.png)

> Replace with a screenshot of the landing page showing manual sequence fields and the FASTA file preview.

### 2. Global Statistics
- Total number of sequences and bases.
- Average GC content and nucleotide distribution.
- Length histogram generated with Matplotlib/Seaborn.

![Global Statistics Panel](path/to/screenshots/global-stats.png)

> Replace with a screenshot of the “Global Statistics” panel displaying the base distribution and the histogram.

### 3. Per‑Sequence Statistics
- Individual length, base composition, and GC/AT percentages.
- Interactive selector with comparative summary across sequences.

![Per-Sequence Statistics Panel](path/to/screenshots/per-sequence.png)

> Replace with a screenshot of the “Per‑Sequence Statistics” panel showing the dropdown and summary cards.

### 4. Sequence Visualization & Export
- Color‑coded rendering of nucleotide sequences.
- Export all sequences to FASTA or copy to clipboard with one click.

![Sequence Visualization Panel](path/to/screenshots/visualization.png)

> Replace with a screenshot of the “Sequence Visualization” panel with the export and copy buttons.

### 5. Multiple Alignment & Similarity Matrix
- Alignment preview/full view/consensus sequence.
- Dynamic similarity matrix and alignment metrics (length, conserved positions, similarity score, gaps).

![Alignment Panel](path/to/screenshots/alignment.png)

> Replace with a screenshot of the “Multiple Alignment” panel including the similarity matrix.

### 6. Phylogenetic Tree & Distance Calculator
- MUSCLE integration for high‑quality alignments or fallback to a Hamming‑based tree.
- Interactive calculator for pairwise genetic distances.

![Phylogenetic Tree Panel](path/to/screenshots/phylo-tree.png)

> Replace with a screenshot of the phylogenetic tree panel and the distance calculator.

### 7. Motif Search
- Search for custom motifs across all sequences with positional context.

![Motif Search Panel](path/to/screenshots/motif-search.png)

> Replace with a screenshot of the motif search panel showing a query example.

---

## 🛠 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your_user/GenomicsFreedom.git
   cd GenomicsFreedom
   ```
2. **Create a virtual environment (optional but recommended)**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate

   ```
3. **Install dependencies**
  ```bash
  pip install -r requirements.txt
  ```  
4. **Verify MUSCLE**
* The app expects muscle.exe in bin/.
* On Linux/Mac, install MUSCLE and adjust MUSCLE_PATH in app.py if needed.
* If MUSCLE is unavailable, a simplified distance‑based tree is generated.

## ▶️ Usage

1. Launch the application:
  ```bash
  python app.py
  ```
2. Visit http://localhost:5000/ in your browser.
3. Enter sequences manually or upload a FASTA file.
4. Click “Run Analysis” to generate statistics and visualizations.
5. Explore the results dashboard: visualization, alignment, distance calculator, motif search, etc.

## 📂 Project Structure
```
GenomicsFreedom/
├── app.py               # Main Flask application
├── bin/
│   └── muscle.exe       # MUSCLE binary for multiple alignment
├── requirements.txt     # Python dependencies
├── seq_test/
│   └── seq.fasta        # Example sequences
├── static/
│   ├── css/
│   │   ├── styles.css   # Global styles
│   │   └── results.css  # Result‑specific styles
│   └── js/
│       ├── main.js      # Scripts for index page
│       └── results.js   # Scripts for results page
└── templates/
    ├── index.html       # Entry form
    └── results.html     # Results dashboard
```
## 🧰 Technologies
* Flask
* Biopython
* NumPy
* Matplotlib & Seaborn
* HTML5, CSS3, JavaScript
* MUSCLE

## 🤝 Contributing
Contributions are welcome! Open an issue or submit a pull request with your ideas for new features, performance improvements or bug fixes.

Enjoy exploring genomic sequences with GenomicsFreedom!

### Citations
- Sequence input handling (manual and FASTA)​:codex-file-citation[codex-file-citation]{line_range_start=48 line_range_end=67 path=app.py git_url="https://github.com/chalco777/GenomicsFreedom/blob/main/app.py#L48-L67"}​
- Global statistics and histogram generation​:codex-file-citation[codex-file-citation]{line_range_start=88 line_range_end=97 path=app.py git_url="https://github.com/chalco777/GenomicsFreedom/blob/main/app.py#L88-L97"}​​:codex-file-citation[codex-file-citation]{line_range_start=35 line_range_end=80 path=templates/results.html git_url="https://github.com/chalco777/GenomicsFreedom/blob/main/templates/results.html#L35-L80"}​
- Per-sequence statistics panel​:codex-file-citation[codex-file-citation]{line_range_start=84 line_range_end=132 path=templates/results.html git_url="https://github.com/chalco777/GenomicsFreedom/blob/main/templates/results.html#L84-L132"}​
- Sequence visualization with export options​:codex-file-citation[codex-file-citation]{line_range_start=135 line_range_end=165 path=templates/results.html git_url="https://github.com/chalco777/GenomicsFreedom/blob/main/templates/results.html#L135-L165"}​​:codex-file-citation[codex-file-citation]{line_range_start=528 line_range_end=564 path=app.py git_url="https://github.com/chalco777/GenomicsFreedom/blob/main/app.py#L528-L564"}​
- Multiple alignment and similarity matrix​:codex-file-citation[codex-file-citation]{line_range_start=168 line_range_end=247 path=templates/results.html git_url="https://github.com/chalco777/GenomicsFreedom/blob/main/templates/results.html#L168-L247"}​
- Phylogenetic tree and distance calculator​:codex-file-citation[codex-file-citation]{line_range_start=99 line_range_end=105 path=app.py git_url="https://github.com/chalco777/GenomicsFreedom/blob/main/app.py#L99-L105"}​​:codex-file-citation[codex-file-citation]{line_range_start=250 line_range_end=299 path=templates/results.html git_url="https://github.com/chalco777/GenomicsFreedom/blob/main/templates/results.html#L250-L299"}​
- Motif search panel​:codex-file-citation[codex-file-citation]{line_range_start=302 line_range_end=309 path=templates/results.html git_url="https://github.com/chalco777/GenomicsFreedom/blob/main/templates/results.html#L302-L309"}​
- Project dependencies (Flask, Biopython, NumPy, Matplotlib)​:codex-file-citation[codex-file-citation]{line_range_start=1 line_range_end=4 path=requirements.txt git_url="https://github.com/chalco777/GenomicsFreedom/blob/main/requirements.txt#L1-L4"}​



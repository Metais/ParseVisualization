const handleError = (error) => console.error('Error:', error);

// Load UMAP data and visualize the plot
fetch('data/umap_cluster.json')
    .then(response => response.json())
    .then(data => {
        let umapX = [];
        let umapY = [];
        let clusters = [];
        let cellId = [];

        // Iterate over the keys (Cell_IDs) in the data
        for (const cell in data) {
            if (data.hasOwnProperty(cell)) {
                umapX.push(data[cell].UMAP1);
                umapY.push(data[cell].UMAP2);
                clusters.push(data[cell].Cluster);
                cellId.push(cell); // Using the key as Cell_ID
            }
        }

        // Create a unique set of cluster labels for coloring
        const uniqueClusters = [...new Set(clusters)].sort((a, b) => a - b);

        // Create a color map for the clusters (discrete colors)
        const colorMap = {};
        uniqueClusters.forEach((cluster, index) => {
            colorMap[cluster] = `hsl(${index * (360 / uniqueClusters.length)}, 70%, 50%)`;  // Generating a distinct color
        });

        // Prepare traces for each cluster (to show in the legend)
        const traces = uniqueClusters.map(cluster => {
            const traceData = clusters.reduce((acc, c, i) => {
                if (c === cluster) {
                    acc.x.push(umapX[i]);
                    acc.y.push(umapY[i]);
                    acc.text.push(`Cluster: ${clusters[i]}\nCell Id: ${cellId[i]}`);
                }
                return acc;
            }, { x: [], y: [], text: [] });
        
            return {
                x: traceData.x,
                y: traceData.y,
                mode: 'markers',
                marker: {
                    color: colorMap[cluster],
                    size: 6,
                    line: {
                        width: 0.5,
                        color: '#000'
                    }
                },
                name: `Cluster ${cluster}`,
                text: traceData.text,
                hovertemplate: '%{text}<extra></extra>',
                hoverinfo: 'text'
            };
        });

        const layout = {
            title: 'UMAP Cluster Visualization (Downsampled)',
            xaxis: { title: 'UMAP1' },
            yaxis: { title: 'UMAP2' },
            showlegend: true,
            legend: { title: { text: 'Clusters' } },
            height: 600,
            width: 800,
            hovermode: 'closest'  // Ensures that only the closest point’s info is shown
        };

        // Plot all traces
        Plotly.newPlot('umap-plot', traces, layout);

        // Fetch the cell_gene_expression.json file
        fetch('data/cell_gene_expression.json')
            .then(response => response.json())
            .then(cellGeneData => {
                // Function to handle cell ID input
                document.getElementById('cell-id-input').addEventListener('change', function() {
                    const cellId = this.value;
                    const genes = cellGeneData[cellId];
                    const clusterInfo = data[cellId];

                    // Clear previous table rows
                    const tbody = document.querySelector('#cell-table tbody');
                    tbody.innerHTML = '';

                    // Display cluster information
                    const clusterDisplay = document.getElementById('cell-cluster-info');
                    if (clusterInfo) {
                        clusterDisplay.innerText = `Cluster: ${clusterInfo.Cluster}`;
                    } else {
                        clusterDisplay.innerText = 'Cluster: Not found';
                    }

                    // Populate gene expression table if the cell is found
                    if (genes) {
                        genes.forEach(([geneName, score]) => {
                            const row = tbody.insertRow();
                            row.insertCell(0).innerText = geneName;
                            row.insertCell(1).innerText = (score / 100).toFixed(2) + '%'; // Convert to percentage
                        });
                    } else {
                        // alert('Cell ID not found.');
                    }
                });
            })
            .catch(handleError);  // Handle error for umap_cluster fetch
    })
    .catch(handleError);

// Load gene data and populate the drop-down menu
fetch('data/top_100_genes_per_cluster_sample_1.json')
    .then(response => response.json())
    .then(geneData => {
        const clusterSelect = document.getElementById('cluster-select');
        
        clusterSelect.innerHTML = Object.keys(geneData)
            .map(cluster => `<option value="${cluster}">Cluster ${cluster}</option>`)
            .join('');

        // Handle cluster selection change
        clusterSelect.addEventListener('change', function() {
            const selectedCluster = this.value;
            const tableBody = document.querySelector('#gene-table tbody');
            tableBody.innerHTML = ''; // Clear previous rows

            if (selectedCluster) {
                const genes = geneData[selectedCluster];
                genes.forEach(gene => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${gene.gene_name}</td>
                        <td>${gene.score.toFixed(2)}</td>
                        <td>${gene.log2_FC.toFixed(2)}</td>
                        <td>${(gene.pct1 * 100).toFixed(2)}%</td>
                        <td>${(gene.pct2 * 100).toFixed(2)}%</td>
                        <td>${gene.pval_adj}</td>
                    `;
                    tableBody.appendChild(row);
                });
            }
        });
    })
    .catch(handleError);

//****************** Gene selection part ******************/
// Load the gene expression data
let geneExpressionData;

fetch('data/gene_cell_expression.json')
    .then(response => response.json())
    .then(data => {
        geneExpressionData = data; // Store the data
    });

// Function to populate the table
function populateGeneTable(gene) {
    const tableBody = document.querySelector('#gene-expression-table tbody');
    tableBody.innerHTML = ''; // Clear the previous rows

    if (geneExpressionData.hasOwnProperty(gene)) {
        const cells = geneExpressionData[gene];
        
        for (const [cellId, expressionValue] of Object.entries(cells)) {
            const row = document.createElement('tr');
            
            const cellIdCell = document.createElement('td');
            cellIdCell.textContent = cellId;
            
            const expressionCell = document.createElement('td');
            const expressionValuePercent = expressionValue / 100
            expressionCell.textContent = expressionValuePercent.toFixed(2); // Format the value
            
            row.appendChild(cellIdCell);
            row.appendChild(expressionCell);
            
            tableBody.appendChild(row);
        }
    } else {
        // Display message if gene not found
        const row = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.colSpan = 2;
        noDataCell.textContent = 'Gene not found';
        row.appendChild(noDataCell);
        tableBody.appendChild(row);
    }
}

// Event listener for the submit button
document.getElementById('gene-submit').addEventListener('click', () => {
    const geneInput = document.getElementById('gene-input').value.trim().toUpperCase();
    if (geneInput) {
        populateGeneTable(geneInput);
    }
});

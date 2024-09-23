const handleError = (error) => console.error('Error:', error);

async function loadData() {
    try {
        const [response1, response2, response3, response4, response5, response6] = await Promise.all([
            fetch('data/umap_cluster.json'),
            fetch('data/cell_cluster_mapping_sample1.json'),
            fetch('data/gene_baseline_expr_sample1.json'),
            fetch('data/top_100_genes_per_cluster_sample_1.json'),
            fetch('data/cell_gene_expression.json'),
            fetch('data/gene_cell_expression.json')
        ]);

        const umapData = await response1.json();
        const cellClusterData = await response2.json();
        const geneBaselineData = await response3.json();
        const top100GenesPerClusterData = await response4.json();
        const cellToGeneData = await response5.json();
        const geneToCellData = await response6.json();

        return { umapData, cellClusterData, geneBaselineData, top100GenesPerClusterData, cellToGeneData, geneToCellData}
    } catch (error) {
        console.error('Error loading JSON files:', error);
    }
}

function plotData(umapData, cellClusterData) {
    let clusters = [];
    let cellId = [];

    for (const cell in umapData) {
        cellId.push(Number(cell)); 
    }
    for (const cell in cellClusterData) {
        clusters.push(cellClusterData[cell])
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
        // Collect the indices of cells in the downsampled cellId that belong to the current cluster
        const traceData = cellId
            .filter(id => {
                return clusters[id] === cluster; // Check if the cluster matches
            })
            .map(id => {
                return {
                    x: umapData[id].UMAP1,
                    y: umapData[id].UMAP2,
                    text: `Cluster: ${clusters[id]}\nCell Id: ${id}`
                };
            });

        return {
            x: traceData.map(d => d.x),
            y: traceData.map(d => d.y),
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
            text: traceData.map(d => d.text),
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
}

function topNGenesPerClusterTable(top100GenesPerClusterData) {
    const clusterSelect = document.getElementById('cluster-select');
        
    clusterSelect.innerHTML = Object.keys(top100GenesPerClusterData)
        .map(cluster => `<option value="${cluster}">Cluster ${cluster}</option>`)
        .join('');

    // Handle cluster selection change
    clusterSelect.addEventListener('change', function() {
        const selectedCluster = this.value;
        const tableBody = document.querySelector('#gene-table tbody');
        tableBody.innerHTML = ''; // Clear previous rows

        if (selectedCluster) {
            const genes = top100GenesPerClusterData[selectedCluster];
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
}

function cellToGeneTable(cellToGeneData, cellClusterData) {
    // Function to handle cell ID input
    document.getElementById('cell-id-input').addEventListener('change', function() {
        const cellId = this.value;
        const genes = cellToGeneData[cellId];
        const clusterInfo = cellClusterData[cellId];

        // Clear previous table rows
        const tbody = document.querySelector('#cell-table tbody');
        tbody.innerHTML = '';

        // Display cluster information
        const clusterDisplay = document.getElementById('cell-cluster-info');
        if (clusterInfo) {
            clusterDisplay.innerText = `Cluster: ${clusterInfo}`;
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
}

function geneToCellTable(geneToCellData) {
    // Event listener for the submit button
    document.getElementById('gene-submit').addEventListener('click', () => {
        const geneInput = document.getElementById('gene-input').value.trim().toUpperCase();
        if (geneInput) {
            const tableBody = document.querySelector('#gene-expression-table tbody');
            tableBody.innerHTML = ''; // Clear the previous rows

            if (geneToCellData.hasOwnProperty(geneInput)) {
                const cells = geneToCellData[geneInput];
                
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
    });
}

loadData().then(({ umapData, cellClusterData, geneBaselineData, top100GenesPerClusterData, cellToGeneData, geneToCellData }) => {
    plotData(umapData, cellClusterData);

    topNGenesPerClusterTable(top100GenesPerClusterData);
    
    cellToGeneTable(cellToGeneData, cellClusterData);

    geneToCellTable(geneToCellData);
});


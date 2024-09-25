const handleError = (error) => console.error('Error:', error);

// Hard-coded cell types and their corresponding marker genes
const cellTypesWithMarkers = {
    "CD14 Mono": ["CD14", "VCAN", "CCR2", "TLR4", "TREM1", "NLRP3", "NLRP12", "CD36", "SIGLEC1", "OLR1", "SIRPA", "CD163"],
    "CD4 Naive": ["SELL", "IL2RA", "CCR7", "CD4"],  // CD4 naive vs CD8 naive have near-identical expr profiles, look at these specific ones
    "CD4 Memory": ["CD27", "CD44", "IL7R", "TCF7", "BCL2", "LEF1", "CCR7", "TRAT1"],
    "CD8 Memory": ["KLRG1", "CX3CR1"],
    "CD8 Naive": ["SELL", "IL2RA", "CCR7", "CD8A", "CD8B", "GNLY"],
    "NK": ["GNLY", "NKG7"],
    "CD16 Mono": ["FCGR3A", "MS4A7"],
    "B Naive": ["MS4A1", "SIGLEC2", "CD40", "CXCR5"],
    "T reg": ["FOXP3", "IL2RA", "CTLA4", "CCR4", "CCR6", "GATA3"],
    "NKT": ["CD3D", "TRAV1-2", "KLRB1"],
    "cDC2": ["CD1C"],
    "B Intermediate": ["CD19", "CD27", "MS4A1"],
    "NK CD56bright": ["NCAM1", "XCL1", "XCL2"],
    "MAIT": ["SLC4A10", "KLRB1", "TRAV1-2"],
    "B Memory": ["MS4A1", "CD27", "CD38"],
    "Gamma Delta T": ["TRDC", "TRGC2"],
    "pDC": ["LILRA4", "IL3RA", "CLEC4C"],
    "Proliferating": ["MKI67"],
    "HSPC": ["CD34"],
    "Plasmablast": ["PRDM1", "XBP1", "MZB1"],
    "cDC1": ["CLEC9A"],
    "ILC": ["KIT", "KLRB1", "IL7R"]
};

var geneSelected = false;
var umapDataVar = '';
var cellClusterDataVar = '';

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

function plotData(umapData, cellClusterData, expressionData) {
    // Clear any previous traces
    Plotly.purge('umap-plot');  // Remove all previous traces and clear the plot area

    const currentTraces = Plotly.d3.select('#umap-plot').selectAll('.trace');

    let clusters = [];
    let cellId = [];
    const hasExpressionData = Object.keys(expressionData).length > 0;

    // Only take a portion of cells (when looking at cluster)
    let i = 0;
    for (const cell in umapData) {
        if (cell in expressionData) {
            cellId.push(Number(cell)); 
        }
        else if (i % 5 === 0) {
            cellId.push(Number(cell)); 
        }
        i++;
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

    // Prepare traces for each cluster (background cells)
    const backgroundTraces = uniqueClusters.map(cluster => {
        const traceData = cellId
            .filter(id => clusters[id] === cluster)  // Match cells to the current cluster
            .map(id => ({
                x: umapData[id].UMAP1,
                y: umapData[id].UMAP2,
                text: `Cluster: ${clusters[id]}\nCell Id: ${id}`,
                expression: expressionData[id] || 0  // Include expression data, default to 0 if missing
            }));

        return {
            x: traceData.map(d => d.x),
            y: traceData.map(d => d.y),
            mode: 'markers',
            marker: {
                color: colorMap[cluster],  // Background color
                size: 4,
                opacity: hasExpressionData ? 0.05 : 1,  // Almost invisible if expressionData available
            },
            name: `Cluster ${cluster}`,
            text: traceData.map(d => d.text),
            hovertemplate: '%{text}<extra></extra>',
            hoverinfo: 'text',
            showlegend: !hasExpressionData
        };
    });

    // Create a trace for cells with non-zero expression values
    const highlightTrace = {
        x: [],
        y: [],
        mode: 'markers',
        marker: {
            color: [],
            colorscale: 'Viridis',  // Choose a color scale for expression values
            size: 6,
            opacity: 1,
            colorbar: {
                title: 'Log2 Expression',
                thickness: 8,  // Reduced thickness
                len: 0.8,  // Adjust length of the color bar
                xanchor: 'left',
                titleside: 'right',
                x: 1.05,  // Positioning to the right of the plot
                y: 0.5,  // Center vertically
                ypad: 10  // Padding to ensure it doesn't overlap the legend
            }
        },
        text: [],
        hovertemplate: '%{text}<br>Log2 Expression: %{marker.color:.2f}<extra></extra>',
        hoverinfo: 'text',
        showlegend: false
    };

    // Iterate through expressionData to populate the highlight trace
    for (const cell in expressionData) {
        const exprValue = expressionData[cell];
        if (exprValue > 0) {  // Only include non-zero expression values
            highlightTrace.x.push(umapData[cell].UMAP1);
            highlightTrace.y.push(umapData[cell].UMAP2);
            highlightTrace.marker.color.push(Math.log2(exprValue + 1));  // Log-scale the expression value
            highlightTrace.text.push(`Cell Id: ${cell}\nCluster: ${cellClusterData[cell]}`);
        }
    }

    const layout = {
        title: 'UMAP Cluster Visualization (Downsampled)',
        xaxis: { title: 'UMAP1' },
        yaxis: { title: 'UMAP2' },
        showlegend: true,
        legend: { title: { text: hasExpressionData ? '' : 'Clusters' } },
        height: 600,
        width: 800,
        hovermode: 'closest'  // Ensures that only the closest point’s info is shown
    };

    // Plot both the background cells and the highlighted cells
    const allTraces = [...backgroundTraces, highlightTrace];
    console.log("Traces before plotting:", Plotly.d3.select('#umap-plot').selectAll('.trace').data());
    Plotly.newPlot('umap-plot', allTraces, layout);
    console.log("Traces before plotting:", Plotly.d3.select('#umap-plot').selectAll('.trace').data());
}

function topNGenesPerClusterTable(top100GenesPerClusterData, cellClusterData) {
    const clusterSelect = document.getElementById('cluster-select');

    let clusterCellCount = {}
    for (let key in cellClusterData) {
        let value = cellClusterData[key]
        clusterCellCount[value] = (clusterCellCount[value] || 0) + 1;
    }
        
    clusterSelect.innerHTML = `<option value="">Select Cluster</option>` + 
        Object.keys(top100GenesPerClusterData)
        .map(cluster => `<option value="${cluster}">Cluster ${cluster}</option>`)
        .join('');

    // Handle cluster selection change
    clusterSelect.addEventListener('change', function() {
        const selectedCluster = this.value;

        // Display cluster information
        const cellNumDisplay = document.getElementById('cluster-cellnum-info');
        if (selectedCluster) {
            cellNumDisplay.innerText = `Number of cells in cluster: ${clusterCellCount[selectedCluster]}`;
        } else {
            cellNumDisplay.innerText = 'Cluster: Not found';
        }

        const tableBody = document.querySelector('#cluster-table tbody');
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
            let index = 1;  // Initialize a 1-based index
            Object.entries(genes).forEach(([geneName, relativeExpression]) => {
                const row = tbody.insertRow();
                row.insertCell(0).innerText = index;  // Use index for gene ranking
                row.insertCell(1).innerText = geneName;
                row.insertCell(2).innerText = relativeExpression;
                index++;  // Increment index for each gene
            });
        } else {
            // alert('Cell ID not found.');
        }
    });
}

function geneToCellTable(geneToCellData, cellClusterData, umapData) {
    // Event listener for the submit button
    document.getElementById('gene-input').addEventListener('change', function() {
        const geneInput = document.getElementById('gene-input').value.trim().toUpperCase();
        if (geneInput) {
            const tableBody = document.querySelector('#gene-table tbody');
            tableBody.innerHTML = ''; // Clear the previous rows

            if (geneToCellData.hasOwnProperty(geneInput)) {
                const cells = geneToCellData[geneInput];
                
                for (const [rank, [cellId, cluster, expressionValue]] of Object.entries(cells)) {
                    const row = document.createElement('tr');
                    
                    const rankCell = document.createElement('td');
                    rankCell.textContent = Number(rank) + 1

                    const cellIdCell = document.createElement('td');
                    cellIdCell.textContent = cellId;

                    const clusterCell = document.createElement('td');
                    clusterCell.textContent = cluster;
                    
                    const expressionCell = document.createElement('td');
                    expressionCell.textContent = expressionValue
                    
                    row.appendChild(rankCell);
                    row.appendChild(cellIdCell);
                    row.appendChild(clusterCell);
                    row.appendChild(expressionCell);
                    
                    tableBody.appendChild(row);
                }

                const expressionData = cells.reduce((dict, cell) => {
                    dict[cell[0]] = cell[2]; // Dict of cellId: ExpressionValue
                    return dict;
                }, {});

                // Make a second plot, using the cells and their expression as input
                plotData(umapData, cellClusterData, expressionData)
                geneSelected = true;
            } else {
                // Display message if gene not found
                const row = document.createElement('tr');
                const noDataCell = document.createElement('td');
                noDataCell.colSpan = 4;
                noDataCell.textContent = 'Gene not found';
                row.appendChild(noDataCell);
                tableBody.appendChild(row);
            }
        }
    });
}

function cellTypeSection(top100GenesPerClusterData) {
    const tableBody = document.querySelector('#celltype-table tbody');
    tableBody.innerHTML = ''; // Clear any previous content

    const markerInputs = document.querySelectorAll('.marker-input');
    const updatedMarkers = {};

    // Gather the updated marker genes from the input table
    markerInputs.forEach(input => {
        const cellType = input.dataset.cellType;
        const markerGenes = input.value.split(',').map(g => g.trim());
        updatedMarkers[cellType] = markerGenes;
    });

    let lastCellType = null; // Track last cell type for row span

    Object.entries(updatedMarkers).forEach(([cellType, markerGenes]) => {
        markerGenes.forEach((markerGene, index) => {
            const clustersWithGene = findMarkerGeneInClusters(markerGene, top100GenesPerClusterData);
            let cellTypeMessage = (index === 0 && lastCellType !== cellType) ? cellType : '';
            if (clustersWithGene.length === 0) {
                // Handle "Not found" case
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${cellTypeMessage}</td>
                    <td>${markerGene}</td>
                    <td>Not found</td>
                    <td>-1</td>
                    <td>Not found</td>
                `;
                tableBody.appendChild(row);
            } else {
                let rowsWritten = 0
                clustersWithGene.forEach(clusterInfo => {
                    const row = document.createElement('tr');

                    // Remove the Cell Type column info after first row
                    rowsWritten++;
                    if (rowsWritten > 1) {
                        cellTypeMessage = '';
                    }

                    row.innerHTML = `
                        <td>${cellTypeMessage}</td>
                        <td>${markerGene}</td>
                        <td>${clusterInfo.cluster}</td>
                        <td>${clusterInfo.score.toFixed(2)}</td>
                        <td>${clusterInfo.pval_adj}</td>
                    `;
                    tableBody.appendChild(row);
                });
            }

            lastCellType = cellType; // Update last seen cell type
        });
    });
}

function clusterCellTypeSection(top100GenesPerClusterData) {
    const tableBody = document.querySelector('#cluster-celltype-table tbody');
    tableBody.innerHTML = ''; // Clear any previous content

    const markerInputs = document.querySelectorAll('.marker-input');
    const updatedMarkers = {};

    // Gather the updated marker genes from the input table
    markerInputs.forEach(input => {
        const cellType = input.dataset.cellType;
        const markerGenes = input.value.split(',').map(g => g.trim());
        updatedMarkers[cellType] = markerGenes;
    });

    // Create a mapping from clusters to cell types and marker genes
    const clusterToCellTypes = {};

    Object.entries(updatedMarkers).forEach(([cellType, markerGenes]) => {
        markerGenes.forEach(markerGene => {
            const clustersWithGene = findMarkerGeneInClusters(markerGene, top100GenesPerClusterData);

            if (clustersWithGene.length !== 0) {
                clustersWithGene.forEach(clusterInfo => {
                    // Add or update cell types per cluster
                    if (!clusterToCellTypes[clusterInfo.cluster]) {
                        clusterToCellTypes[clusterInfo.cluster] = [];
                    }
                    clusterToCellTypes[clusterInfo.cluster].push({
                        cellType,
                        markerGene,
                        score: clusterInfo.score,
                        pval_adj: clusterInfo.pval_adj
                    });
                });
            }
        });
    });

    // Now, iterate over the clusterToCellTypes object and populate the table
    Object.entries(clusterToCellTypes).forEach(([cluster, cellTypeData]) => {
        cellTypeData.forEach((data, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index === 0 ? cluster : ''}</td>
                <td>${data.cellType}</td>
                <td>${data.markerGene}</td>
                <td>${data.score.toFixed(2)}</td>
                <td>${data.pval_adj}</td>
            `;
            tableBody.appendChild(row);
        });
    });
}


// Populate the main cell type table based on the input from the marker editing table
function cellTypeTable(top100GenesPerClusterData) {
    // Switch between the marker editing table and the main cell type table
    document.getElementById('from-input-next-btn').addEventListener('click', () => {
        document.getElementById('marker-container').style.display = 'none';
        document.getElementById('celltype-container').style.display = 'block';

        cellTypeSection(top100GenesPerClusterData); // Call this with the actual data
    });

    document.getElementById('from-celltype-back-btn').addEventListener('click', () => {
        document.getElementById('celltype-container').style.display = 'none';
        document.getElementById('marker-container').style.display = 'block';
    });

    document.getElementById('from-celltype-next-btn').addEventListener('click', () => {
        document.getElementById('celltype-container').style.display = 'none';
        document.getElementById('cluster-celltype-container').style.display = 'block';

        clusterCellTypeSection(top100GenesPerClusterData);
    });

    document.getElementById('from-cluster-back-btn').addEventListener('click', () => {
        document.getElementById('celltype-container').style.display = 'block';
        document.getElementById('cluster-celltype-container').style.display = 'none';
    });

    // Initial population of marker table
    populateMarkerTable();
}

// Function to find the gene prevalence in clusters
function findMarkerGeneInClusters(markerGene, top100GenesPerClusterData) {
    const clustersWithGene = [];

    Object.values(top100GenesPerClusterData).forEach(clusterGenes => {
        clusterGenes.forEach(geneInfo => {
            if (geneInfo.gene_name === markerGene) {
                anyFound = true;
                clustersWithGene.push({
                    cluster: geneInfo.cluster,
                    score: geneInfo.score,
                    pval_adj: geneInfo.pval_adj
                });
            }
        });
    });

    return clustersWithGene;
}

// Populate the marker editing table
function populateMarkerTable() {
    const tableBody = document.querySelector('#marker-tbody');
    
    Object.entries(cellTypesWithMarkers).forEach(([cellType, markerGenes]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${cellType}</td>
            <td><input type="text" value="${markerGenes.join(', ')}" class="marker-input" data-cell-type="${cellType}"></td>
        `;
        tableBody.appendChild(row);
    });
}



loadData().then(({ umapData, cellClusterData, geneBaselineData, top100GenesPerClusterData, cellToGeneData, geneToCellData }) => {
    plotData(umapData, cellClusterData, []);

    topNGenesPerClusterTable(top100GenesPerClusterData, cellClusterData);
    
    cellToGeneTable(cellToGeneData, cellClusterData);

    geneToCellTable(geneToCellData, cellClusterData, umapData);

    cellTypeTable(top100GenesPerClusterData);

    document.getElementById("loading").remove();

    umapDataVar = umapData;
    cellClusterDataVar = cellClusterData;
});

document.addEventListener('DOMContentLoaded', function() {
    // Get all the radio buttons with name 'table-select'
    const radioButtons = document.querySelectorAll('input[name="Table Select"]');

    // Function to hide all tables
    function hideAllTables() {
        document.querySelectorAll('.table-container').forEach(table => {
            table.classList.remove('active');
        });
    }

    // Add an event listener to each radio button
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            hideAllTables();
            const selectedTable = this.value;
            document.getElementById(selectedTable).classList.add('active');

            // If a gene is highlighted in the plot and the table changes, go back to normal
            if (geneSelected) {
                plotData(umapDataVar, cellClusterDataVar, []);
                geneSelected = false;
            }
        });
    });

    // Initialize with the first table visible
    hideAllTables();
    document.getElementById('cluster-table-container').classList.add('active');
});

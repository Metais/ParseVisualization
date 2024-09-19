// Helper function to downsample data points by a factor of 10
function downsampleData(cluster, umapX, umapY, sampleFactor = 10, minThreshold = 10) {
    const indices = [];
    const clusterPoints = cluster.map((c, i) => ({ cluster: c, index: i }));

    // Separate by clusters
    const groupedByCluster = clusterPoints.reduce((acc, point) => {
        acc[point.cluster] = acc[point.cluster] || [];
        acc[point.cluster].push(point.index);
        return acc;
    }, {});

    const downsampled = [];

    Object.keys(groupedByCluster).forEach(clusterKey => {
        const points = groupedByCluster[clusterKey];
        const clusterSize = points.length;

        if (clusterSize > minThreshold) {
            // Reduce by a factor of 10
            for (let i = 0; i < clusterSize; i += sampleFactor) {
                downsampled.push(points[i]);
            }
        } else {
            // Keep all points if below the threshold
            downsampled.push(...points);
        }
    });

    return downsampled;
}

// Load UMAP data and visualize the plot
fetch('data/umap_cluster_data.json')
    .then(response => response.json())
    .then(data => {
        let umapX = data.map(d => d.UMAP1);
        let umapY = data.map(d => d.UMAP2);
        let clusters = data.map(d => d.Cluster);

        // Downsample data by a factor of 10, unless a cluster has fewer than 10 points
        const sampledIndices = downsampleData(clusters, umapX, umapY);
        umapX = sampledIndices.map(i => umapX[i]);
        umapY = sampledIndices.map(i => umapY[i]);
        clusters = sampledIndices.map(i => clusters[i]);

        // Create a unique set of cluster labels for coloring
        const uniqueClusters = [...new Set(clusters)];

        // Create a color map for the clusters (discrete colors)
        const colorMap = {};
        uniqueClusters.forEach((cluster, index) => {
            colorMap[cluster] = `hsl(${index * (360 / uniqueClusters.length)}, 70%, 50%)`;  // Generating a distinct color
        });

        // Prepare traces for each cluster (to show in the legend)
        const traces = uniqueClusters.map(cluster => {
            const clusterIndices = clusters.map((c, i) => (c === cluster ? i : -1)).filter(i => i >= 0);

            // Only generate hover text for points in this trace
            const traceX = clusterIndices.map(i => umapX[i]);
            const traceY = clusterIndices.map(i => umapY[i]);
            const traceText = clusterIndices.map(i => `Cluster: ${clusters[i]}`);

            return {
                x: traceX,
                y: traceY,
                mode: 'markers',
                marker: {
                    color: colorMap[cluster],
                    size: 6,
                    line: {
                        width: 0.5,
                        color: '#000'
                    }
                },
                name: `Cluster ${cluster}`,  // Cluster name in the legend
                text: traceText,
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

        // Add hover event listener for debugging
        const plot = document.getElementById('umap-plot');
        plot.on('plotly_hover', function(eventData) {
            if (eventData.points.length > 0) {
                const point = eventData.points[0];
                console.log('Hovered over:', {
                    x: point.x,
                    y: point.y,
                    cluster: point.data.name,
                    pointIndex: point.pointIndex,
                    text: point.text
                });
            }
        });

        plot.on('plotly_unhover', function() {
            console.log('Mouse left the plot area');
        });

        // Load gene data and populate the drop-down menu
        fetch('data/top_genes_per_cluster_1.json')
            .then(response => response.json())
            .then(geneData => {
                const clusterSelect = document.getElementById('cluster-select');
                Object.keys(geneData).forEach(cluster => {
                    const option = document.createElement('option');
                    option.value = cluster;
                    option.textContent = cluster;
                    clusterSelect.appendChild(option);
                });

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
                                <td>${gene.pval_adj.toExponential(2)}</td>
                            `;
                            tableBody.appendChild(row);
                        });
                    }
                });
            })
            .catch(error => console.error('Error loading gene data:', error));
    })
    .catch(error => console.error('Error loading UMAP data:', error));

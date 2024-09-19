// Load the JSON data and visualize the UMAP plot using Plotly
fetch('data/umap_cluster_data.json')
    .then(response => response.json())
    .then(data => {
        const umapX = data.map(d => d.UMAP1);
        const umapY = data.map(d => d.UMAP2);
        const clusters = data.map(d => d.Cluster);

        // Create a Plotly scatter plot
        const trace = {
            x: umapX,
            y: umapY,
            mode: 'markers',
            marker: {
                color: clusters,
                colorscale: 'Spectral',
                size: 6,
                showscale: true
            },
            text: clusters,  // Tooltip showing cluster info
            hoverinfo: 'text'
        };

        const layout = {
            title: 'UMAP Cluster Visualization',
            xaxis: { title: 'UMAP1' },
            yaxis: { title: 'UMAP2' },
            showlegend: false,
            height: 600,
            width: 800
        };

        Plotly.newPlot('umap-plot', [trace], layout);
    })
    .catch(error => console.error('Error loading UMAP data:', error));

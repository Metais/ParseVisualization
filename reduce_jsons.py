import json

# We want only 10% of the final amount of data in the JSON, since way too huge otherwise.
def reduce_cell_cluster_mapping():
    file = 'data/cell_cluster_mapping/cell_cluster_mapping_sampleAll.json'
    with open(file, 'r') as f:
        data = json.load(f)

    filtered_dict = {}
    for cell in data:
        if int(cell) % 10 == 0:
            filtered_dict[cell] = data[cell]
    
    with open('data/cell_cluster_mapping/cell_cluster_mapping_sampleCombined.json', 'w') as write_file:
        json.dump(filtered_dict, write_file)

def reduce_cell_gene_expression():
    file = 'data/cell_gene_expression/cell_gene_expression_All - Copy.json'
    with open(file, 'r') as f:
        data = json.load(f)

    filtered_dict = {}
    for cell in data:
        if int(cell) % 10 == 0:
            filtered_dict[cell] = data[cell]
    
    with open('data/cell_gene_expression/cell_gene_expression_Combined.json', 'w') as write_file:
        json.dump(filtered_dict, write_file)

def reduce_gene_cell_expression():
    file = 'data/gene_cell_expression/gene_cell_expression_All.json'
    with open(file, 'r') as f:
        data = json.load(f)

    filtered_dict = {}
    for gene in data:
        gene_entries = data[gene]
        genes_to_add = []
        for gene_entry in gene_entries:
            if gene_entry[0] % 10 == 0:
                genes_to_add.append(gene_entry)
        
        if any(genes_to_add):
            filtered_dict[gene] = genes_to_add

    with open('data/gene_cell_expression/gene_cell_expression_Combined.json', 'w') as write_file:
        json.dump(filtered_dict, write_file, separators=(',', ':'))

def reduce_umap():
    file = 'data/umap/umap_All.json'
    with open(file, 'r') as f:
        data = json.load(f)

    filtered_dict = {}
    for cell in data:
        if int(cell) % 10 == 0:
            filtered_dict[cell] = data[cell]
    
    with open('data/umap/umap_Combined.json', 'w') as write_file:
        json.dump(filtered_dict, write_file)

reduce_umap()
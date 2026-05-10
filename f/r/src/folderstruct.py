import os

def print_tree(start_path, output_file, prefix=""):
    with open(output_file, "a", encoding="utf-8") as f:
        f.write(prefix + os.path.basename(start_path) + "\n")
    
    items = sorted(os.listdir(start_path))
    for index, item in enumerate(items):
        path = os.path.join(start_path, item)
        connector = "├── " if index < len(items) - 1 else "└── "
        
        with open(output_file, "a", encoding="utf-8") as f:
            f.write(prefix + connector + item + "\n")
        
        if os.path.isdir(path):
            extension = "│   " if index < len(items) - 1 else "    "
            print_tree(path, output_file, prefix + extension)

# 👉 Change this to your project folder path
project_path = "."

# 👉 Output file
output_file = "structure.txt"

# Clear previous content
open(output_file, "w").close()

print_tree(project_path, output_file)

print("Folder structure saved to structure.txt")
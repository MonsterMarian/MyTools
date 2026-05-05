import os
import re
import json

base_dir = r'c:\Users\Marian\Desktop\PeakProject\Output_md'
output_structure = {}

def parse_topic(topic_num):
    folder_path = os.path.join(base_dir, str(topic_num))
    if not os.path.exists(folder_path):
        return
    
    # After renaming, the file should be [topic_num].md
    target_file = f"{topic_num}.md"
    file_path = os.path.join(folder_path, target_file)
    
    if not os.path.exists(file_path):
        # Fallback to search for any .md if not exactly [num].md
        md_files = [f for f in os.listdir(folder_path) if f.endswith('.md') and os.path.isfile(os.path.join(folder_path, f))]
        if not md_files:
            return
        file_path = os.path.join(folder_path, md_files[0])
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by headings
    heading_pattern = re.compile(r'(^#{1,6}\s+.*$)', re.MULTILINE)
    
    parts = []
    matches = list(heading_pattern.finditer(content))
    
    if not matches:
        parts.append({"title": f"Téma {topic_num}", "content": content})
    else:
        # Check for intro text
        if matches[0].start() > 0:
            intro_text = content[:matches[0].start()].strip()
            if intro_text:
                parts.append({"title": "Úvod", "content": intro_text})
        
        for i in range(len(matches)):
            start = matches[i].start()
            end = matches[i+1].start() if i + 1 < len(matches) else len(content)
            
            part_content = content[start:end].strip()
            title = matches[i].group(1).replace('#', '').strip()
            title = re.sub(r'<a id=".*?"></a>', '', title)
            title = title.replace('__', '').strip()
            
            parts.append({"title": title, "content": part_content})

    parts_metadata = []
    parts_folder = os.path.join(folder_path, 'parts')
    if not os.path.exists(parts_folder):
        os.makedirs(parts_folder)
    
    # Clean old parts if they exist to avoid mixing
    for f in os.listdir(parts_folder):
        if f.endswith('.md'):
            os.remove(os.path.join(parts_folder, f))

    for idx, part in enumerate(parts, 1):
        part_filename = f"{topic_num}.{idx}.md"
        part_path = os.path.join(parts_folder, part_filename)
        
        with open(part_path, 'w', encoding='utf-8') as pf:
            pf.write(part['content'])
        
        parts_metadata.append({
            "id": f"{topic_num}.{idx}",
            "title": part['title'],
            "file": f"parts/{part_filename}"
        })
    
    output_structure[str(topic_num)] = {
        "count": len(parts),
        "parts": parts_metadata
    }

for i in range(1, 26):
    parse_topic(i)

# Sort keys numerically
sorted_structure = {k: output_structure[k] for k in sorted(output_structure.keys(), key=int)}

with open(os.path.join(base_dir, 'structure.json'), 'w', encoding='utf-8') as f:
    json.dump(sorted_structure, f, indent=4, ensure_ascii=False)

print(f"Successfully parsed {len(output_structure)} topics and created structure.json")

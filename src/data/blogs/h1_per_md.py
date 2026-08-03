import os
import re

def fix_multiple_h1_current_folder():
    # Regex to match Markdown headers starting with a single '#' followed by a space
    h1_pattern = re.compile(r'^(#\s+)(.*)$')
    
    # Get the current working directory where the script is placed
    current_directory = os.getcwd()
    
    # Iterate through all files in the current folder
    for file in os.listdir(current_directory):
        if file.endswith('.md'):
            file_path = os.path.join(current_directory, file)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            h1_found = False
            modified = False
            new_lines = []
            
            for line in lines:
                # Check if line is a top-level header (# )
                match = h1_pattern.match(line.strip())
                if match:
                    if not h1_found:
                        # Keep the first H1 intact
                        h1_found = True
                        new_lines.append(line)
                    else:
                        # Convert subsequent H1 into H2 (## )
                        new_line = '## ' + match.group(2) + '\n'
                        new_lines.append(new_line)
                        modified = True
                else:
                    new_lines.append(line)
            
            # Save changes back to file only if modifications were made
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(new_lines)
                print(f"Fixed multiple H1s in: {file}")

if __name__ == "__main__":
    fix_multiple_h1_current_folder()
import os
import re

# Define your project root path
PROJECT_ROOT = r"C:\Users\Gala\Documents\code\jk3"

# Folders to check for HTML files
TARGET_DIRS = [
    PROJECT_ROOT,
    os.path.join(PROJECT_ROOT, "blogs"),
    os.path.join(PROJECT_ROOT, "delivery")
]

# Folders/files to exclude from modification
IGNORED_DIRS = ['node_modules', '.git', 'dist', 'coverage', 'build', 'src']

def generate_optimized_description(file_name, current_content):
    """
    Generates a targeted, keyword-rich SEO description between 120 and 160 characters 
    based on the specific page name or content.
    """
    base_name = file_name.lower()
    
    # Custom targeted descriptions for main or systemic pages
    if 'index' in base_name:
        return "Explore Haryana Tools for industrial power tools, hand tools, workshop machinery, and solar installation gear in Pehowa with fast B2B delivery."
    elif 'about' in base_name:
        return "Learn about JK Enterprises, Pehowa's trusted wholesale supplier of industrial power tools, hardware, and complete solar energy equipment."
    elif 'contact' in base_name:
        return "Get in touch with Haryana Tools in Pehowa for bulk industrial power tools, machinery orders, solar setups, and expert customer support."
    elif 'catalog' in base_name or 'product' in base_name:
        return "Browse our complete catalog of industrial power tools, heavy machinery, precision hand tools, and solar equipment with verified GST invoices."
    elif 'cart' in base_name or 'checkout' in base_name or 'search' in base_name:
        return "Securely manage your industrial tool orders, check out items, and explore Haryana Tools' extensive hardware inventory online."
    elif 'blog' in base_name:
        return "Read expert guides, buying tips, and maintenance tutorials for industrial power tools, hand tools, and rooftop solar energy systems."
    elif 'privacy' in base_name or 'terms' in base_name or 'return-policy' in base_name:
        return "Read the official terms, privacy guidelines, and hassle-free return policies for purchases made on Haryana Tools."

    # If it's a city landing page (e.g., Ambala.html, Panipat.html)
    if any(city in base_name for city in ['ambala', 'amritsar', 'bathinda', 'chandigarh', 'delhi', 'faridabad', 'ghaziabad', 'greater-noida', 'gurugram', 'hisar', 'jalandhar', 'karnal', 'kurukshetra', 'ludhiana', 'mohali', 'noida', 'panchkula', 'panipat', 'patiala', 'pehowa', 'phagwara', 'rohtak', 'sonipat', 'yamunanagar']):
        city_clean = file_name.replace('.html', '').replace('-', ' ').title()
        return f"Authorized supplier of heavy-duty power tools, hand tools, solar installation gear, and industrial workshop machinery in {city_clean}. Fast delivery."

    # Fallback cleanup and padding for other guides/blogs if too short
    cleaned = re.sub(r'<[^>]+>', '', current_content).strip()
    if len(cleaned) >= 20 and len(cleaned) < 120:
        # Pad slightly to hit the sweet spot
        padded = f"{cleaned} Shop top-quality industrial hardware and professional equipment at Haryana Tools."
        if 120 <= len(padded) <= 160:
            return padded

    # Default robust fallback description
    return "Discover professional power tools, hand tools, workshop machinery, and reliable rooftop solar solutions at Haryana Tools with fast doorstep delivery."

def fix_meta_descriptions(dry_run=False):
    print(f"🔍 Scanning and auto-optimizing HTML meta descriptions (Dry Run: {dry_run})...\n")
    
    updated_count = 0
    total_scanned = 0

    meta_desc_pattern = re.compile(r'(<meta\s+name=["\']description["\']\s+content=["\'])([^"\*]*?)(["\']\s*/?>)', re.IGNORECASE)
    missing_meta_pattern = re.compile(r'</head>', re.IGNORECASE)

    for target_dir in TARGET_DIRS:
        if not os.path.exists(target_dir):
            continue
            
        for root, dirs, files in os.walk(target_dir):
            # Skip ignored directories & partials folder paths
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
            if any(part in root for part in ['src', 'partials']):
                continue
            
            for file in files:
                if file.endswith('.html'):
                    file_path = os.path.join(root, file)
                    total_scanned += 1
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            html_content = f.read()
                            
                        match = meta_desc_pattern.search(html_content)
                        
                        if match:
                            prefix, content, suffix = match.groups()
                            length = len(content)
                            
                            # Check if length is outside 120-160 or contains placeholders like {{META_DESCRIPTION}}
                            if length < 120 or length > 160 or '{{' in content:
                                new_desc = generate_optimized_description(file, content)
                                new_tag = f'{prefix}{new_desc}{suffix}'
                                
                                print(f"🔧 Fixing {file}: Length was {length} chars -> Optimized to {len(new_desc)} chars.")
                                html_content = meta_desc_pattern.sub(new_tag, html_content, count=1)
                                updated_count += 1
                            else:
                                continue # Already perfect length
                        else:
                            # Meta description completely missing, let's inject one right before </head>
                            new_desc = generate_optimized_description(file, "")
                            new_tag = f'    <meta name="description" content="{new_desc}">\n</head>'
                            
                            print(f"➕ Adding missing meta description to {file} ({len(new_desc)} chars).")
                            html_content = missing_meta_pattern.sub(new_tag, html_content, count=1)
                            updated_count += 1

                        if not dry_run:
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(html_content)
                                
                    except Exception as e:
                        print(f"⚠️ Error processing {file_path}: {e}")

    print(f"\n🚀 Complete! Scanned {total_scanned} files. Successfully updated {updated_count} meta descriptions.")

if __name__ == "__main__":
    # Change to False if you want it to write changes to your files automatically
    DRY_RUN = False 
    fix_meta_descriptions(dry_run=DRY_RUN)
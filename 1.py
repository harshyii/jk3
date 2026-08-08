import os
import re

# Define your project root path
PROJECT_ROOT = r"C:\Users\Gala\Documents\code\jk3"

# Folders to check for HTML files
TARGET_DIRS = [
    PROJECT_ROOT,
    os.path.join(PROJECT_ROOT, "blogs"),
    os.path.join(PROJECT_ROOT, "delivery"),
    os.path.join(PROJECT_ROOT, "src") # Added src back in case your files live here
]

# Removed 'src' from ignored directories
IGNORED_DIRS = ['node_modules', '.git', 'dist', 'coverage', 'build']

def generate_optimized_title(file_name):
    base_name = file_name.lower()
    if 'index' in base_name: return "Industrial Power Tools & Machinery Wholesaler | Haryana Tools"
    if 'about' in base_name: return "About JK Enterprises | Industrial Tools Supplier Pehowa"
    if 'contact' in base_name: return "Contact Haryana Tools | Bulk Industrial Equipment Pehowa"
    if 'catalog' in base_name or 'product' in base_name or 'category' in base_name: return "Industrial Power Tools & Hardware Catalog | Haryana Tools"
    if 'cart' in base_name or 'checkout' in base_name: return "Secure Checkout & Order Management | Haryana Tools"
    if 'blog' in base_name: return "Industrial Tools & Solar Energy Guides | Haryana Tools Blog"
    if 'privacy' in base_name: return "Privacy Policy & Data Security | Haryana Tools"
    if 'terms' in base_name: return "Terms & Conditions of Service | Haryana Tools"
    if 'return-policy' in base_name: return "Hassle-Free Return & Refund Policy | Haryana Tools"
    
    clean_name = file_name.replace('.html', '').replace('-', ' ').title()
    return f"{clean_name} | Industrial Power Tools & Equipment Supplier"

def generate_optimized_description(file_name):
    base_name = file_name.lower()
    if 'index' in base_name: return "Explore Haryana Tools for industrial power tools, hand tools, workshop machinery, and solar installation gear in Pehowa with fast B2B delivery."
    if 'about' in base_name: return "Learn about JK Enterprises, Pehowa's trusted wholesale supplier of industrial power tools, hardware, and complete solar energy equipment."
    if 'contact' in base_name: return "Get in touch with Haryana Tools in Pehowa for bulk industrial power tools, machinery orders, solar setups, and expert customer support."
    if 'catalog' in base_name or 'product' in base_name or 'category' in base_name: return "Browse our complete catalog of industrial power tools, heavy machinery, precision hand tools, and solar equipment with verified GST invoices."
    if 'cart' in base_name or 'checkout' in base_name: return "Securely manage your industrial tool orders, check out items, and explore Haryana Tools' extensive hardware inventory online."
    if 'blog' in base_name: return "Read expert guides, buying tips, and maintenance tutorials for industrial power tools, hand tools, and rooftop solar energy systems."
    
    clean_name = file_name.replace('.html', '').replace('-', ' ').title()
    return f"Discover professional {clean_name} equipment, hand tools, workshop machinery, and reliable rooftop solar solutions at Haryana Tools."

def fix_seo_tags():
    print("🔍 Executing aggressive SEO tag cleanup...\n")
    
    updated_count = 0
    total_scanned = 0

    # RUTHLESS REGEX: Catches variations, multiple lines, and weird spacings
    title_pattern = re.compile(r'<title[^>]*>.*?</title>', re.IGNORECASE | re.DOTALL)
    meta_desc_pattern = re.compile(r'<meta[^>]*?name\s*=\s*["\']description["\'][^>]*>', re.IGNORECASE | re.DOTALL)
    head_pattern = re.compile(r'(<head\b[^>]*>)', re.IGNORECASE)
    
    # IMG Regex
    img_pattern = re.compile(r'<img\b([^>]*?)>', re.IGNORECASE)

    for target_dir in TARGET_DIRS:
        if not os.path.exists(target_dir):
            continue
            
        for root, dirs, files in os.walk(target_dir):
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
            
            for file in files:
                if file.endswith('.html'):
                    file_path = os.path.join(root, file)
                    total_scanned += 1
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            original_content = f.read()
                            html_content = original_content
                            
                        # --- 1. OBLITERATE ALL EXISTING TITLES AND DESCRIPTIONS ---
                        html_content = title_pattern.sub('', html_content)
                        html_content = meta_desc_pattern.sub('', html_content)
                        
                        # --- 2. GENERATE NEW TAGS ---
                        new_title = f"<title>{generate_optimized_title(file)}</title>"
                        new_desc = f'<meta name="description" content="{generate_optimized_description(file)}">'
                        injection = f"\n    {new_title}\n    {new_desc}"

                        # --- 3. INJECT EXACTLY ONCE ---
                        if head_pattern.search(html_content):
                            html_content = head_pattern.sub(r'\1' + injection, html_content, count=1)
                        else:
                            # If no head tag exists at all, put it at the very top
                            html_content = f"<head>{injection}\n</head>\n" + html_content

                        # --- 4. RUTHLESS IMG ALT FIX ---
                        def fix_img_alt(match):
                            img_attrs = match.group(1)
                            alt_match = re.search(r'\balt\s*=\s*(["\'])(.*?)\1', img_attrs, re.IGNORECASE)
                            
                            if not alt_match:
                                # No alt attribute at all
                                return f'<img {img_attrs} alt="Industrial Equipment and Tools - Haryana Tools">'
                            else:
                                quote, alt_val = alt_match.groups()
                                if not alt_val.strip() or "{{" in alt_val:
                                    # Alt exists but is empty or contains template logic
                                    fixed_attrs = re.sub(r'\balt\s*=\s*(["\']).*?\1', 'alt="Industrial Equipment and Tools - Haryana Tools"', img_attrs, flags=re.IGNORECASE)
                                    return f'<img {fixed_attrs}>'
                            return match.group(0)

                        html_content = img_pattern.sub(fix_img_alt, html_content)

                        # Only write if changes were actually made
                        if html_content != original_content:
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(html_content)
                            updated_count += 1
                            print(f"✅ Nuked duplicates & fixed SEO in: {file}")
                                
                    except Exception as e:
                        print(f"⚠️ Error processing {file_path}: {e}")

    print(f"\n🚀 Complete! Scanned {total_scanned} files. Successfully sanitized {updated_count} files.")

if __name__ == "__main__":
    fix_seo_tags()
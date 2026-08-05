import fs from 'fs';
import path from 'path';

// Enforce absolute paths mapped to the current working directory
const ROOT_DIR = process.cwd();
const BLOGS_JSON_PATH = path.join(ROOT_DIR, 'dist', 'data', 'blogs.json');
const MARKDOWN_DIR = path.join(ROOT_DIR, 'src', 'data', 'blogs');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'blog-template.html');
const OUTPUT_DIR = path.join(ROOT_DIR, 'blogs');

console.log('🔍 Absolute Execution Path Check:');
console.log(`- Root: ${ROOT_DIR}`);
console.log(`- Markdown Content Dir: ${MARKDOWN_DIR}`);
console.log(`- Target Output Folder: ${OUTPUT_DIR}`);

// Ensure output directory exists using absolute path
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Validate essential files exist
if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`❌ Template file not found at: ${TEMPLATE_PATH}`);
    process.exit(1);
}

if (!fs.existsSync(BLOGS_JSON_PATH)) {
    console.error(`❌ Blogs JSON file not found at: ${BLOGS_JSON_PATH}`);
    process.exit(1);
}

const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
const blogsDataRaw = fs.readFileSync(BLOGS_JSON_PATH, 'utf-8');

let blogs;
try {
    const parsed = JSON.parse(blogsDataRaw);
    blogs = Array.isArray(parsed) ? parsed : (parsed.blogs || parsed.data || parsed.posts);
} catch (error) {
    console.error(`❌ Failed to parse JSON:`, error.message);
    process.exit(1);
}

if (!Array.isArray(blogs)) {
    console.error(`❌ Could not resolve blogs array.`);
    process.exit(1);
}

console.log(`🚀 Building ${blogs.length} static pages from Markdown files...`);

let successCount = 0;

blogs.forEach((blog, index) => {
    const rawSlug = blog.slug || blog.Slug;
    if (!rawSlug) return;

    const slug = String(rawSlug).toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
    
    // Look for the corresponding markdown file: src/data/blogs/<slug>.md
    const mdFilePath = path.join(MARKDOWN_DIR, `${slug}.md`);
    let content = '<p>No content available.</p>';

    if (fs.existsSync(mdFilePath)) {
        let rawMarkdown = fs.readFileSync(mdFilePath, 'utf-8');
        
        // Convert top-level Markdown headers (# Header) to (## Header) before HTML injection
        rawMarkdown = rawMarkdown.replace(/^#\s+(.+)$/gm, '## $1');
        
        content = `<div class="markdown-body">${rawMarkdown}</div>`;
    } else {
        console.warn(`⚠️ Markdown file missing for slug: ${slug} (looked in ${mdFilePath})`);
    }

    const title = blog.title || blog.Title || 'Untitled Blog';
    const summary = blog.summary || blog.Summary || blog.excerpt || '';
    const image = blog.image || blog.Image || blog.thumbnail || blog.Thumbnail || '404.webp';
    const date = blog.date || blog.Date || blog.published_at || 'Recently Published';
    const author = blog.author || blog.Author || 'Haryana Tools Expert';
    const category = blog.category || blog.Category || 'General';

    let featuredImage = image;
    if (!featuredImage.startsWith('http') && !featuredImage.startsWith('../') && !featuredImage.startsWith('/')) {
        featuredImage = '../' + featuredImage;
    }

    const seoTitle = blog.seo_title || blog.SeoTitle || `${title} - Haryana Tools`;
    const metaDescription = blog.meta_description || blog.MetaDescription || summary || title;
    const canonicalUrl = blog.canonical_url || `https://haryanatools.com/blogs/${slug}.html`;

    let pageHtml = template
        .replace(/{{SEO_TITLE}}/g, seoTitle)
        .replace(/{{META_DESCRIPTION}}/g, metaDescription)
        .replace(/{{CANONICAL_URL}}/g, canonicalUrl)
        .replace(/{{TITLE}}/g, title)
        .replace(/{{AUTHOR}}/g, author)
        .replace(/{{DATE}}/g, date)
        .replace(/{{CATEGORY}}/g, category)
        .replace(/{{FEATURED_IMAGE}}/g, featuredImage)
        .replace(/{{BLOG_CONTENT}}/g, content);

    pageHtml = pageHtml
        .replace(/href="(?!(?:http|\/|\.\.))/g, 'href="../')
        .replace(/src="(?!(?:http|\/|\.\.))/g, 'src="../');

    if (!pageHtml.includes('id="header-placeholder"')) {
        pageHtml = pageHtml.replace(
            /<body([^>]*)>/i,
            '<body$1>\n    <div id="head-placeholder"></div>\n    <div id="mega-menu-placeholder"></div>\n    <div id="breadcrumb-placeholder"></div>'
        );
    }

    if (!pageHtml.includes('id="footer-placeholder"')) {
        pageHtml = pageHtml.replace(
            /<\/main>/i,
            '</main>\n    <div id="footer-placeholder"></div>'
        );
    }

    if (!pageHtml.includes('layout.js')) {
        pageHtml = pageHtml.replace(
            /<\/body>/i,
            '    <script src="../src/js/bootstrap.bundle.min.js"></script>\n    <script src="../src/js/layout.js" type="module"></script>\n</body>'
        );
    }

    // =========================================================================
    // POST-PROCESSING: Clean Duplicate Meta Descriptions and Convert Extra H1s
    // =========================================================================
    
    // 1. Keep only the FIRST <meta name="description"> tag and remove duplicates
    let metaDescCount = 0;
    pageHtml = pageHtml.replace(/<meta\s+[^>]*name=["']description["'][^>]*>/gi, (match) => {
        metaDescCount++;
        return metaDescCount === 1 ? match : ''; // Return empty string for 2nd, 3rd, etc.
    });

    // 2. Keep the FIRST <h1> tag and convert all subsequent <h1> tags to <h2>
    let h1Count = 0;
    // Note: The 's' flag ensures we match over newlines if the h1 spans multiple lines
    pageHtml = pageHtml.replace(/<h1\b([^>]*)>(.*?)<\/h1>/gis, (match, attrs, innerContent) => {
        h1Count++;
        if (h1Count === 1) {
            return match; // Leave the first H1 untouched
        }
        // Change tags to h2, but inject the exact same attributes (classes, etc.) back in
        return `<h2${attrs}>${innerContent}</h2>`;
    });

    // Write final sanitized HTML to file
    const filePath = path.join(OUTPUT_DIR, `${slug}.html`);
    fs.writeFileSync(filePath, pageHtml, 'utf-8');
    successCount++;
});

console.log(`🎉 Successfully built ${successCount}/${blogs.length} pages using Markdown files from src/data/blogs/ to: ${OUTPUT_DIR}`);
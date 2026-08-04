import fs from 'fs';
import path from 'path';

// Enforce absolute paths mapped to the current working directory
const ROOT_DIR = process.cwd();
const BLOGS_JSON_PATH = path.join(ROOT_DIR, 'dist', 'data', 'blogs.json');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'blog-template.html');
const OUTPUT_DIR = path.join(ROOT_DIR, 'blogs');

console.log('🔍 Absolute Execution Path Check:');
console.log(`- Root: ${ROOT_DIR}`);
console.log(`- Target Output Folder: ${OUTPUT_DIR}`);

// Ensure output directory exists using absolute path
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Validate files exist
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

console.log(`🚀 Building ${blogs.length} static pages...`);

let successCount = 0;

blogs.forEach((blog, index) => {
    const rawSlug = blog.slug || blog.Slug;
    if (!rawSlug) return;

    const slug = String(rawSlug).toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
    const title = blog.title || blog.Title || 'Untitled Blog';
    const summary = blog.summary || blog.Summary || blog.excerpt || '';
    const content = blog.content || blog.Content || '<p>No content available.</p>';
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
            '<body$1>\n    <div id="header-placeholder"></div>\n    <div id="mega-menu-placeholder"></div>\n    <div id="breadcrumb-placeholder"></div>'
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

    const filePath = path.join(OUTPUT_DIR, `${slug}.html`);
    fs.writeFileSync(filePath, pageHtml, 'utf-8');
    successCount++;
});

console.log(`🎉 Successfully built ${successCount}/${blogs.length} pages to: ${OUTPUT_DIR}`);
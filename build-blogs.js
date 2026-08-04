import fs from 'fs';
import path from 'path';

// Paths configuration
const BLOGS_JSON_PATH = path.join('dist', 'data', 'blogs.json');
const TEMPLATE_PATH = path.join('blog-template.html');
const OUTPUT_DIR = path.join('dist', 'blogs');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read template and blogs data
if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`❌ Template file not found at ${TEMPLATE_PATH}`);
    process.exit(1);
}

if (!fs.existsSync(BLOGS_JSON_PATH)) {
    console.error(`❌ Blogs JSON file not found at ${BLOGS_JSON_PATH}`);
    process.exit(1);
}

const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
const blogsDataRaw = fs.readFileSync(BLOGS_JSON_PATH, 'utf-8');
const blogs = JSON.parse(blogsDataRaw);

console.log(`🚀 Building static blog pages using blog-template.html for ${blogs.length} articles...`);

blogs.forEach(blog => {
    const slug = blog.slug || blog.Slug;
    if (!slug) return;

    const title = blog.title || blog.Title || 'Untitled Blog';
    const summary = blog.summary || blog.Summary || blog.excerpt || '';
    const content = blog.content || blog.Content || '<p>No content available for this article.</p>';
    const image = blog.image || blog.Image || blog.thumbnail || blog.Thumbnail || '404.webp';
    const date = blog.date || blog.Date || blog.published_at || 'Recently Published';
    const author = blog.author || blog.Author || 'Haryana Tools Expert';
    const category = blog.category || blog.Category || 'General';

    // Normalize image path for files inside /dist/blogs/ pointing back to root
    let featuredImage = image;
    if (!featuredImage.startsWith('http') && !featuredImage.startsWith('../') && !featuredImage.startsWith('/')) {
        featuredImage = '../' + featuredImage;
    }

    // SEO variables
    const seoTitle = blog.seo_title || blog.SeoTitle || `${title} - Haryana Tools`;
    const metaDescription = blog.meta_description || blog.MetaDescription || summary || title;
    const canonicalUrl = blog.canonical_url || `https://haryanatools.com/blogs/${slug}.html`;

    // Replace template placeholders
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

    // Fix stylesheet/script relative paths so components, layout, and scripts load correctly from subfolder
    pageHtml = pageHtml.replace(/href="src\//g, 'href="../src/');
    pageHtml = pageHtml.replace(/src="src\//g, 'src="../src/');
    pageHtml = pageHtml.replace(/href="blog.html"/g, 'href="../blog.html"');

    // Automatically inject placeholders for navbar/header/breadcrumbs if missing so layout.js populates them
    if (!pageHtml.includes('id="header-placeholder"')) {
        pageHtml = pageHtml.replace(
            /<body([^>]*)>/i,
            '<body$1>\n    <div id="header-placeholder"></div>\n    <div id="mega-menu-placeholder"></div>\n    <div id="breadcrumb-placeholder"></div>'
        );
    }

    // Automatically inject footer placeholder and global JS bundles if missing
    if (!pageHtml.includes('id="footer-placeholder"')) {
        pageHtml = pageHtml.replace(
            /<\/main>/i,
            '</main>\n    <div id="footer-placeholder"></div>'
        );
    }

    if (!pageHtml.includes('bootstrap.bundle.min.js')) {
        pageHtml = pageHtml.replace(
            /<\/body>/i,
            '    <script src="../src/js/bootstrap.bundle.min.js"></script>\n    <script src="../src/js/layout.js" type="module"></script>\n</body>'
        );
    }

    const filePath = path.join(OUTPUT_DIR, `${slug}.html`);
    fs.writeFileSync(filePath, pageHtml, 'utf-8');
    console.log(`✅ Generated: blogs/${slug}.html`);
});

console.log('🎉 Successfully built all static blog pages with full site layout and scripts!');
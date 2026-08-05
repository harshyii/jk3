import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

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

/**
 * Sanitizes and cleans the HTML document:
 * 1. Removes #head-placeholder to stop layout.js from injecting duplicate metadata in the browser.
 * 2. Removes duplicate <meta name="description"> tags.
 * 3. Ensures only one <h1> tag exists per page (converts extra <h1> tags to <h2>).
 */
function sanitizeBlogHtml(htmlContent) {
    const $ = cheerio.load(htmlContent, { decodeEntities: false });

    // 1. Remove #head-placeholder so layout.js doesn't dynamically fetch and inject
    // head.html into <body> at browser runtime (causes duplicate meta/title tags)
    $('#head-placeholder').remove();

    // 2. Keep only the first <meta name="description"> and remove duplicates
    const $metaDescriptions = $('meta[name="description"]');
    if ($metaDescriptions.length > 1) {
        $metaDescriptions.slice(1).remove();
    }

    // 3. Keep the primary article <h1> and convert all subsequent <h1> tags to <h2>
    const $h1s = $('h1');
    if ($h1s.length > 1) {
        $h1s.each((index, el) => {
            if (index === 0) return; // Skip primary article title

            const $el = $(el);
            const $h2 = $('<h2>').html($el.html());

            // Preserve existing attributes (class, style, id, etc.)
            if (el.attribs) {
                Object.keys(el.attribs).forEach((attrName) => {
                    $h2.attr(attrName, el.attribs[attrName]);
                });
            }

            $el.replaceWith($h2);
        });
    }

    return $.html();
}

console.log(`🚀 Building ${blogs.length} static pages from Markdown files...`);

let successCount = 0;

blogs.forEach((blog) => {
    const rawSlug = blog.slug || blog.Slug;
    if (!rawSlug) return;

    const slug = String(rawSlug).toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
    
    // Look for the corresponding markdown file: src/data/blogs/<slug>.md
    const mdFilePath = path.join(MARKDOWN_DIR, `${slug}.md`);
    let content = '<p>No content available.</p>';

    if (fs.existsSync(mdFilePath)) {
        let rawMarkdown = fs.readFileSync(mdFilePath, 'utf-8');

        // Pre-clean Markdown: Demote any top-level `# Heading` or `<h1>` tags in markdown content to `##` / `<h2>`
        rawMarkdown = rawMarkdown
            .replace(/^#\s+(.+)$/gm, '## $1')
            .replace(/<h1([^>]*)>/gi, '<h2$1>')
            .replace(/<\/h1>/gi, '</h2>');

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

    // Inject layout placeholders (EXCLUDING head-placeholder to avoid runtime meta duplication)
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

    // Run Cheerio DOM cleanup before writing to file
    pageHtml = sanitizeBlogHtml(pageHtml);

    const filePath = path.join(OUTPUT_DIR, `${slug}.html`);
    fs.writeFileSync(filePath, pageHtml, 'utf-8');
    successCount++;
});

console.log(`🎉 Successfully built ${successCount}/${blogs.length} pages using Markdown files from src/data/blogs/ to: ${OUTPUT_DIR}`);
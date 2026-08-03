const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Paths (adjust if your folder structure differs)
const BLOGS_JSON_PATH = path.join(__dirname, 'src/data/blogs.json'); // or 'dist/data/blogs.json'
const MARKDOWN_DIR = path.join(__dirname, 'src/data/blogs');
const TEMPLATE_PATH = path.join(__dirname, 'blog-template.html'); // A template file we'll create next
const OUTPUT_DIR = path.join(__dirname, ''); // Root or your public output folder

async function buildBlogs() {
    if (!fs.existsSync(BLOGS_JSON_PATH)) {
        console.error('blogs.json not found at:', BLOGS_JSON_PATH);
        return;
    }

    const rawData = fs.readFileSync(BLOGS_JSON_PATH, 'utf8');
    const blogsData = JSON.parse(rawData);
    const blogs = Array.isArray(blogsData) ? blogsData : (blogsData.blogs || []);

    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    blogs.forEach(blog => {
        const slug = blog.slug || blog.Slug;
        const title = blog.SEOTitle || blog.seoTitle || blog.title || blog.Title || 'Haryana Tools Blog';
        const description = blog.MetaDescription || blog.metaDescription || blog.excerpt || '';
        const image = blog.FeaturedImage || blog.featuredImage || blog.image || '404.webp';
        const author = blog.author || blog.Author || 'Admin';
        const date = blog.date || blog.Date || '';
        const category = blog.category || blog.Category || 'General';
        
        // Find and read the markdown file
        const mdFileName = blog.markdownFile || blog.MarkdownFile || `${slug}.md`;
        const mdFilePath = path.join(MARKDOWN_DIR, mdFileName);

        let htmlContent = '<p>Content unavailable.</p>';
        if (fs.existsSync(mdFilePath)) {
            const mdText = fs.readFileSync(mdFilePath, 'utf8');
            htmlContent = marked.parse(mdText);
        }

        // Replace placeholders in the template
        let finalHtml = template
            .replace(/{{SEO_TITLE}}/g, escapeHtml(title))
            .replace(/{{META_DESCRIPTION}}/g, escapeHtml(description))
            .replace(/{{CANONICAL_URL}}/g, `https://www.haryana.tools/blog/${slug}.html`)
            .replace(/{{OG_IMAGE}}/g, escapeHtml(image))
            .replace(/{{TITLE}}/g, escapeHtml(title))
            .replace(/{{AUTHOR}}/g, escapeHtml(author))
            .replace(/{{DATE}}/g, escapeHtml(date))
            .replace(/{{CATEGORY}}/g, escapeHtml(category))
            .replace(/{{FEATURED_IMAGE}}/g, escapeHtml(image))
            .replace(/{{BLOG_CONTENT}}/g, htmlContent);

        // Save as a standalone HTML file per blog (e.g., air-hose-buying-guide.html)
        const outputPath = path.join(OUTPUT_DIR, `${slug}.html`);
        fs.writeFileSync(outputPath, finalHtml, 'utf8');
        console.log(`Generated static page: ${slug}.html`);
    });

    console.log('All static blog pages generated successfully!');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

buildBlogs();
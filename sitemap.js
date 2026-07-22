const fs = require('fs-extra');
const path = require('path');

const BASE_URL = 'https://www.haryanatools.com';
const OUTPUT_PATH = path.join(__dirname, 'dist', 'sitemap.xml');

// Helper to escape XML special characters
function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString().replace(/[&<>'"]/g, c => {
        switch (c) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&apos;';
        }
    });
}

// Ensures all generated URLs strictly belong to haryanatools.com and filters out external domains
function enforceBaseUrl(rawUrl) {
    if (!rawUrl) return '';
    
    // If it's already an absolute URL containing a different domain, strip it down or skip
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        try {
            const parsed = new URL(rawUrl);
            // If the domain is not haryanatools.com, fallback or build it relative to haryanatools.com
            if (!parsed.hostname.endsWith('haryanatools.com')) {
                // Try to extract just the path portion (e.g. /product/xyz) and attach to haryanatools.com
                return `${BASE_URL}${parsed.pathname}${parsed.search}`;
            }
            return rawUrl;
        } catch (e) {
            return `${BASE_URL}/${rawUrl.replace(/^https?:\/\/[^\/]+\/?/, '')}`;
        }
    }
    
    // If it's a relative path, ensure it starts cleanly with a slash
    const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    return `${BASE_URL}${cleanPath}`;
}

async function generateSitemapFromJSON() {
    console.log('🔍 Reading JSON data from dist/data/ to build strict haryanatools.com sitemap...');

    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemapXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static Homepage
    sitemapXml += `    <url>\n`;
    sitemapXml += `        <loc>${BASE_URL}/</loc>\n`;
    sitemapXml += `        <changefreq>daily</changefreq>\n`;
    sitemapXml += `        <priority>1.0</priority>\n`;
    sitemapXml += `    </url>\n`;

    // 1. Add Products from catalog.json
    try {
        const catalogPath = path.join(__dirname, 'dist', 'data', 'catalog.json');
        if (await fs.pathExists(catalogPath)) {
            const products = await fs.readJson(catalogPath);
            console.log(`📦 Adding ${products.length} products to sitemap...`);
            for (const item of products) {
                if (item.slug && item.slug !== 'undefined') {
                    const rawLoc = item.productUrl || `${BASE_URL}/product/${item.slug}`;
                    const finalLoc = enforceBaseUrl(rawLoc);
                    sitemapXml += `    <url>\n`;
                    sitemapXml += `        <loc>${escapeXml(finalLoc)}</loc>\n`;
                    sitemapXml += `        <changefreq>weekly</changefreq>\n`;
                    sitemapXml += `        <priority>0.8</priority>\n`;
                    sitemapXml += `    </url>\n`;
                }
            }
        }
    } catch (err) {
        console.warn('⚠️ Could not process catalog.json:', err.message);
    }

    // 2. Add Categories from categories.json
    try {
        const categoriesPath = path.join(__dirname, 'dist', 'data', 'categories.json');
        if (await fs.pathExists(categoriesPath)) {
            const categories = await fs.readJson(categoriesPath);
            console.log(`📁 Adding ${categories.length} categories to sitemap...`);
            for (const cat of categories) {
                if (cat.slug && cat.slug !== 'undefined') {
                    const finalLoc = enforceBaseUrl(`${BASE_URL}/category/${cat.slug}`);
                    sitemapXml += `    <url>\n`;
                    sitemapXml += `        <loc>${escapeXml(finalLoc)}</loc>\n`;
                    sitemapXml += `        <changefreq>weekly</changefreq>\n`;
                    sitemapXml += `        <priority>0.7</priority>\n`;
                    sitemapXml += `    </url>\n`;
                }
            }
        }
    } catch (err) {
        console.warn('⚠️ Could not process categories.json:', err.message);
    }

    // 3. Add Brands from brands.json
    try {
        const brandsPath = path.join(__dirname, 'dist', 'data', 'brands.json');
        if (await fs.pathExists(brandsPath)) {
            const brands = await fs.readJson(brandsPath);
            console.log(`🏷️ Adding ${brands.length} brands to sitemap...`);
            for (const brand of brands) {
                if (brand.slug && brand.slug !== 'undefined') {
                    const finalLoc = enforceBaseUrl(`${BASE_URL}/brand/${brand.slug}`);
                    sitemapXml += `    <url>\n`;
                    sitemapXml += `        <loc>${escapeXml(finalLoc)}</loc>\n`;
                    sitemapXml += `        <changefreq>weekly</changefreq>\n`;
                    sitemapXml += `        <priority>0.7</priority>\n`;
                    sitemapXml += `    </url>\n`;
                }
            }
        }
    } catch (err) {
        console.warn('⚠️ Could not process brands.json:', err.message);
    }

    // 4. Add Blogs from blogs.json
    try {
        const blogsPath = path.join(__dirname, 'dist', 'data', 'blogs.json');
        if (await fs.pathExists(blogsPath)) {
            const blogs = await fs.readJson(blogsPath);
            console.log(`📝 Adding ${blogs.length} blogs to sitemap...`);
            for (const blog of blogs) {
                if (blog.slug && blog.slug !== 'undefined') {
                    const finalLoc = enforceBaseUrl(`${BASE_URL}/blog/${blog.slug}`);
                    sitemapXml += `    <url>\n`;
                    sitemapXml += `        <loc>${escapeXml(finalLoc)}</loc>\n`;
                    sitemapXml += `        <changefreq>weekly</changefreq>\n`;
                    sitemapXml += `        <priority>0.6</priority>\n`;
                    sitemapXml += `    </url>\n`;
                }
            }
        }
    } catch (err) {
        console.warn('⚠️ Could not process blogs.json:', err.message);
    }

    sitemapXml += `</urlset>`;

    await fs.outputFile(OUTPUT_PATH, sitemapXml);
    console.log(`🚀 Success! Clean strict haryanatools.com sitemap generated at: ${OUTPUT_PATH}`);
}

generateSitemapFromJSON().catch(err => {
    console.error('❌ Sitemap generation failed:', err);
    process.exit(1);
});
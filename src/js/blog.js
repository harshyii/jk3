/**
 * Haryana Tools - Blog JavaScript Handler
 */

import { API } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('blog-list-container');
    if (!container) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');

        if (slug) {
            // --- Render Single Blog Post ---
            const post = await API.getBlog(slug);
            
            if (!post) {
                container.innerHTML = `<div class="alert alert-warning text-center my-5">Blog post "${slug}" could not be found.</div>`;
                return;
            }

            const singleImage = post.image || post.Image || post.FeaturedImage || post.featuredImage;
            const singleTitle = post.title || post.Title || 'Untitled Post';
            const singleAuthor = post.author || post.Author || 'Admin';
            const singleCategory = post.category || post.Category || 'General';
            
            // Extract the filename or full relative path from the post metadata
            let mdFileSource = post.markdownFile || post.MarkdownFile || post.file || post.File || `${slug}.md`;
            
            // Normalize path variants (e.g. if json has "src/data/blogs/file.md" or just "file.md")
            let cleanRelativePath = mdFileSource.replace(/^\/+/, '');
            if (!cleanRelativePath.startsWith('src/') && !cleanRelativePath.startsWith('dist/')) {
                cleanRelativePath = `src/data/blogs/${cleanRelativePath}`;
            }

            // 1. Fetch the actual .md file content trying multiple potential web roots
            let markdownContent = '';
            const pathsToTry = [
                `/${cleanRelativePath}`,
                `/${cleanRelativePath.replace('src/', 'dist/')}`,
                `./${cleanRelativePath}`,
                `../${cleanRelativePath}`,
                `data/blogs/${cleanRelativePath.split('/').pop()}`,
                `./data/blogs/${cleanRelativePath.split('/').pop()}`
            ];

            let mdResponse = null;
            for (const pathOption of pathsToTry) {
                try {
                    mdResponse = await fetch(pathOption);
                    if (mdResponse.ok) break;
                } catch (e) {
                    // Try next path option
                }
            }

            if (mdResponse && mdResponse.ok) {
                markdownContent = await mdResponse.text();
            } else {
                markdownContent = `### Content Unavailable\nSorry, the markdown file for **${slug}** could not be loaded from the server path.`;
            }

            // 2. Parse Markdown to HTML
            let renderedHtml = markdownContent;
            try {
                // Dynamically load the 'marked' parser library
                const { marked } = await import('https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js');
                
                marked.setOptions({
                    headerIds: true,
                    mangle: false,
                    gfm: true
                });

                renderedHtml = marked.parse(markdownContent);
            } catch (parseErr) {
                console.warn('Marked library failed to load, falling back to basic formatting:', parseErr);
                renderedHtml = markdownContent.replace(/\n\n/g, '<br><br>');
            }

            // 3. Render HTML to Container
            container.innerHTML = `
                <article class="single-blog py-3 w-100">
                    <nav aria-label="breadcrumb" class="mb-4">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item"><a href="blog.html" class="text-decoration-none">Blog Feed</a></li>
                            <li class="breadcrumb-item active text-truncate" aria-current="page" style="max-width: 300px;">${singleTitle}</li>
                        </ol>
                    </nav>

                    <h1 class="fw-bold text-dark mb-3">${singleTitle}</h1>
                    <p class="text-muted mb-4">
                        <i class="bi bi-person-circle me-1"></i> By ${singleAuthor} &bull; 
                        <span class="badge bg-secondary ms-1">${singleCategory}</span>
                    </p>
                    
                    ${singleImage ? `
                        <div class="my-4">
                            <img src="${singleImage.startsWith('/') || singleImage.startsWith('http') ? singleImage : '/' + singleImage}" alt="${singleTitle}" class="img-fluid rounded shadow-sm w-100 object-fit-cover" style="max-height: 450px;">
                        </div>
                    ` : ''}

                    <div class="blog-content mt-4 text-secondary lh-lg fs-5">
                        ${renderedHtml}
                    </div>
                </article>
            `;
        } else {
            // --- Render Blog List Feed ---
            const responseData = await API.getBlogs();
            
            let allBlogs = [];
            if (Array.isArray(responseData)) {
                allBlogs = responseData;
            } else if (responseData && Array.isArray(responseData.blogs)) {
                allBlogs = responseData.blogs;
            } else if (responseData) {
                allBlogs = [responseData];
            }
            
            if (allBlogs.length === 0) {
                container.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">No blog posts found.</p></div>`;
                return;
            }

            let currentLimit = 0;
            const postsPerPage = 6;

            container.innerHTML = `
                <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 w-100 m-0" id="blog-grid"></div>
                <div id="pagination-placeholder" class="d-flex justify-content-center mt-5 w-100"></div>
            `;

            const grid = document.getElementById('blog-grid');
            const paginationPlaceholder = document.getElementById('pagination-placeholder');

            const loadNextBatch = () => {
                const nextLimit = currentLimit + postsPerPage;
                const batch = allBlogs.slice(currentLimit, nextLimit);

                const html = batch.map(post => {
                    const imageUrl = post.image || post.Image || post.FeaturedImage || post.featuredImage || 'https://via.placeholder.com/400x200';
                    const postTitle = post.title || post.Title || 'Untitled Post';
                    const postSlug = post.slug || post.Slug || '#';
                    const postExcerpt = post.excerpt || post.Excerpt || post.MetaDescription || 'Read our in-depth guide on workshop tools and equipment...';
                    const postCategory = post.category || post.Category || 'General';
                    const postDate = post.date || post.Date || 'Recent Guide';

                    return `
                        <div class="col">
                            <div class="card h-100 shadow-sm border-0 rounded-3 overflow-hidden">
                                <div class="position-relative bg-light" style="height: 200px; overflow: hidden;">
                                    <img src="${imageUrl.startsWith('/') || imageUrl.startsWith('http') ? imageUrl : '/' + imageUrl}" alt="${postTitle}" class="w-100 h-100 object-fit-cover">
                                    <span class="badge bg-dark bg-opacity-75 position-absolute top-0 start-0 m-3 px-2.5 py-1.5 small">${postCategory}</span>
                                </div>
                                <div class="card-body d-flex flex-column p-4">
                                    <div class="text-muted small mb-2">
                                        <i class="bi bi-calendar3 me-1"></i> ${postDate}
                                    </div>
                                    <h5 class="card-title fw-bold text-dark mb-2">
                                        <a href="blog.html?slug=${postSlug}" class="text-dark text-decoration-none stretched-link">
                                            ${postTitle}
                                        </a>
                                    </h5>
                                    <p class="card-text text-muted small flex-grow-1 mb-4">
                                        ${postExcerpt}
                                    </p>
                                    <div class="d-flex align-items-center justify-content-between pt-3 border-top mt-auto">
                                        <span class="text-primary fw-semibold small">Read Full Article &rarr;</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                grid.insertAdjacentHTML('beforeend', html);
                currentLimit += batch.length;

                if (currentLimit < allBlogs.length) {
                    paginationPlaceholder.innerHTML = `
                        <button id="load-more-btn" class="btn btn-outline-primary px-4 py-2 rounded-pill fw-semibold shadow-sm">
                            Load More Articles (${allBlogs.length - currentLimit} remaining)
                        </button>
                    `;
                    document.getElementById('load-more-btn').addEventListener('click', loadNextBatch);
                } else {
                    paginationPlaceholder.innerHTML = '<p class="text-muted small text-center italic">You have viewed all blog posts.</p>';
                }
            };

            loadNextBatch();
        }
    } catch (err) {
        console.error("Critical error rendering blog:", err);
        container.innerHTML = `<div class="col-12"><div class="alert alert-danger text-center">An unexpected error occurred: ${err.message}</div></div>`;
    }
});
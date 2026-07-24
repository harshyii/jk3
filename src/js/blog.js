/**
 * Haryana Tools - Blog JavaScript Handler
 */

import { API } from './api.js';

// Helper function to robustly resolve image URLs (handles absolute HTTP links, relative paths, etc.)
function resolveImageUrl(img) {
    if (!img) return 'https://picsum.photos/400/200';
    if (typeof img === 'string') {
        const trimmed = img.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
            return trimmed;
        }
        return '/' + trimmed;
    }
    return img.url || img.src || img.path || 'https://picsum.photos/400/200';
}

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

            const rawImage = post.FeaturedImage || post.featuredImage || post.image || post.Image;
            const singleImage = resolveImageUrl(rawImage);
            
            const singleTitle = post.Title || post.title || 'Untitled Post';
            const singleAuthor = post.Author || post.author || 'Admin';
            const singleCategory = post.Category || post.category || 'General';
            
            let mdFileSource = post.MarkdownFile || post.markdownFile || post.file || post.File || `${slug}.md`;
            
            let cleanRelativePath = mdFileSource.replace(/^\/+/, '');
            if (!cleanRelativePath.startsWith('src/') && !cleanRelativePath.startsWith('dist/')) {
                cleanRelativePath = `src/data/blogs/${cleanRelativePath}`;
            }

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

            let renderedHtml = markdownContent;
            try {
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
                            <img src="${singleImage}" alt="${singleTitle}" class="img-fluid rounded shadow-sm w-100 object-fit-cover" style="max-height: 450px;">
                        </div>
                    ` : ''}

                    <div class="blog-content mt-4 text-secondary lh-lg fs-5">
                        ${renderedHtml}
                    </div>
                </article>
            `;
        } else {
            const responseData = await API.getBlogs();
            
            let allBlogs = [];
            if (Array.isArray(responseData)) {
                allBlogs = responseData;
            } else if (responseData && Array.isArray(responseData.blogs)) {
                allBlogs = responseData.blogs;
            } else if (responseData) {
                allBlogs = [responseData];
            }
            
            allBlogs.sort((a, b) => {
                const dateA = new Date(a.Date || a.date || 0);
                const dateB = new Date(b.Date || b.date || 0);
                return dateB - dateA;
            });
            
            if (allBlogs.length === 0) {
                container.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">No blog posts found.</p></div>`;
                return;
            }

            const postsPerPage = 6;
            let currentPage = 1;

            container.innerHTML = `
                <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 w-100 m-0" id="blog-grid"></div>
                <div id="pagination-placeholder" class="d-flex justify-content-center mt-5 w-100"></div>
            `;

            const grid = document.getElementById('blog-grid');
            const paginationPlaceholder = document.getElementById('pagination-placeholder');

            const renderPage = (page) => {
                currentPage = page;
                const start = (currentPage - 1) * postsPerPage;
                const end = start + postsPerPage;
                const pagePosts = allBlogs.slice(start, end);

                grid.innerHTML = pagePosts.map(post => {
                    const rawImage = post.FeaturedImage || post.featuredImage || post.image || post.Image;
                    const imageUrl = resolveImageUrl(rawImage);
                    
                    const postTitle = post.Title || post.title || 'Untitled Post';
                    const postSlug = post.Slug || post.slug || '#';
                    const postExcerpt = post.MetaDescription || post.excerpt || post.Excerpt || 'Read our in-depth guide on workshop tools and equipment...';
                    const postCategory = post.Category || post.category || 'General';
                    
                    const rawDate = post.Date || post.date;
                    let postDate = 'Recent Guide';
                    if (rawDate) {
                        const parsedDate = new Date(rawDate);
                        if (!isNaN(parsedDate.getTime())) {
                            postDate = parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                        } else {
                            postDate = rawDate;
                        }
                    }

                    return `
                        <div class="col">
                            <div class="card h-100 shadow-sm border-0 rounded-3 overflow-hidden">
                                <div class="position-relative bg-light" style="height: 200px; overflow: hidden;">
                                    <img src="${imageUrl}" alt="${postTitle}" class="w-100 h-100 object-fit-cover">
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

                renderPaginationControls();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            const renderPaginationControls = () => {
                let paginationPlaceholder = document.getElementById('pagination-placeholder');
                if (!paginationPlaceholder) return;

                const totalPages = Math.ceil(allBlogs.length / postsPerPage);
                if (totalPages <= 1) {
                    paginationPlaceholder.innerHTML = '';
                    return;
                }

                paginationPlaceholder.innerHTML = `
                    <nav aria-label="Pagination" class="pagination-wrapper">
                        <ul id="pagination-container" class="pagination"></ul>
                    </nav>
                `;

                const paginationContainer = document.getElementById('pagination-container');
                if (!paginationContainer) return;

                let html = '';

                html += `
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">Previous</button>
                    </li>
                `;

                for (let i = 1; i <= totalPages; i++) {
                    html += `
                        <li class="page-item ${i === currentPage ? 'active' : ''}">
                            <button class="page-link" data-page="${i}">${i}</button>
                        </li>
                    `;
                }

                html += `
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <button class="page-link" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next</button>
                    </li>
                `;

                paginationContainer.innerHTML = html;

                paginationContainer.querySelectorAll('button.page-link').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const targetPage = parseInt(e.target.getAttribute('data-page'));
                        if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
                            renderPage(targetPage);
                        }
                    });
                });
            };
            
            renderPage(1);
        }
    } catch (err) {
        console.error("Critical error rendering blog:", err);
        container.innerHTML = `<div class="col-12"><div class="alert alert-danger text-center">An unexpected error occurred: ${err.message}</div></div>`;
    }
});
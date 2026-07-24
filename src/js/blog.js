/**
 * Haryana Tools - Blog Page Controller
 */

import { API } from './api.js';

function escapeHtml(str) {
    if (!str) return '';
    return str
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('blog-list-container');
    if (!container) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');

        if (slug) {
            // --- Single Blog Post View ---
            const post = await API.getBlog(slug);
            
            if (!post) {
                container.innerHTML = `<div class="alert alert-warning text-center my-5">Blog post "${escapeHtml(slug)}" could not be found.</div>`;
                return;
            }

            const singleTitle = post.title || post.Title || 'Untitled Post';
            const singleAuthor = post.author || post.Author || 'Admin';
            const singleCategory = post.category || post.Category || 'General';
            const singleImage = post.image || post.FeaturedImage || post.featuredImage || 'src/images/placeholder.jpg';
            
            let rawDate = post.date || post.Date || '';
            let displayDate = (rawDate && isNaN(rawDate)) ? rawDate : 'Recent Guide';

            let mdFileSource = post.markdownFile || post.MarkdownFile || post.file || `${slug}.md`;
            let cleanRelativePath = mdFileSource.replace(/^\/+/, '');
            if (!cleanRelativePath.startsWith('src/') && !cleanRelativePath.startsWith('dist/')) {
                cleanRelativePath = `src/data/blogs/${cleanRelativePath}`;
            }

            let markdownContent = '';
            const pathsToTry = [
                `/${cleanRelativePath}`,
                `/${cleanRelativePath.replace('src/', 'dist/')}`,
                `./${cleanRelativePath}`,
                `data/blogs/${cleanRelativePath.split('/').pop()}`,
                `./src/data/blogs/${cleanRelativePath.split('/').pop()}`
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
                markdownContent = `### Content Unavailable\nSorry, the markdown content for this post could not be loaded.`;
            }

            let renderedHtml = markdownContent;
            try {
                const { marked } = await import('https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js');
                marked.setOptions({ headerIds: true, mangle: false, gfm: true });
                renderedHtml = marked.parse(markdownContent);
            } catch (parseErr) {
                renderedHtml = markdownContent.replace(/\n\n/g, '<br><br>');
            }

            container.innerHTML = `
                <article class="single-blog py-3 w-100">
                    <nav aria-label="breadcrumb" class="mb-4">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item"><a href="blog.html" class="text-decoration-none">Blog Feed</a></li>
                            <li class="breadcrumb-item active text-truncate" aria-current="page" style="max-width: 300px;">${escapeHtml(singleTitle)}</li>
                        </ol>
                    </nav>

                    <h1 class="fw-bold text-dark mb-3">${escapeHtml(singleTitle)}</h1>
                    <p class="text-muted mb-4">
                        <i class="bi bi-person-circle me-1"></i> By ${escapeHtml(singleAuthor)} &bull; 
                        <i class="bi bi-calendar3 ms-2 me-1"></i> ${escapeHtml(displayDate)} &bull;
                        <span class="badge bg-secondary ms-1">${escapeHtml(singleCategory)}</span>
                    </p>
                    
                    ${singleImage ? `
                        <div class="my-4">
                            <img src="${escapeHtml(singleImage)}" alt="${escapeHtml(singleTitle)}" class="img-fluid rounded shadow-sm w-100 object-fit-cover" style="max-height: 450px;">
                        </div>
                    ` : ''}

                    <div class="blog-content mt-4 text-secondary lh-lg fs-5">
                        ${renderedHtml}
                    </div>
                </article>
            `;
        } else {
            // --- Blog Feed View (Grid matching homepage logic) ---
            const responseData = await API.getBlogs();
            
            let allBlogs = [];
            if (Array.isArray(responseData)) {
                allBlogs = responseData;
            } else if (responseData && Array.isArray(responseData.blogs)) {
                allBlogs = responseData.blogs;
            } else if (responseData) {
                allBlogs = [responseData];
            }
            
            // Safe sort matching home.js style
            allBlogs.sort((a, b) => {
                const dateA = new Date(a.date || a.Date || 0);
                const dateB = new Date(b.date || b.Date || 0);
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

            const renderPage = (page) => {
                currentPage = page;
                const start = (currentPage - 1) * postsPerPage;
                const end = start + postsPerPage;
                const pagePosts = allBlogs.slice(start, end);

                grid.innerHTML = pagePosts.map(blog => {
                    const rawDate = blog.date || blog.Date || '';
                    const displayDate = (rawDate && isNaN(rawDate)) ? rawDate : 'Recent Guide';
                    const blogImage = blog.image || blog.FeaturedImage || blog.featuredImage || 'src/images/placeholder.jpg';
                    const blogTitle = blog.title || blog.Title || 'Untitled Post';
                    const blogSlug = blog.slug || blog.Slug || '#';
                    const blogExcerpt = blog.excerpt || blog.MetaDescription || blog.metaDescription || '';
                    const blogCategory = blog.category || blog.Category || 'General';

                    return `
                        <div class="col mb-4">
                            <div class="card h-100 shadow-sm border-0 rounded-3 overflow-hidden d-flex flex-column">
                                <div class="position-relative bg-light" style="height: 200px; overflow: hidden;">
                                    <img src="${escapeHtml(blogImage)}" alt="${escapeHtml(blogTitle)}" class="w-100 h-100 object-fit-cover">
                                    <span class="badge bg-dark bg-opacity-75 position-absolute top-0 start-0 m-3 px-2.5 py-1.5 small">${escapeHtml(blogCategory)}</span>
                                </div>
                                <div class="card-body d-flex flex-column p-4">
                                    <div class="text-muted small mb-2">
                                        <i class="bi bi-calendar3 me-1"></i> ${escapeHtml(displayDate)}
                                    </div>
                                    <h5 class="card-title fw-bold text-dark mb-2">
                                        <a href="blog.html?slug=${escapeHtml(blogSlug)}" class="text-dark text-decoration-none stretched-link">
                                            ${escapeHtml(blogTitle)}
                                        </a>
                                    </h5>
                                    <p class="card-text text-muted small flex-grow-1 mb-4">
                                        ${escapeHtml(blogExcerpt)}
                                    </p>
                                    <div class="d-flex align-items-center justify-content-between pt-3 border-top mt-auto">
                                        <span class="text-primary fw-semibold small position-relative z-1">Read Full Article &rarr;</span>
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

                let html = `
                    <nav aria-label="Pagination">
                        <ul class="pagination">
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
                        </ul>
                    </nav>
                `;

                paginationPlaceholder.innerHTML = html;

                paginationPlaceholder.querySelectorAll('button.page-link').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const targetPage = parseInt(e.target.getAttribute('data-page'), 10);
                        if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
                            renderPage(targetPage);
                        }
                    });
                });
            };
            
            renderPage(1);
        }
    } catch (err) {
        console.error("Critical error rendering blog page:", err);
        container.innerHTML = `<div class="col-12"><div class="alert alert-danger text-center">An unexpected error occurred loading blogs.</div></div>`;
    }
});
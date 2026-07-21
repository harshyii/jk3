/**
 * Haryana Tools - Single Blog Detail Controller
 */

import { API } from './api.js';
import { UI } from './ui.js';

const PostDetail = {
    async init() {
        UI.setLoading(true);
        try {
            const params = new URLSearchParams(window.location.search);
            const slug = params.get('slug');

            if (!slug) {
                this.showError('No blog post specified.');
                return;
            }

            // 1. Fetch JSON metadata
            const post = await API.getBlog(slug);

            if (!post) {
                this.showError('Blog post not found.');
                return;
            }

            // 2. Set page data
            document.title = `${post.SEOTitle || post.Title} - Haryana Tools`;

            const titleEl = document.getElementById('blog-title');
            if (titleEl) titleEl.textContent = post.Title;

            const metaEl = document.getElementById('blog-meta');
            if (metaEl) {
                metaEl.innerHTML = `
                    <span>By <strong>${post.Author || 'JK Enterprises'}</strong></span> &bull; 
                    <span>Category: <em>${post.Category || 'General'}</em></span>
                `;
            }

            const imageContainer = document.getElementById('blog-image-container');
            if (imageContainer && post.FeaturedImage) {
                imageContainer.innerHTML = `
                    <img src="${post.FeaturedImage}" alt="${post.Title}" class="img-fluid rounded w-100" style="max-height: 400px; object-fit: cover;">
                `;
            }

            // 3. Inject content directly from the embedded script template element
            const contentEl = document.getElementById('blog-content');
            if (contentEl) {
                const templateEl = document.getElementById(`content-${slug}`);
                
                if (templateEl) {
                    contentEl.innerHTML = `
                        <p class="lead">${post.MetaDescription || ''}</p>
                        <hr class="my-4">
                        <div class="blog-html-wrapper">${templateEl.innerHTML}</div>
                    `;
                } else {
                    contentEl.innerHTML = `
                        <p class="lead">${post.MetaDescription || ''}</p>
                        <hr class="my-4">
                        <p class="text-danger">Content template not found for slug: ${slug}</p>
                    `;
                }
            }

        } catch (err) {
            console.error('Error loading blog detail:', err);
            this.showError('An error occurred while loading the blog post.');
        } finally {
            UI.setLoading(false);
        }
    },

    showError(message) {
        const container = document.getElementById('blog-detail-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger text-center my-5" role="alert">
                    <h2>Oops!</h2>
                    <p>${message}</p>
                    <a href="post.html" class="btn btn-primary mt-3">Back to Blog List</a>
                </div>
            `;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => PostDetail.init());
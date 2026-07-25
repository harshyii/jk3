import { API } from "./api.js";
import { UI } from "./ui.js";

const PostDetail = {

    async init() {
        UI.setLoading(true);

        try {
            const params = new URLSearchParams(window.location.search);
            const slug = params.get("slug");

            if (!slug) {
                this.showError("No blog post specified.");
                return;
            }

            const post = await API.getBlog(slug);

            if (!post) {
                this.showError("Blog post not found.");
                return;
            }

            this.updateSEO(post);
            this.render(post);

        } catch (err) {

            console.error(err);
            this.showError("An error occurred while loading the blog.");

        } finally {

            UI.setLoading(false);

        }
    },

    updateSEO(post) {

        document.title =
            `${post.SEOTitle || post.Title} | Haryana Tools`;

        this.setMeta(
            "description",
            post.MetaDescription || ""
        );

        this.setCanonical(
            post.CanonicalURL || location.href
        );

        this.setOG(
            "og:title",
            post.SEOTitle || post.Title
        );

        this.setOG(
            "og:description",
            post.MetaDescription
        );

        this.setOG(
            "og:image",
            post.FeaturedImage
        );

        this.setOG(
            "og:url",
            post.CanonicalURL || location.href
        );

        this.setOG(
            "og:type",
            "article"
        );

        this.setTwitter(
            "twitter:card",
            "summary_large_image"
        );

        this.setTwitter(
            "twitter:title",
            post.SEOTitle || post.Title
        );

        this.setTwitter(
            "twitter:description",
            post.MetaDescription
        );

        this.setTwitter(
            "twitter:image",
            post.FeaturedImage
        );

        this.addArticleSchema(post);
        this.addOrganizationSchema(post);
    },

    setMeta(name, content) {

        let tag =
            document.querySelector(
                `meta[name="${name}"]`
            );

        if (!tag) {

            tag = document.createElement("meta");
            tag.name = name;
            document.head.appendChild(tag);

        }

        tag.content = content || "";
    },

    setCanonical(url) {

        let tag =
            document.querySelector(
                'link[rel="canonical"]'
            );

        if (!tag) {

            tag = document.createElement("link");
            tag.rel = "canonical";
            document.head.appendChild(tag);

        }

        tag.href = url;
    },

    setOG(property, content) {

        let tag =
            document.querySelector(
                `meta[property="${property}"]`
            );

        if (!tag) {

            tag = document.createElement("meta");
            tag.setAttribute(
                "property",
                property
            );

            document.head.appendChild(tag);

        }

        tag.content = content || "";
    },

    setTwitter(name, content) {

        let tag =
            document.querySelector(
                `meta[name="${name}"]`
            );

        if (!tag) {

            tag = document.createElement("meta");
            tag.name = name;
            document.head.appendChild(tag);

        }

        tag.content = content || "";
    },

    addArticleSchema(post) {

        document
            .querySelectorAll(
                'script[data-schema="article"]'
            )
            .forEach(e => e.remove());

        const schema = {

            "@context": "https://schema.org",
            "@type": "BlogPosting",

            headline:
                post.Title,

            description:
                post.MetaDescription,

            image:
                post.FeaturedImage,

            author: {

                "@type": "Organization",

                name:
                    post.Author || "JK Enterprises"

            },

            publisher: {

                "@type": "Organization",

                name:
                    "JK Enterprises",

                logo: {

                    "@type": "ImageObject",

                    url:
                        "https://www.haryana.tools/assets/images/logo.png"

                }

            },

            datePublished:
                post.Date,

            dateModified:
                post.LastUpdated || post.Date,

            mainEntityOfPage: {

                "@type": "WebPage",

                "@id":
                    post.CanonicalURL || location.href

            }

        };

        const script =
            document.createElement("script");

        script.type =
            "application/ld+json";

        script.dataset.schema =
            "article";

        script.textContent =
            JSON.stringify(schema);

        document.head.appendChild(script);
    },
        addOrganizationSchema() {

        document
            .querySelectorAll(
                'script[data-schema="organization"]'
            )
            .forEach(e => e.remove());

        const schema = {

            "@context": "https://schema.org",

            "@type": "Organization",

            name: "JK Enterprises",

            url: "https://www.haryana.tools",

            logo: "https://www.haryana.tools/assets/images/logo.png",

            sameAs: [

                "https://www.facebook.com/",
                "https://www.linkedin.com/",
                "https://www.youtube.com/"

            ]

        };

        const script =
            document.createElement("script");

        script.type =
            "application/ld+json";

        script.dataset.schema =
            "organization";

        script.textContent =
            JSON.stringify(schema);

        document.head.appendChild(script);

    },

    render(post) {

        const title =
            document.getElementById("blog-title");

        if (title)
            title.textContent = post.Title;

        const meta =
            document.getElementById("blog-meta");

        if (meta) {

            const date =
                post.Date
                    ? new Date(post.Date)
                          .toLocaleDateString()
                    : "";

            meta.innerHTML = `

                <span>
                    By
                    <strong>
                        ${post.Author || "JK Enterprises"}
                    </strong>
                </span>

                &bull;

                <span>
                    ${date}
                </span>

                &bull;

                <span>
                    ${post.Category || "General"}
                </span>

            `;

        }

        const content =
            document.getElementById("blog-content");

        if (!content)
            return;

        const template =
            document.getElementById(
                `content-${post.Slug}`
            );

        if (!template) {

            content.innerHTML = `

                <div class="alert alert-danger">

                    Content template not found.

                </div>

            `;

            return;

        }

        content.innerHTML = `

            <div class="blog-summary alert alert-light border">

                <strong>Summary:</strong>

                ${post.MetaDescription || ""}

            </div>

            <div class="blog-html-wrapper">

                ${template.innerHTML}

            </div>

        `;

        window.scrollTo({

            top: 0,

            behavior: "instant"

        });

    },

    showError(message) {

        const container =
            document.getElementById(
                "blog-detail-container"
            );

        if (!container)
            return;

        container.innerHTML = `

            <div
                class="alert alert-danger
                       text-center
                       my-5">

                <h2>

                    Oops!

                </h2>

                <p>

                    ${message}

                </p>

                <a
                    href="blogs.html"
                    class="btn btn-primary">

                    Back to Blogs

                </a>

            </div>

        `;

    }

};

document.addEventListener(

    "DOMContentLoaded",

    () => PostDetail.init()

);
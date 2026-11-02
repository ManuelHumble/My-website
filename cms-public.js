(async function () {
  var config = window.CMS_CONFIG || {};
  var targets = {
    home: document.querySelector("[data-cms-home-projects]"),
    projects: document.querySelector("[data-cms-projects]"),
    articles: document.querySelector("[data-cms-articles]"),
    articleBodies: document.querySelector("[data-cms-article-bodies]"),
    page: document.body.dataset.cmsPage || ""
  };
  if (!Object.values(targets).some(Boolean)) return;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function safeUrl(value) {
    try { var url = new URL(value); return ["http:","https:","mailto:"].includes(url.protocol) ? url.href : ""; }
    catch (_) { return ""; }
  }
  function safeImageUrl(value) {
    try { var url = new URL(value); return ["http:","https:"].includes(url.protocol) ? url.href : ""; }
    catch (_) { return ""; }
  }
  function markdown(raw) {
    var out = [], list = "";
    function closeList() { if (list) out.push("</" + list + ">"); list = ""; }
    function inline(value) {
      return esc(value)
        .replace(/\x60([^\x60]+)\x60/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_m, label, url) {
          return '<a href="' + esc(safeUrl(url)) + '" target="_blank" rel="noreferrer">' + label + "</a>";
        });
    }
    String(raw || "").replace(/\r/g, "").split("\n").forEach(function (line) {
      var heading = line.match(/^(#{1,3})\s+(.+)$/);
      var bullet = line.match(/^\s*[-*]\s+(.+)$/);
      var number = line.match(/^\s*\d+\.\s+(.+)$/);
      if (heading) {
        closeList();
        var n = heading[1].length;
        out.push("<h" + n + ">" + inline(heading[2]) + "</h" + n + ">");
      } else if (bullet || number) {
        var next = bullet ? "ul" : "ol";
        if (list !== next) { closeList(); list = next; out.push("<" + list + ">"); }
        out.push("<li>" + inline((bullet || number)[1]) + "</li>");
      } else if (/^>\s?/.test(line)) {
        closeList(); out.push("<blockquote>" + inline(line.replace(/^>\s?/, "")) + "</blockquote>");
      } else if (line.trim()) {
        closeList(); out.push("<p>" + inline(line) + "</p>");
      } else closeList();
    });
    closeList();
    return out.join("");
  }
  function tagsMarkup(tags) {
    tags = Array.isArray(tags) ? tags : [];
    return tags.length ? '<div class="tags">' + tags.map(function (tag) { return "<span>" + esc(tag) + "</span>"; }).join("") + "</div>" : "";
  }
  function imageMarkup(item, href, label) {
    var url = safeImageUrl(item.image_url);
    if (!url) return "";
    var caption = item.image_caption ? "<figcaption>" + esc(item.image_caption) + "</figcaption>" : "";
    return '<figure class="project-image"><a class="media-link" href="' + esc(href) + '" aria-label="' + esc(label) + '"><img src="' + esc(url) + '" alt="' + esc(item.image_alt) + '" title="' + esc(item.image_title) + '" loading="lazy"></a>' + caption + "</figure>";
  }
  function galleryMarkup(images, href, label) {
    images = Array.isArray(images) ? images.filter(function (image) { return safeImageUrl(image.url); }) : [];
    if (!images.length) return "";
    return '<div class="content-gallery" role="group" aria-label="Image gallery">' + images.map(function (image, index) {
      var description = image.title || image.alt || "gallery image " + (index + 1);
      var caption = image.caption ? "<figcaption>" + esc(image.caption) + "</figcaption>" : "";
      return '<figure><a class="media-link" href="' + esc(href) + '" aria-label="' + esc(label + " — " + description) + '"><img src="' + esc(safeImageUrl(image.url)) + '" alt="' + esc(image.alt) + '" title="' + esc(image.title) + '" loading="lazy"></a>' + caption + "</figure>";
    }).join("") + "</div>";
  }
  function projectMarkup(item, index) {
    var slug = esc(item.slug);
    var contentId = "project-content-" + slug;
    var hasContent = Boolean(item.body_markdown || (item.gallery_images && item.gallery_images.length));
    var imageHref = "projects.html#" + (hasContent ? contentId : slug);
    var imageLabel = "Read the " + item.title + " project content";
    var image = imageMarkup(item, imageHref, imageLabel);
    if (!image) image = '<a class="project-art-link" href="' + esc(imageHref) + '" aria-label="' + esc(imageLabel) + '"><div class="project-art project-art-a" aria-hidden="true"><span>Clinical</span><b>' + esc(item.title) + '</b><span>Data</span><i></i></div></a>';
    var content = hasContent
      ? '<div class="project-case-study" id="' + esc(contentId) + '">' +
        (item.body_markdown ? '<div class="markdown-content">' + markdown(item.body_markdown) + "</div>" : "") +
        galleryMarkup(item.gallery_images, imageHref, imageLabel) + "</div>"
      : "";
    var repo = safeUrl(item.project_url)
      ? '<a class="text-link project-external" href="' + esc(safeUrl(item.project_url)) + '" target="_blank" rel="noreferrer">' + esc(item.project_label || "View repository") + ' <span aria-hidden="true">↗</span></a>'
      : "";
    return '<article class="project-item' + (index % 2 ? " reverse" : "") + (hasContent ? " has-case-study" : "") + '" id="' + slug + '">' +
      image + '<div class="project-copy"><h3>' + esc(item.title) + "</h3><p>" + esc(item.description) + "</p>" +
      tagsMarkup(item.tags) + content + repo + "</div></article>";
  }
  function dateLabel(value) {
    if (!value) return "Recently published";
    var date = new Date(value);
    return Number.isNaN(date.valueOf()) ? "Recently published" : new Intl.DateTimeFormat(undefined, {year:"numeric",month:"long",day:"numeric"}).format(date);
  }
  function articleAnchor(item) { return "article-" + item.slug; }
  function articleRow(item) {
    var anchor = articleAnchor(item);
    return '<article><time datetime="' + esc(item.published_at || "") + '">' + esc(dateLabel(item.published_at)) + '</time><div><h3><a href="#' + esc(anchor) + '">' + esc(item.title) + "</a></h3><p>" + esc(item.description) + "</p>" + tagsMarkup(item.tags) + '</div><a href="#' + esc(anchor) + '" aria-label="Read ' + esc(item.title) + '">↘</a></article>';
  }
  function articleBody(item) {
    var anchor = articleAnchor(item);
    var target = "blog.html#" + anchor;
    var label = "Read article: " + item.title;
    return '<article id="' + esc(anchor) + '">' + imageMarkup(item, target, label) + "<h2>" + esc(item.title) + '</h2><p class="article-date">' +
      esc(dateLabel(item.published_at)) + '</p><div class="markdown-content">' + markdown(item.body_markdown) + "</div>" +
      galleryMarkup(item.gallery_images, target, label) + "</article>";
  }
  function empty(target, message) { target.innerHTML = '<p class="cms-empty">' + esc(message) + "</p>"; }
  function renderPage(page, profilePage) {
    if (!page) return;
    var title = document.querySelector("[data-cms-page-title]");
    var description = document.querySelector("[data-cms-page-description]");
    var content = document.querySelector("[data-cms-page-content]");
    if (title) {
      if (targets.page === "home") {
        var homeTitle = String(page.title || "").trim().split(/\s+/);
        title.innerHTML = homeTitle.length > 1 ? esc(homeTitle.shift()) + "<br><span>" + esc(homeTitle.join(" ")) + "</span>" : esc(page.title);
      }
      else title.textContent = page.title;
      document.title = page.title + " | Okoro Emmanuel";
    }
    if (description) description.textContent = page.description || "";
    var meta = document.querySelector('meta[name="description"]');
    if (meta && page.description) meta.content = page.description;
    if (content) content.innerHTML = markdown(page.body_markdown || "");
    var imagePage = targets.page === "home" ? (profilePage || page) : page;
    if (imagePage.image_url) {
      var imageUrl = safeImageUrl(imagePage.image_url);
      if (imageUrl) document.querySelectorAll("[data-cms-page-image]").forEach(function (image) {
        image.src = imageUrl;
        image.alt = imagePage.image_alt || imagePage.image_title || "Profile image";
        if (imagePage.image_title) image.title = imagePage.image_title;
      });
    }
    var tags = document.querySelector("[data-cms-page-tags]");
    if (tags && Array.isArray(page.tags)) tags.innerHTML = page.tags.map(function (tag) { return "<span>" + esc(tag) + "</span>"; }).join("");
    var links = document.querySelector("[data-cms-page-links]");
    if (links && Array.isArray(page.links)) links.innerHTML = page.links.filter(function (link) { return link.label && safeUrl(link.url); }).map(function (link) {
      var href = safeUrl(link.url);
      var external = /^https?:/.test(href);
      var tail = external ? ' <span aria-hidden="true">↗</span>' : "";
      return '<a href="' + esc(href) + '"' + (external ? ' target="_blank" rel="noreferrer"' : "") + ">" + esc(link.label) + tail + "</a>";
    }).join("");
  }

  async function load() {
    try {
      var rows = [];
      if (config.supabaseUrl && config.supabaseAnonKey) {
        var module = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
        var client = module.createClient(config.supabaseUrl, config.supabaseAnonKey, {auth:{persistSession:false,autoRefreshToken:false}});
        var result = await client.from("portfolio_content").select("*").eq("status","published").order("published_at",{ascending:false});
        if (result.error) throw result.error;
        rows = result.data || [];
      } else {
        var local = localStorage.getItem("okoro-cms-content-v1");
        if (!local) return;
        rows = JSON.parse(local).filter(function (item) { return item.status === "published"; });
      }
      var projects = rows.filter(function (item) { return item.kind === "project"; });
      var articles = rows.filter(function (item) { return item.kind === "article"; });
      if (targets.page) renderPage(
        rows.find(function (item) { return item.kind === "page" && item.slug === "page-" + targets.page; }),
        rows.find(function (item) { return item.kind === "page" && item.slug === "page-about"; })
      );
      if (targets.home) {
        var featured = projects.filter(function (item) { return item.featured; }).slice(0,3);
        if (featured.length) {
          targets.home.innerHTML = featured.map(function (item) {
            var target = "projects.html#" + (item.body_markdown || (item.gallery_images && item.gallery_images.length) ? "project-content-" + item.slug : item.slug);
            return '<article><h3><a href="' + esc(target) + '">' + esc(item.title) + ' <span aria-hidden="true">↗</span></a></h3><p>' + esc(item.description) + "</p>" + tagsMarkup(item.tags) + "</article>";
          }).join("");
        } else empty(targets.home, "No featured projects are published yet.");
      }
      if (targets.projects) targets.projects.innerHTML = projects.length ? projects.map(projectMarkup).join("") : '<p class="cms-empty">No projects have been published yet.</p>';
      if (targets.articles) targets.articles.innerHTML = articles.length ? articles.map(articleRow).join("") : '<p class="cms-empty">No articles have been published yet.</p>';
      if (targets.articleBodies) targets.articleBodies.innerHTML = articles.length ? articles.map(articleBody).join("") : '<p class="cms-empty">Published articles will appear here.</p>';
    } catch (error) {
      console.warn("CMS content refresh failed; retaining the page content.", error);
    }
  }
  load();
})();


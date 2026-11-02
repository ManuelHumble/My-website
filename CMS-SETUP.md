# Content Studio setup

The site is static HTML, so the admin uses Supabase for secure sign-in, content storage, and image uploads. A published item is read from Supabase by the public pages, so edits go live without rebuilding or redeploying the site files.

## Before cloud setup

Open `/admin/` now to see the current projects, draft articles, and editable Home, About, Projects, Blog, and Contact page entries already loaded into the editor. Until Supabase is connected, saves and publishing are a local preview in this browser only. Use **Export backup** to save the edited content as JSON. Cover and gallery image uploads and public publishing activate after the cloud setup.

## 1. Create the content store

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. Open **SQL Editor**, paste all of `supabase-schema.sql`, and run it.
3. In **Authentication → Users**, invite `your.okoromanuel@gmail.com` as the owner account. Public sign-ups are not needed.
4. In **Authentication → URL Configuration**, add the eventual live admin URL (for example `https://your-domain.example/admin/`) to the allowed redirect URLs. Add your local preview URL too while developing.
5. In **Project Settings → API**, copy the Project URL and the public anon/publishable key. Do not use a service role or secret key in the website.

The database policies restrict content writes and image uploads to the owner email above. Public visitors can read published content and its public images only.

## 2. Connect the site

Edit `cms-config.js` and fill in the two public settings:

```js
window.CMS_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR-PUBLIC-ANON-KEY",
};
```

The anon key is intended to be visible in a public site. The row-level security policies in `supabase-schema.sql` are what protect writes. Never place a Supabase service-role key in this file.

## 3. Deploy the site

This folder includes `netlify.toml` for a static Netlify deploy. Put the project in a Git repository, connect that repository to Netlify, and deploy the root folder. There is no build command. Netlify serves the public pages and `/admin/` over HTTPS; Supabase holds the editable content.

The project currently has no Git remote or live deployment, so the Netlify site and Supabase project still need to be created and connected once. After that setup, new content is published from the admin and appears on the site without a code deploy.

## 4. Use the admin

1. Open `https://YOUR-SITE/admin/` and sign in with the invited owner email. Supabase sends a one-time sign-in link.
2. Choose **Projects**, **Articles**, or **Pages**. The Pages list contains Home, About, Projects, Blog, and Contact. To move the local content into the cloud CMS, export a backup in local mode, then use **Import backup** after the Supabase connection is configured, or choose **Import existing site content** from an empty content list. Draft articles and the sample data-quality concept stay drafts.
3. Add or edit the title, URL slug, summary, tags, link, image, image title, alternative text, image caption/credit, and full Markdown article or project notes.
4. Use **Save draft** to keep an item private. Choose **Publish** to show it publicly. Delete asks for confirmation before removal.

Markdown supports headings (`##`), paragraphs, lists, emphasis, links, quotes, and inline code. Use the preview button before publishing. Upload multiple gallery images (JPG, PNG, WebP, or AVIF, up to 8 MB each) or add image URLs. Every gallery image has its own title, alternative text, caption/credit, and ordering controls. Cover images can also be uploaded or referenced by a public URL. Add meaningful alternative text for informative images and credit text where required. The About page entry controls the shared profile picture displayed on both About and Home, its competency list, and profile links. Page deletion removes the CMS override and restores the built-in page; it does not remove the route or navigation.

If this database schema was created before Pages support, run the updated `supabase-schema.sql` again to add the profile links field and allow the `page` content type. The schema script is safe to rerun.

For a short walkthrough of page and footer edits, open [EDITING-GUIDE.md](EDITING-GUIDE.md).

## Local preview

Serve the folder with a local HTTP server rather than opening files with `file://` because the CMS uses browser modules. For example, run `python -m http.server 8000` in this folder, then open `http://localhost:8000/`. Add `http://localhost:8000/admin/` to Supabase's allowed redirect URLs.

# Content Studio setup

The site is static HTML, so the admin uses Supabase for secure sign-in, content storage, and image uploads. A published item is read from Supabase by the public pages, so edits go live without rebuilding or redeploying the site files.

## Before cloud setup

The existing public site and starter content remain available. `/admin/` requires Supabase configuration before it opens the editor; this is intentional so there is no unauthenticated editing mode. To populate an empty content store after setup, choose **Import existing site content**. This adds missing starter records and keeps existing database records.

## 1. Create the content store

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. For a fresh project, open **SQL Editor**, paste all of `supabase-schema.sql`, and run it. If the original `supabase-schema.sql` was already applied to an existing project, review the policy/grant diff and run `supabase-admin-email-migration.sql` instead to update that database.
3. In **Authentication → Providers → Email**, keep email/password sign-in enabled and disable public sign-ups (sometimes shown as **Allow new users to sign up**). Create or invite only `okoromanuel@gmail.com`; do not create a second administrator account.
4. In **Authentication → URL Configuration**, set the site URL and add the eventual live admin URL (for example `https://your-domain.example/admin/`) to allowed redirect URLs. Add your local preview URL while developing. Password reset links return to this admin page.
5. In **Authentication → Users**, confirm the owner account's email. If the account was previously used with magic links and has no password, use **Forgot password?** on `/admin/` to set one.
6. In **Project Settings → API**, copy the Project URL and public anon/publishable key. Do not use a service-role or secret key in the website.

The database policies restrict content writes, draft visibility, and CMS image changes to the owner email above. Public visitors can read published content and public portfolio images. The setup SQL adds restrictive owner checks so additional permissive policies cannot widen access to this CMS table or image bucket. It also removes broad table grants that RLS cannot constrain, such as `TRUNCATE`.

Before applying the SQL to an existing project, inspect its policies in **Database → Policies** or run this read-only query in the SQL Editor:

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename = 'portfolio_content')
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;
```

The schema script only replaces the specific policy names defined by this CMS and adds its own named restrictive policies; it does not remove unrelated policies. The migration alters the four original owner policies in place, adds missing CMS restrictive policies, and sets the minimum table grants from the current schema. Both retain public reads for published content and public portfolio images. The restrictive rules cap overlapping policies for `portfolio_content` and the `portfolio-images` bucket. Review unrelated storage policies to confirm they are intended for other buckets. Do not disable RLS. Neither file deletes content rows or image objects.

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

The project currently has no live deployment, so the Netlify site and Supabase project still need to be connected. After that setup, new content is published from the admin and appears on the site without a code deploy.

## 4. Use the admin

1. Open `https://YOUR-SITE/admin/` and sign in with `okoromanuel@gmail.com` and its Supabase password. If you do not have a password yet, select **Forgot password?**, open the email from Supabase, and follow the link back to `/admin/`. Choose a new password of at least 10 characters. Use a password manager and do not reuse a password from another site.
2. Choose **Projects**, **Articles**, or **Pages**. The Pages list contains Home, About, Projects, Blog, and Contact. To populate the database with the existing starter content, choose **Import existing site content** from an empty content list. Draft articles and the sample data-quality concept stay drafts. Existing database records are preserved.
3. Add or edit the title, URL slug, summary, tags, link, image, image title, alternative text, image caption/credit, and full Markdown article or project notes.
4. Use **Save draft** to keep an item private. Choose **Publish** to show it publicly. Delete asks for confirmation before removal.

Markdown supports headings (`##`), paragraphs, lists, emphasis, links, quotes, and inline code. Use the preview button before publishing. Upload multiple gallery images (JPG, PNG, WebP, or AVIF, up to 8 MB each) or add image URLs. Every gallery image has its own title, alternative text, caption/credit, and ordering controls. Cover images can also be uploaded or referenced by a public URL. Add meaningful alternative text for informative images and credit text where required. The About page entry controls the shared profile picture displayed on both About and Home, its competency list, and profile links. Page deletion removes the CMS override and restores the built-in page; it does not remove the route or navigation.

Only the signed-in owner email can open the editor and manage content. Supabase database RLS and Storage policies enforce the same restriction on every CMS write and image change. Hiding controls in the browser is not the security boundary. Do not share the administrator password or public signup links.

If this database schema was created before Pages support and lacks the profile links field or `page` content type, run the updated `supabase-schema.sql` after reviewing its changes; it adds those CMS schema features. For an existing database that already has Pages support and only needs the current owner policy/grant changes, use `supabase-admin-email-migration.sql` instead of rerunning the full setup schema.

For a short walkthrough of page and footer edits, open [EDITING-GUIDE.md](EDITING-GUIDE.md).

If Supabase is unavailable, the admin reports a connection error and the public website keeps its last rendered HTML content. Retry when Supabase or the network is available. An empty/missing config shows setup instructions and does not open the editor. CMS edits are shared with website visitors through Supabase after the website has first been deployed with the correct public URL and anon key.

## Local preview

Serve the folder with a local HTTP server rather than opening files with `file://` because the CMS uses browser modules. For example, run `python -m http.server 8000` in this folder, then open `http://localhost:8000/`. Add `http://localhost:8000/admin/` to Supabase's allowed redirect URLs.

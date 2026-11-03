# Editing the site

## Edit pages in Content Studio

1. Open `/admin/` and sign in as `okoromanuel@gmail.com` using your password. If this is the first password login, choose **Forgot password?**, check your inbox, and follow the reset link back to `/admin/` to set a password (minimum 10 characters).
2. Choose **Pages**.
3. Select **Home**, **About**, **Projects**, **Blog**, or **Contact** from the page list.
4. Edit the headline, short summary, page content, image details, and (on About) competencies and platform links.
5. Use **Preview** to review Markdown, then choose **Save changes** to publish.

The About page image is the profile picture shown on both Home and About. Upload it after cloud storage has been connected, or use a public image URL. Add alternative text so the picture is accessible.

Removing a page entry clears its CMS override and restores the built-in page. It does not remove the site route or navigation. Use **Import existing site content** to restore the default page entries.

## Projects and articles

Choose **Projects** or **Articles**, then select an item or create new content. Set its title, summary, slug, tags, image and image descriptions; use the Markdown editor for the full case study or article. **Save draft** keeps it out of the public listing. Choose **Publish** to make it live through Supabase without a new site deployment. Change the status back to **Draft** to unpublish, or use **Delete** after reviewing the confirmation. Project content can include a repository URL and multiple gallery images with captions and alternative text.

## Access and troubleshooting

Only the owner email `okoromanuel@gmail.com` is allowed. There is no public registration. Supabase RLS and Storage rules enforce permissions on the database and image bucket, so changing browser controls cannot grant another account access. Never share the password or add another user as an administrator.

If sign-in fails, verify the email, use **Forgot password?** if needed, and check that the Supabase project URL and public anon key are configured in `cms-config.js`. If Supabase is offline, admin changes cannot be saved or published; the public site continues showing its last available content. Retry when the service is available. When configuration is absent, `/admin/` shows setup instructions instead of opening an editable local CMS.

## Edit the footer

The footer is currently part of each HTML page. To change it:

1. Open the page file in your code editor: `index.html`, `about.html`, `projects.html`, `blog.html`, or `contact.html`.
2. Find `<footer class="site-footer wrap">` near the bottom.
3. Edit the name, links, contact details, or credit text inside that footer. Keep the opening `<footer>` and closing `</footer>` tags in place.
4. Save the file and refresh the page.

For example, change the email link by editing both its `href="mailto:..."` and the text visitors see between the `<a>` tags. The copyright year updates automatically through `script.js`.

Once Supabase is connected, published page edits are shared with site visitors without editing the HTML files. The admin no longer opens an unauthenticated local editor when cloud configuration is missing.

# Editing the site

## Edit pages in Content Studio

1. Open `/admin/` and choose **Pages**.
2. Select **Home**, **About**, **Projects**, **Blog**, or **Contact** from the page list.
3. Edit the headline, short summary, page content, image details, and (on About) competencies and platform links.
4. Use **Preview** to review Markdown, then choose **Save changes** to publish.

The About page image is the profile picture shown on both Home and About. Use a public image URL in local preview, or upload an image after cloud storage has been connected. Add alternative text so the picture is accessible.

Removing a page entry clears its CMS override and restores the built-in page. It does not remove the site route or navigation. Use **Import existing site content** to restore the default page entries.

## Edit the footer

The footer is currently part of each HTML page. To change it:

1. Open the page file in your code editor: `index.html`, `about.html`, `projects.html`, `blog.html`, or `contact.html`.
2. Find `<footer class="site-footer wrap">` near the bottom.
3. Edit the name, links, contact details, or credit text inside that footer. Keep the opening `<footer>` and closing `</footer>` tags in place.
4. Save the file and refresh the page.

For example, change the email link by editing both its `href="mailto:..."` and the text visitors see between the `<a>` tags. The copyright year updates automatically through `script.js`.

The current local CMS saves to this browser only. Once Supabase is connected, published page edits are shared with site visitors without editing the HTML files.

# Okoro Emmanuel · Healthcare Data Portfolio

A responsive portfolio for a Doctor of Optometry and health data analyst. The site includes project case studies, articles, a contact page, and a browser-based content studio.

## Run locally

Serve this folder with a static web server, for example:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/` for the site and `http://localhost:8000/admin/` for the content studio.

## Content studio

The admin supports local browser previews by default. To publish edits for all visitors, configure Supabase and deploy the static site. Follow [CMS-SETUP.md](CMS-SETUP.md) for the database, authentication, and image storage setup. See [EDITING-GUIDE.md](EDITING-GUIDE.md) for page and footer edits.

## Main pages

- `index.html` — Home
- `about.html` — About and professional profile
- `projects.html` — Project archive and case studies
- `blog.html` — Articles and insights
- `contact.html` — Contact form and profile links
- `admin/` — Private content studio interface

import { initialContent } from './content-seed.js';

const config = window.CMS_CONFIG || {};
const setup = document.querySelector('#setup-screen');
const login = document.querySelector('#login-screen');
const app = document.querySelector('#editor-app');
const logoutButton = document.querySelector('#logout');
const notice = document.querySelector('#notice');
const list = document.querySelector('#content-list');
const form = document.querySelector('#content-form');
const emptyEditor = document.querySelector('#empty-editor');
const preview = document.querySelector('#markdown-preview');
const markdownInput = document.querySelector('#body-markdown');
const imagePreview = document.querySelector('#image-preview');
const imageFile = document.querySelector('#image-file');
const galleryFile = document.querySelector('#gallery-file');
const galleryList = document.querySelector('#gallery-list');
const fields = name => form.elements.namedItem(name);
let client;
let items = [];
let activeKind = 'project';
let activeItem = null;
let dirty = false;
let mode = 'live';
let galleryDraft = [];
const storageKey = 'okoro-cms-content-v1';
const removedPagesKey = 'okoro-cms-removed-pages-v1';

function setNotice(message, error = false) {
  notice.textContent = message;
  notice.classList.toggle('is-error', error);
}
function setScreen(which) {
  setup.hidden = which !== 'setup';
  login.hidden = which !== 'login';
  app.hidden = which !== 'app';
  logoutButton.hidden = which !== 'app' || mode === 'local';
  document.querySelector('.heading-actions').hidden = which !== 'app';
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function safeLink(value) {
  try { const url = new URL(value); return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
function safeImageLink(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
function inlineMarkdown(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) => `<a href="${escapeHtml(safeLink(url))}" target="_blank" rel="noreferrer">${label}</a>`);
  return s;
}
function renderMarkdown(raw) {
  const lines = String(raw || '').replace(/\r/g, '').split(String.fromCharCode(10));
  const out = [];
  let listType = '';
  const closeList = () => { if (listType) out.push(`</${listType}>`); listType = ''; };
  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const number = line.match(/^\s*\d+\.\s+(.+)$/);
    if (heading) { closeList(); const n = heading[1].length; out.push(`<h${n}>${inlineMarkdown(heading[2])}</h${n}>`); }
    else if (bullet || number) { const next = bullet ? 'ul' : 'ol'; if (listType !== next) { closeList(); listType = next; out.push(`<${listType}>`); } out.push(`<li>${inlineMarkdown((bullet || number)[1])}</li>`); }
    else if (/^>\s?/.test(line)) { closeList(); out.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ''))}</blockquote>`); }
    else if (line.trim()) { closeList(); out.push(`<p>${inlineMarkdown(line)}</p>`); }
    else closeList();
  }
  closeList();
  return out.join('');
}
function showMarkdown() { preview.innerHTML = renderMarkdown(markdownInput.value); }
function isArticle() { return activeKind === 'article'; }
function isPage() { return activeKind === 'page'; }
function revealKindFields() {
  document.querySelectorAll('.project-only').forEach(el => { el.hidden = isArticle() || isPage(); });
  document.querySelectorAll('.article-only').forEach(el => { el.hidden = !isArticle(); });
  document.querySelectorAll('.page-only').forEach(el => { el.hidden = !isPage(); });
  document.querySelector('.tags-field').hidden = isPage() && activeItem?.slug !== 'page-about';
  document.querySelector('.page-links-field').hidden = !isPage() || !['page-about','page-contact'].includes(activeItem?.slug);
  document.querySelector('#page-links-label').textContent = activeItem?.slug === 'page-contact' ? 'Contact page profile links' : 'About page platforms / profile links';
  document.querySelector('.gallery-fields').hidden = isPage();
  document.querySelector('.slug-field').hidden = isPage();
  fields('slug').required = !isPage();
  const sharedImageNote = isPage() && activeItem?.slug === 'page-home';
  document.querySelector('.image-fields').hidden = isPage() && activeItem?.slug !== 'page-about';
  document.querySelector('#profile-image-note').hidden = !sharedImageNote;
  document.querySelector('#form-kind-label').textContent = `${activeItem ? 'Edit' : 'New'} ${isArticle() ? 'article' : isPage() ? 'page' : 'project'}`;
  document.querySelector('#form-title').textContent = isPage() ? 'Page details' : isArticle() ? 'Article details' : 'Project details';
  document.querySelector('#title-label').textContent = isPage() ? 'Page headline *' : 'Title *';
  document.querySelector('#tags-label').textContent = isPage() ? 'About page competencies' : 'Tags / technologies';
  document.querySelector('#tags-help').textContent = isPage() ? 'On About, these appear as the editable competency list.' : 'Separate tags with commas.';
  document.querySelector('#image-legend').textContent = isPage() ? 'Page / profile image' : 'Cover image';
  document.querySelector('#body-kind-label').textContent = isPage() ? 'Page content' : isArticle() ? 'Article content' : 'Project content';
  markdownInput.placeholder = isArticle()
    ? '# Article title\n\nWrite the article here. Use Markdown for headings, links, lists and emphasis.'
    : isPage() ? 'Write the main text shown on this page. On About, this is your biography.'
      : '# Project overview\n\nDescribe the question, approach, findings and what this work demonstrates.';
  document.querySelector('#body-markdown').required = isArticle();
  document.querySelector('#save-draft').hidden = false;
  form.querySelector('[type="submit"]').textContent = fields('status').value === 'published' ? 'Save changes' : 'Publish';
}
function prettyDate(value) {
  if (!value) return 'No publication date';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'No publication date' : date.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'});
}
function renderList() {
  const query = document.querySelector('#search-content').value.trim().toLowerCase();
  const visible = items.filter(item => item.kind === activeKind && (!query || item.title.toLowerCase().includes(query) || item.slug.includes(query)));
  list.replaceChildren();
  if (!visible.length) {
    const p = document.createElement('p'); p.className = 'empty-list'; p.textContent = items.some(i => i.kind === activeKind) ? 'No matching content.' : 'No items yet. Create one or import the examples already on the site.';
    list.append(p);
    if (!items.some(i => i.kind === activeKind)) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'import-button'; button.textContent = 'Import existing site content'; button.addEventListener('click', importExisting);
      list.append(button);
    }
    return;
  }
  for (const item of visible) {
    const button = document.createElement('button'); button.type = 'button'; button.className = `content-row${activeItem?.id === item.id ? ' selected' : ''}`;
    const title = document.createElement('strong'); title.textContent = item.title;
    const meta = document.createElement('small'); const dot = document.createElement('i'); dot.className = `status-dot ${item.status}`; dot.setAttribute('aria-hidden','true');
    meta.append(dot, document.createTextNode(`${item.status === 'published' ? 'Published' : 'Draft'} · ${prettyDate(item.published_at)}`)); button.append(title, meta);
    button.addEventListener('click', () => openItem(item)); list.append(button);
  }
}
function openItem(item) {
  activeItem = item;
  emptyEditor.hidden = true; form.hidden = false;
  for (const name of ['id','title','slug','description','image_url','image_title','image_alt','image_caption','project_url','project_label','body_markdown','status']) {
    if (fields(name)) fields(name).value = item[name] || '';
  }
  fields('tags').value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
  fields('links').value = Array.isArray(item.links) ? item.links.map(link => `${link.label} | ${link.url}`).join('\n') : '';
  fields('featured').checked = Boolean(item.featured);
  fields('published_at').value = item.published_at ? new Date(item.published_at).toISOString().slice(0,10) : '';
  document.querySelector('#save-meta').textContent = item.updated_at ? `Last saved ${prettyDate(item.updated_at)}` : 'This item has not been saved yet.';
  galleryDraft.forEach(image=>{if(image.previewUrl)URL.revokeObjectURL(image.previewUrl);});
  imageFile.value = '';
  galleryFile.value = '';
  galleryDraft = (item.gallery_images || []).map(image => ({...image,key:crypto.randomUUID()}));
  updateImagePreview(); renderGalleryList(); showMarkdown(); revealKindFields(); renderList(); dirty = false;
}
function newItem() {
  galleryDraft.forEach(image=>{if(image.previewUrl)URL.revokeObjectURL(image.previewUrl);});
  activeItem = null; emptyEditor.hidden = true; form.hidden = false; form.reset();
  fields('id').value = '';
  fields('slug').dataset.touched = '';
  fields('status').value = 'draft';
  imageFile.value = ''; galleryFile.value = ''; galleryDraft = []; renderGalleryList(); imagePreview.hidden = true;
  document.querySelector('#save-meta').textContent = 'New content · not saved yet.';
  revealKindFields(); preview.hidden = true; markdownInput.hidden = false; document.querySelector('#preview-toggle').textContent = 'Preview';
  renderList(); fields('title').focus(); dirty = false;
}
function updateImagePreview() {
  const url = safeImageLink(fields('image_url').value);
  if (!url) { imagePreview.hidden = true; imagePreview.removeAttribute('src'); return; }
  imagePreview.src = url; imagePreview.alt = fields('image_alt').value || 'Image preview'; imagePreview.hidden = false;
}
function renderGalleryList() {
  galleryList.replaceChildren();
  if (!galleryDraft.length) {
    const empty=document.createElement('p');empty.className='gallery-empty';empty.textContent='No additional images yet.';galleryList.append(empty);return;
  }
  galleryDraft.forEach((image,index)=>{
    const row=document.createElement('article');row.className='gallery-entry';
    const figure=document.createElement('figure');figure.className='gallery-thumb';
    const img=document.createElement('img');img.src=image.previewUrl||image.url;img.alt=image.alt||image.title||'Gallery image preview';figure.append(img);row.append(figure);
    const details=document.createElement('div');details.className='gallery-entry-fields';
    for(const [key,label,placeholder] of [['title','Image title','Short descriptive title'],['alt','Alternative text','Describe this image for screen readers'],['caption','Caption / credit','Optional caption or image credit']]){
      const field=document.createElement('label');field.className='gallery-meta-field';field.textContent=label;
      const input=document.createElement('input');input.type='text';input.maxLength=180;input.value=image[key]||'';input.placeholder=placeholder;
      input.addEventListener('input',()=>{image[key]=input.value;if(key==='alt')img.alt=input.value||image.title||'Gallery image preview';dirty=true;});field.append(input);details.append(field);
    }
    const actions=document.createElement('div');actions.className='gallery-entry-actions';
    const moveButton=(label,delta,disabled)=>{const button=document.createElement('button');button.type='button';button.className='secondary-button';button.textContent=label;button.disabled=disabled;button.setAttribute('aria-label',`${label} ${image.title||`image ${index+1}`}`);button.addEventListener('click',()=>{const to=index+delta;[galleryDraft[index],galleryDraft[to]]=[galleryDraft[to],galleryDraft[index]];renderGalleryList();});return button;};
    actions.append(moveButton('Move up',-1,index===0),moveButton('Move down',1,index===galleryDraft.length-1));
    const remove=document.createElement('button');remove.type='button';remove.className='danger-button';remove.textContent='Remove';remove.addEventListener('click',()=>{if(image.previewUrl)URL.revokeObjectURL(image.previewUrl);galleryDraft.splice(index,1);renderGalleryList();});actions.append(remove);
    details.append(actions);row.append(details);galleryList.append(row);
  });
}
function slugify(value) { return value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
async function importExisting() {
  if (!confirm('Import the current site examples as editable content? Existing database items will be kept.')) return;
  setNotice('Importing the current examples…');
  if (mode === 'local') {
    items = [...items, ...initialContent.filter(seed => !items.some(item => item.slug === seed.slug)).map(seed => ({...seed,id:`local-${crypto.randomUUID()}`,updated_at:new Date().toISOString()}))];
    localStorage.setItem(storageKey, JSON.stringify(items));
    setNotice('Starter content restored in this browser. Export a backup to move it into the live CMS.'); renderList(); return;
  }
  const { data: existing, error: readError } = await client.from('portfolio_content').select('slug');
  if (readError) { setNotice(`Import failed: ${readError.message}`, true); return; }
  const slugs = new Set((existing || []).map(item => item.slug));
  const missing = initialContent.filter(item => !slugs.has(item.slug));
  if (missing.length) {
    const { error } = await client.from('portfolio_content').insert(missing);
    if (error) { setNotice(`Import failed: ${error.message}`, true); return; }
  }
  setNotice('Current site content imported. Draft articles and the concept project remain unpublished.'); await loadItems();
}
async function restorePages() {
  const pageSeeds = initialContent.filter(item => item.kind === 'page');
  if (mode === 'local') {
    const removed = new Set(JSON.parse(localStorage.getItem(removedPagesKey) || '[]'));
    pageSeeds.forEach(page => removed.delete(page.slug));
    localStorage.setItem(removedPagesKey,JSON.stringify([...removed]));
    items = [...items,...pageSeeds.filter(seed=>!items.some(item=>item.slug===seed.slug)).map(seed=>({...seed,id:`local-${crypto.randomUUID()}`,updated_at:new Date().toISOString()}))];
    localStorage.setItem(storageKey,JSON.stringify(items));setNotice('Default page entries restored in this browser.');renderList();return;
  }
  const {data:existing,error:readError}=await client.from('portfolio_content').select('slug').eq('kind','page');
  if(readError){setNotice(`Could not restore pages: ${readError.message}`,true);return;}
  const slugs=new Set((existing||[]).map(item=>item.slug));
  const missing=pageSeeds.filter(page=>!slugs.has(page.slug));
  if(missing.length){const {error}=await client.from('portfolio_content').insert(missing);if(error){setNotice(`Could not restore pages: ${error.message}`,true);return;}}
  setNotice('Default page entries restored.');await loadItems();
}
async function loadItems() {
  setNotice('');
  if (mode === 'local') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try { items = JSON.parse(stored); }
      catch { items = []; setNotice('Saved browser content could not be read. Import a JSON backup or clear this browser’s CMS data.',true); }
    const removedPages = JSON.parse(localStorage.getItem(removedPagesKey) || '[]');
    const missing = initialContent.filter(seed => !items.some(item => item.slug === seed.slug) && !(seed.kind === 'page' && removedPages.includes(seed.slug)));
      if (missing.length) items.push(...missing.map(seed=>({...seed,id:`local-${crypto.randomUUID()}`,updated_at:new Date().toISOString()})));
      let updated = missing.length > 0;
      for (const seed of initialContent.filter(item=>item.kind==='page'&&item.body_markdown)) {
        const existing = items.find(item=>item.slug===seed.slug);
        if (existing && !existing.body_markdown) { existing.body_markdown=seed.body_markdown; updated=true; }
      }
      if (updated) localStorage.setItem(storageKey,JSON.stringify(items));
    } else {
      items = initialContent.map(seed=>({...seed,id:`local-${crypto.randomUUID()}`,updated_at:new Date().toISOString()}));
      localStorage.setItem(storageKey,JSON.stringify(items));
    }
    renderList();
    if (activeItem) { const fresh=items.find(item=>item.id===activeItem.id); if(fresh)openItem(fresh);else{activeItem=null;form.hidden=true;emptyEditor.hidden=false;} }
    else { const first=items.find(item=>item.kind===activeKind); if(first)openItem(first); }
    return;
  }
  const { data, error } = await client.from('portfolio_content').select('*').order('updated_at', {ascending:false});
  if (error) { setNotice(`Could not load content: ${error.message}`, true); return; }
  items = data || []; renderList();
  if (activeItem) {
    const fresh = items.find(item => item.id === activeItem.id);
    if (fresh) openItem(fresh); else { activeItem = null; form.hidden = true; emptyEditor.hidden = false; }
  } else { const first=items.find(item=>item.kind===activeKind); if(first)openItem(first); }
}
async function persist(status) {
  if (!form.reportValidity()) return;
  const title = fields('title').value.trim();
  const slug = isPage() ? (activeItem?.slug || `page-${slugify(title)}`) : fields('slug').value.trim() || slugify(title);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { setNotice('Use a lowercase URL slug with letters, numbers, and hyphens.', true); fields('slug').focus(); return; }
  const currentImage = fields('image_url').value.trim();
  let imageUrl = currentImage;
  const file = imageFile.files[0];
  if (currentImage && !safeImageLink(currentImage)) { setNotice('Use a valid http or https URL for the cover image.',true); fields('image_url').focus(); return; }
  if ((currentImage || file) && !fields('image_alt').value.trim()) {
    setNotice('Add alternative text for the cover image before saving.', true);
    fields('image_alt').focus(); return;
  }
  if (file) {
    if (mode === 'local') { setNotice('Image uploads are enabled after the cloud content store is connected. You can use a public image URL in local preview.',true); return; }
    if (file.size > 8 * 1024 * 1024) { setNotice('Choose an image smaller than 8 MB.', true); return; }
    if (!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)) { setNotice('Use a JPG, PNG, WebP, or AVIF image.', true); return; }
  }
  if (galleryDraft.some(image=>!image.alt?.trim())) { setNotice('Add alternative text for every gallery image before saving.',true); return; }
  if (galleryDraft.some(image=>!image.file&&!safeImageLink(image.url))) { setNotice('Each gallery image needs a valid http or https URL.',true); return; }
  if (mode==='local'&&galleryDraft.some(image=>image.file)) { setNotice('Image uploads are enabled after the cloud content store is connected. Add a public URL in local preview.',true); return; }
  for(let index=0;index<galleryDraft.length;index++){
    const image=galleryDraft[index];
    if(image.file&&image.file.size>8*1024*1024){setNotice(`Gallery image ${index+1} is larger than 8 MB.`,true);return;}
    if(image.file&&!['image/jpeg','image/png','image/webp','image/avif'].includes(image.file.type)){setNotice(`Gallery image ${index+1} must be JPG, PNG, WebP or AVIF.`,true);return;}
  }
  if (file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${slug}/${crypto.randomUUID()}.${ext}`;
    setNotice('Uploading image…');
    const { error: uploadError } = await client.storage.from('portfolio-images').upload(path, file, {cacheControl:'31536000',upsert:false,contentType:file.type});
    if (uploadError) { setNotice(`Image upload failed: ${uploadError.message}`, true); return; }
    imageUrl = client.storage.from('portfolio-images').getPublicUrl(path).data.publicUrl;
    fields('image_url').value = imageUrl;
  }
  const galleryImages=[];
  const uploadedGalleryUrls=[];
  for (let index=0;index<galleryDraft.length;index++) {
    const image=galleryDraft[index]; let url=image.url;
    if(image.file){
      const ext=image.file.name.split('.').pop().toLowerCase(),path=`${slug}/gallery/${crypto.randomUUID()}.${ext}`;
      setNotice(`Uploading gallery image ${index+1} of ${galleryDraft.length}…`);
      const {error:uploadError}=await client.storage.from('portfolio-images').upload(path,image.file,{cacheControl:'31536000',upsert:false,contentType:image.file.type});
      if(uploadError){if(file){await removeStorageImage(imageUrl);fields('image_url').value=currentImage;updateImagePreview();}for(const uploaded of uploadedGalleryUrls)await removeStorageImage(uploaded);setNotice(`Gallery upload failed: ${uploadError.message}`,true);return;}
      url=client.storage.from('portfolio-images').getPublicUrl(path).data.publicUrl;
      uploadedGalleryUrls.push(url);
    }
    galleryImages.push({url,title:(image.title||'').trim(),alt:(image.alt||'').trim(),caption:(image.caption||'').trim()});
  }
  const previousImage = activeItem?.image_url || '';
  const previousGallery = activeItem?.gallery_images || [];
  const publishedDate = fields('published_at').value;
  const links = fields('links').value.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{
    const split=line.split('|');const label=(split.shift()||'').trim();const url=split.join('|').trim();return {label,url:safeLink(url)};
  });
  if(isPage()&&links.some(link=>!link.label||!link.url)){setNotice('Check platform links. Use one “Label | URL” pair per line and a valid http, https, or mailto URL.',true);fields('links').focus();return;}
  const record = {
    kind:activeKind,title,slug,description:fields('description').value.trim(),body_markdown:fields('body_markdown').value,
    image_url:imageUrl,image_title:fields('image_title').value.trim(),image_alt:fields('image_alt').value.trim(),image_caption:fields('image_caption').value.trim(),gallery_images:galleryImages,
    tags:fields('tags').value.split(',').map(s=>s.trim()).filter(Boolean),links:isPage()?links:[],project_url:fields('project_url').value.trim(),
    project_label:fields('project_label').value.trim() || 'View project',featured:activeKind==='project' && fields('featured').checked,status,
    published_at:status === 'published' ? (publishedDate ? new Date(`${publishedDate}T12:00:00`).toISOString() : activeItem?.published_at || new Date().toISOString()) : null,
    updated_at:new Date().toISOString()
  };
  if (activeItem?.id) record.id = activeItem.id;
  if (mode === 'local') {
    record.id = activeItem?.id || `local-${crypto.randomUUID()}`;
    const index=items.findIndex(item=>item.id===record.id);
    if(index>=0)items[index]=record;else items.unshift(record);
    localStorage.setItem(storageKey,JSON.stringify(items));
    setNotice(status==='published'?'Published to this browser’s preview. Connect Supabase and deploy the site for everyone to see it.':'Draft saved in this browser only.');
    activeItem=record; renderList(); openItem(record);
    return;
  }
  const { data, error } = await client.from('portfolio_content').upsert(record).select().single();
  if (error) { if(file){await removeStorageImage(imageUrl);fields('image_url').value=currentImage;updateImagePreview();}for(const uploaded of uploadedGalleryUrls)await removeStorageImage(uploaded);setNotice(`Could not save: ${error.message}`, true); return; }
  setNotice(status === 'published' ? 'Published. The public site now shows this content.' : 'Draft saved. It is not visible on the public site.');
  await loadItems(); if (data) openItem(data);
  if (previousImage && previousImage !== imageUrl) await removeStorageImage(previousImage);
  const retained=new Set(galleryImages.map(image=>image.url));
  for(const oldImage of previousGallery)if(oldImage.url&&!retained.has(oldImage.url))await removeStorageImage(oldImage.url);
}
async function removeStorageImage(url) {
  try {
    const marker = '/storage/v1/object/public/portfolio-images/';
    const at = url.indexOf(marker); if (at < 0) return;
    await client.storage.from('portfolio-images').remove([decodeURIComponent(url.slice(at + marker.length))]);
  } catch { /* An old or externally hosted image can safely remain. */ }
}
async function deleteItem() {
  if (!activeItem || !confirm(activeKind==='page' ? `Remove the “${activeItem.title}” page override? The built-in page will remain available.` : `Delete “${activeItem.title}” permanently? This cannot be undone.`)) return;
  if (mode === 'local') {
    if(activeKind==='page'){
      const removed=new Set(JSON.parse(localStorage.getItem(removedPagesKey)||'[]'));removed.add(activeItem.slug);localStorage.setItem(removedPagesKey,JSON.stringify([...removed]));
    }
    items=items.filter(item=>item.id!==activeItem.id); localStorage.setItem(storageKey,JSON.stringify(items));
    activeItem=null; form.hidden=true; emptyEditor.hidden=false; setNotice('Content deleted from this browser’s preview.'); renderList(); return;
  }
  const { error } = await client.from('portfolio_content').delete().eq('id',activeItem.id);
  if (error) { setNotice(`Could not delete: ${error.message}`,true); return; }
  const oldImage = activeItem.image_url; const oldGallery=activeItem.gallery_images||[]; activeItem = null; form.hidden = true; emptyEditor.hidden = false;
  if (activeKind !== 'page' && oldImage) await removeStorageImage(oldImage);
  if (activeKind !== 'page') for(const image of oldGallery)if(image.url)await removeStorageImage(image.url);
  setNotice('Content deleted.'); await loadItems();
}
function initEvents() {
  document.querySelectorAll('.segment').forEach(button => button.addEventListener('click', () => {
    activeKind = button.dataset.kind; activeItem = null; form.hidden = true; emptyEditor.hidden = false;
    document.querySelector('#new-content').hidden = isPage();
    document.querySelector('#restore-pages').hidden = !isPage();
    document.querySelectorAll('.segment').forEach(b => { b.classList.toggle('active',b===button); b.setAttribute('aria-pressed',String(b===button)); });
    renderList();
  }));
  document.querySelector('#search-content').addEventListener('input', renderList);
  document.querySelector('#new-content').addEventListener('click', newItem);
  document.querySelector('#restore-pages').addEventListener('click', restorePages);
  document.querySelector('#export-backup').addEventListener('click', () => {
    const blob=new Blob([JSON.stringify(items,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='okoro-portfolio-content.json';a.click();URL.revokeObjectURL(url);setNotice('Content backup downloaded.');
  });
  document.querySelector('#import-backup').addEventListener('click',()=>document.querySelector('#backup-file').click());
  document.querySelector('#backup-file').addEventListener('change',async event=>{
    const file=event.currentTarget.files[0];if(!file)return;
    try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed)||parsed.some(item=>!item.title||!item.slug||!['project','article','page'].includes(item.kind)))throw new Error('This file is not a portfolio content backup.');
      const records=parsed.map(({id,...item})=>({...item,id:mode==='local'?(id||`local-${crypto.randomUUID()}`):(id&&!String(id).startsWith('local-')?id:crypto.randomUUID())}));
      if(mode==='local'){items=records;localStorage.setItem(storageKey,JSON.stringify(items));setNotice('Backup imported to this browser.');renderList();}
      else{const {error}=await client.from('portfolio_content').upsert(records,{onConflict:'slug'});if(error)throw error;setNotice('Backup imported to the live content store.');await loadItems();}
    }catch(error){setNotice(`Could not import backup: ${error.message}`,true);}finally{event.currentTarget.value='';}
  });
  document.querySelector('#delete-content').addEventListener('click', deleteItem);
  document.querySelector('#save-draft').addEventListener('click', () => persist('draft'));
  form.addEventListener('submit', event => { event.preventDefault(); persist('published'); });
  fields('title').addEventListener('input', () => { if (!activeItem || !fields('slug').dataset.touched) fields('slug').value = slugify(fields('title').value); dirty = true; });
  fields('slug').addEventListener('input', () => { fields('slug').dataset.touched = 'true'; dirty = true; });
  fields('image_url').addEventListener('input', updateImagePreview);
  fields('image_alt').addEventListener('input', updateImagePreview);
  imageFile.addEventListener('change', () => { const file=imageFile.files[0]; if(file){ imagePreview.src=URL.createObjectURL(file); imagePreview.alt=fields('image_alt').value||'Selected image preview'; imagePreview.hidden=false; } });
  markdownInput.addEventListener('input', () => { dirty = true; if (!preview.hidden) showMarkdown(); });
  document.querySelector('#preview-toggle').addEventListener('click', event => {
    const willShow = preview.hidden; if (willShow) showMarkdown(); preview.hidden = !willShow; markdownInput.hidden = willShow;
    event.currentTarget.textContent = willShow ? 'Edit Markdown' : 'Preview'; event.currentTarget.setAttribute('aria-expanded',String(willShow));
  });
  galleryFile.addEventListener('change',()=>{
    const files=[...galleryFile.files];
    for(const file of files){
      if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)){setNotice(`${file.name} is not a supported image type.`,true);continue;}
      if(file.size>8*1024*1024){setNotice(`${file.name} is larger than 8 MB.`,true);continue;}
      const title=file.name.replace(/\.[^.]+$/,'');
      galleryDraft.push({key:crypto.randomUUID(),file,previewUrl:URL.createObjectURL(file),url:'',title,alt:'',caption:''});
    }
    galleryFile.value='';renderGalleryList();dirty=true;
  });
  document.querySelector('#add-gallery-url').addEventListener('click',()=>{
    const input=document.querySelector('#gallery-url'),url=safeImageLink(input.value.trim());
    if(!url){setNotice('Enter a valid http or https image URL.',true);input.focus();return;}
    galleryDraft.push({key:crypto.randomUUID(),url,title:'',alt:'',caption:''});input.value='';setNotice('Image URL added. Add its alternative text before saving.');renderGalleryList();
  });
  for (const control of form.querySelectorAll('input,textarea,select')) control.addEventListener('input', () => { dirty = true; });
  form.addEventListener('change', () => { if (fields('status').value === 'published') form.querySelector('[type="submit"]').textContent = 'Save changes'; });
  logoutButton.addEventListener('click', async () => { await client.auth.signOut(); location.reload(); });
  document.querySelector('#login-form').addEventListener('submit', async event => {
    event.preventDefault(); const email=document.querySelector('#login-email').value.trim();
    const message=document.querySelector('#login-message'); message.textContent='Sending secure sign-in link…';
    const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.href,shouldCreateUser:false}});
    message.textContent=error?`Could not send sign-in link: ${error.message}`:'Check your inbox for the sign-in link.';
  });
}
async function boot() {
  initEvents();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    mode='local';setScreen('app');
    const banner=document.querySelector('#mode-banner');banner.hidden=false;banner.innerHTML='Local browser mode · changes stay on this device. Connect Supabase and deploy the site to publish for all visitors. <a href="../CMS-SETUP.md">Setup guide</a>';
    imageFile.disabled=true;document.querySelector('#image-help').textContent='Image uploads activate after the cloud content store is connected. Use a public image URL in local preview.';
    galleryFile.disabled=true;document.querySelector('#gallery-help').textContent='Multi-image uploads activate after the cloud content store is connected. You can add multiple public image URLs below in local preview.';
    await loadItems();return;
  }
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client=createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await client.auth.getSession();
  if (!session) { setScreen('login'); return; }
  if (session.user.email?.toLowerCase() !== 'your.okoromanuel@gmail.com') { await client.auth.signOut(); setScreen('login'); document.querySelector('#login-message').textContent='This email is not authorized for this content studio.'; return; }
  setScreen('app'); await loadItems();
  client.auth.onAuthStateChange((_event,nextSession)=>{if(!nextSession)setScreen('login');});
}
boot().catch(error=>{setScreen('login');document.querySelector('#login-message').textContent=`Could not start the editor: ${error.message}`;});

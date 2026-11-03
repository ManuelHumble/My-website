const samples = {
  complete: { patient: "PT-2048", date: "2026-06-18", diagnosis: "H52.13", prescription: "−1.50 / −1.25 D", followup: "2026-07-16", status: "Complete", message: "Required visit fields are present. No duplicate identifier in this sample.", alert: false },
  missing: { patient: "PT-3191", date: "2026-06-21", diagnosis: "H40.9", prescription: "−0.75 / −1.00 D", followup: "Missing", status: "Needs review", message: "Follow-up date is missing. Confirm whether follow-up was not scheduled or not recorded.", alert: true },
  "missing-rx": { patient: "PT-4520", date: "2026-06-24", diagnosis: "H52.13", prescription: "Missing", followup: "2026-07-22", status: "Needs review", message: "Lens prescription is missing. Confirm whether it was not recorded or does not apply to this visit.", alert: true },
  duplicate: { patient: "PT-2048", date: "2026-06-25", diagnosis: "H52.13", prescription: "−1.25 / −1.25 D", followup: "2026-07-23", status: "Needs review", message: "Patient identifier matches another sample encounter. Check encounter keys before aggregation.", alert: true }
};

const sampleSelect = document.querySelector("#sample-record");
const runCheck = document.querySelector("#check-record");
const result = document.querySelector("#check-result");
let checked = false;

function paintRecord() {
  const sample = samples[sampleSelect.value];
  document.querySelector("#patient-value").textContent = sample.patient;
  document.querySelector("#date-value").textContent = sample.date;
  document.querySelector("#diagnosis-value").textContent = sample.diagnosis;
  document.querySelector("#prescription-value").textContent = sample.prescription;
  document.querySelector("#followup-value").textContent = sample.followup;
  document.querySelector("#record-status").textContent = checked ? sample.status : "Ready to check";
  result.textContent = checked ? sample.message : "Select a sample, then check its required fields and identifier.";
  result.classList.toggle("alert", checked && sample.alert);
}

if (sampleSelect && runCheck && result) {
  sampleSelect.addEventListener("change", () => { checked = false; paintRecord(); });
  runCheck.addEventListener("click", () => { checked = true; paintRecord(); });
}

const contactForm = document.querySelector("#contact-form");
if (contactForm) {
  const startedAt = contactForm.querySelector("#form-started-at");
  if (startedAt) startedAt.value = String(Date.now());
  contactForm.addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(contactForm);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const message = String(form.get("message") || "").trim();
    const note = document.querySelector("#form-note");
    const button = contactForm.querySelector("[type=submit]");
    if (form.get("website")) return;
    if (name.length < 2 || name.length > 100) { note.textContent = "Please enter your name."; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { note.textContent = "Please enter a valid email address."; return; }
    if (message.length < 10 || message.length > 5000) { note.textContent = "Please enter a message between 10 and 5,000 characters."; return; }
    button.disabled = true;
    note.textContent = "Sending your message…";
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, message, website: form.get("website"), formStartedAt: Number(form.get("form_started_at")) || 0 })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The message could not be sent. Please try again.");
      note.textContent = result.message || "Thanks — your message has been sent.";
      contactForm.reset();
      if (startedAt) startedAt.value = String(Date.now());
    } catch (error) {
      note.textContent = error.message || "The message could not be sent. Please try again later.";
    } finally {
      button.disabled = false;
    }
  });
}

document.querySelectorAll(".year").forEach(year => { year.textContent = new Date().getFullYear(); });

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const elements = document.querySelectorAll(".page-hero > *, .profile-portrait, .home-about-grid > *, .home-projects > *, .home-work-list article, .about-grid > *, .competencies span, .section-heading > *, .project-item, .case-notes article, .demo-grid > *, .article-list article, .article-body article, .contact-grid > *, .home-contact-inner > *");
  elements.forEach(element => {
    element.style.transition = "opacity 700ms cubic-bezier(.16,1,.3,1), transform 700ms cubic-bezier(.16,1,.3,1)";
    element.style.opacity = "0";
    element.style.transform = "translateY(16px)";
  });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.08 });
  elements.forEach(element => observer.observe(element));
}

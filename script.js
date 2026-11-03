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

document.querySelector("#contact-form")?.addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const subject = encodeURIComponent(`Portfolio enquiry from ${form.get("name")}`);
  const body = encodeURIComponent(`Name: ${form.get("name")}\nEmail: ${form.get("email")}\n\n${form.get("message")}`);
  document.querySelector("#form-note").textContent = "Your email draft is ready in your default mail app.";
  window.location.href = `mailto:okoromanuel@gmail.com?subject=${subject}&body=${body}`;
});

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

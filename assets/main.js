"use strict";
const toggle = document.querySelector("#menu-toggle");
const nav = document.querySelector("#site-nav");
const mobile = window.matchMedia("(max-width:800px)");
function closeMenu(returnFocus = false) {
  nav.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open navigation");
  document.body.style.overflow = "";
  document.querySelector("main").inert = false;
  document.querySelector("footer").inert = false;
  if (returnFocus) toggle.focus();
}
function openMenu() {
  nav.classList.add("open");
  toggle.setAttribute("aria-expanded", "true");
  toggle.setAttribute("aria-label", "Close navigation");
  document.body.style.overflow = "hidden";
  document.querySelector("main").inert = true;
  document.querySelector("footer").inert = true;
  nav.querySelector("a").focus();
}
toggle.addEventListener("click", () =>
  nav.classList.contains("open") ? closeMenu(true) : openMenu(),
);
nav.addEventListener("click", (e) => {
  if (e.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (e) => {
  if (!nav.classList.contains("open")) return;
  if (e.key === "Escape") {
    e.preventDefault();
    closeMenu(true);
  }
  if (e.key === "Tab") {
    const items = [toggle, ...nav.querySelectorAll("a")];
    const first = items[0],
      last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
mobile.addEventListener("change", () => {
  if (!mobile.matches) closeMenu();
});
const form = document.querySelector("#contact-form");
if (form) {
  const fields = ["name", "email", "helpType", "message"];
  const params = new URLSearchParams(location.search);
  const service = params.get("service");
  const project = params.get("project");
  if (service && [...form.helpType.options].some((o) => o.value === service))
    form.helpType.value = service;
  if (project) {
    form.helpType.value = "Not sure";
    form.message.value =
      "I’m interested in a project similar to " + project + ".\n\n";
  }
  fields.forEach((id) =>
    document.getElementById(id).addEventListener("input", () => {
      document.getElementById(id).removeAttribute("aria-invalid");
      document.getElementById(id + "-error").textContent = "";
    }),
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("form-status");
    const submit = document.getElementById("form-submit");
    if (submit.disabled) return;
    let first = null;
    const data = {};
    fields.forEach((id) => {
      const field = document.getElementById(id);
      data[id] = field.value.trim();
      let error = !data[id]
        ? "Please " +
          (id === "helpType"
            ? "choose a service."
            : id === "message"
              ? "describe your project."
              : id === "name"
                ? "enter your name."
                : "enter your email address.")
        : id === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[id])
          ? "Enter a valid email address."
          : "";
      document.getElementById(id + "-error").textContent = error;
      if (error) {
        field.setAttribute("aria-invalid", "true");
        first ??= field;
      } else field.removeAttribute("aria-invalid");
    });
    if (first) {
      status.textContent = "Please check the highlighted fields.";
      status.className = "error";
      first.focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = "Sending…";
    form.setAttribute("aria-busy", "true");
    status.textContent = "";
    status.className = "";
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error("not accepted");
      status.className = "success";
      status.textContent =
        "Your enquiry has been sent. I aim to get back to you within 24 hours.";
      form.reset();
    } catch {
      status.className = "error";
      status.textContent =
        "Your enquiry could not be confirmed. Your text is still here. Please try again or email eli@stackcraft.co.nz.";
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Send enquiry <span aria-hidden="true">↗</span>';
      form.removeAttribute("aria-busy");
    }
  });
}

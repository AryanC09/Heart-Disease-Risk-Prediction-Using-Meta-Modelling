// static/js/script.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("predictForm");
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");
  const tabContainer = document.querySelector(".tabbar");
  const smokerStatusEl = document.getElementById("currentSmoker");
  const cigsPerDayEl = document.getElementById("cigsPerDay");

  function showPanelById(targetId) {
    panels.forEach((panel) => {
      const isActive = panel.id === targetId;
      panel.classList.toggle("active", isActive);
      panel.setAttribute("aria-hidden", !isActive);
    });

    tabs.forEach((tab) => {
      const isActive = tab.dataset.target === targetId;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive);
    });

    const activePanel = document.getElementById(targetId);
    if (activePanel) {
      const firstInput = activePanel.querySelector("input, select");
      if (firstInput) firstInput.focus();
    }
  }

  function showTabIndex(index) {
    if (index < 0 || index >= panels.length) return;
    showPanelById(panels[index].id);
  }

  function showError(el, message) {
    el.classList.add("invalid");
    const small = el.parentElement.querySelector("small");
    if (small) {
      if (!small.dataset.originalText)
        small.dataset.originalText = small.innerText;
      small.innerText = message;
      small.classList.add("error-message");
    }
  }

  function clearError(el) {
    el.classList.remove("invalid");
    const small = el.parentElement.querySelector("small");
    if (small && small.dataset.originalText) {
      small.innerText = small.dataset.originalText;
      small.classList.remove("error-message");
    }
  }

  function validateInput(el) {
    clearError(el);
    if (el.disabled) return true;
    const validity = el.validity;
    if (!validity.valid) {
      if (validity.valueMissing) showError(el, "This field is required.");
      else if (validity.rangeUnderflow)
        showError(el, `Value must be at least ${el.min}.`);
      else if (validity.rangeOverflow)
        showError(el, `Value cannot be more than ${el.max}.`);
      else if (validity.badInput) showError(el, "Please enter a valid number.");
      else showError(el, "The value you entered is invalid.");
      return false;
    }
    return true;
  }

  function validatePanel(panel) {
    const fields = panel.querySelectorAll(
      "input:not([disabled]), select:not([disabled])"
    );
    return Array.from(fields).every((f) => validateInput(f));
  }

  function setupListeners() {
    tabContainer.addEventListener("click", (e) => {
      const tab = e.target.closest(".tab");
      if (tab) showPanelById(tab.dataset.target);
    });

    form.addEventListener("click", (e) => {
      const nextBtn = e.target.closest(".next-btn");
      if (nextBtn) {
        const currentPanel = nextBtn.closest(".tab-panel");
        if (validatePanel(currentPanel)) {
          showPanelById(nextBtn.dataset.target);
        }
      }
    });

    form.addEventListener("submit", (e) => {
      const allFields = form.querySelectorAll(
        "input:not([disabled]), select:not([disabled])"
      );
      for (const field of allFields) {
        if (!validateInput(field)) {
          e.preventDefault();
          const errorPanel = field.closest(".tab-panel");
          if (errorPanel) showPanelById(errorPanel.id);
          return;
        }
      }
    });

    if (smokerStatusEl) {
      smokerStatusEl.addEventListener("change", () => {
        const isSmoker = smokerStatusEl.value === "1";
        if (cigsPerDayEl) {
          cigsPerDayEl.disabled = !isSmoker;
          cigsPerDayEl.required = isSmoker;
          if (!isSmoker) {
            cigsPerDayEl.value = "";
            clearError(cigsPerDayEl);
          }
        }
      });
      smokerStatusEl.dispatchEvent(new Event("change"));
    }

    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName.toLowerCase() === "input") {
        e.preventDefault();
      }
    });

    form.addEventListener("input", (e) => {
      if (e.target.matches('input[type="number"], select'))
        validateInput(e.target);
    });
  }

  setupListeners();
});

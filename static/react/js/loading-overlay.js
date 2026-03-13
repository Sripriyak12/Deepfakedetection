// Shows a full-screen loading overlay while the server processes the uploaded video.
// Keep this ES5-compatible (no optional chaining, etc.) since the HTML is minified.

(function () {
  function showOverlay() {
    var el = document.getElementById("loadingOverlay");
    if (!el) return;
    el.classList.add("is-visible");
    el.setAttribute("aria-hidden", "false");
  }

  function hideOverlay() {
    var el = document.getElementById("loadingOverlay");
    if (!el) return;
    el.classList.remove("is-visible");
    el.setAttribute("aria-hidden", "true");
  }

  // Ensure it doesn't get stuck visible when navigating back/forward.
  window.addEventListener("pageshow", hideOverlay);
  window.addEventListener("load", hideOverlay);

  // When a form is submitted with a selected file, show the overlay.
  document.addEventListener(
    "submit",
    function (evt) {
      var form = evt.target;
      if (!form || form.tagName !== "FORM") return;

      var fileInput = form.querySelector(
        'input[type="file"][name="video"], input[type="file"]'
      );
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;

      showOverlay();

      // Best-effort disable submit to prevent double-submits.
      window.setTimeout(function () {
        try {
          var submitEl = form.querySelector(
            'input[type="submit"], button[type="submit"]'
          );
          if (submitEl) submitEl.setAttribute("disabled", "disabled");
        } catch (e) {}
      }, 0);
    },
    true
  );

  // Some browsers may trigger submit via click on the submit control.
  document.addEventListener(
    "click",
    function (evt) {
      var target = evt.target;
      if (!target || target.id !== "sub") return;
      var fileInput = document.querySelector(
        'input[type="file"][name="video"], input[type="file"]'
      );
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        showOverlay();
      }
    },
    true
  );
})();



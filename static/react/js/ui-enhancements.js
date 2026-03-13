// UI enhancements without React source:
// - Home-only background image (using `bgimage.jpeg` in /static/react/media/)
// - Add a DeepFake quote on the home page
// - Add a hero CTA block (button + helper text) for the home page
// ES5 compatible.

(function () {
  var HOME_BG = "/static/react/media/bgimage.jpeg";
  var FALLBACK_BG = "/static/react/media/bgimage.jpeg";
  var __dfIsApplying = false;
  var __dfApplyScheduled = false;

  function isHomePath() {
    // Supports both "/" and "/#/" style routers (just in case).
    var p = window.location.pathname || "";
    var h = window.location.hash || "";
    if (h && (h === "#/" || h === "#")) return true;
    return p === "/" || p === "";
  }

  function isDetectPath() {
    var p = window.location.pathname || "";
    var h = window.location.hash || "";
    if (h && (h.toLowerCase() === "#/detect")) return true;
    return p.toLowerCase() === "/detect";
  }

  function getHomeContent() {
    return document.querySelector(".content");
  }

  function disableInlineAppBackground() {
    // The compiled React bundle sets an inline background image on `.App`.
    // We disable it so we can control the background via CSS (and avoid 404s).
    var app = document.querySelector(".App");
    if (!app) return;
    app.style.backgroundImage = "none";
    app.style.backgroundColor = "transparent";
  }

  function buildHomeHero() {
    var content = getHomeContent();
    if (!content) return;

    // If already upgraded, do nothing.
    if (content.querySelector(".hero")) return;

    // Replace the student template content with the SaaS-style hero.
    content.innerHTML = "";
    content.classList.add("df-home-shell");

    var hero = document.createElement("div");
    hero.className = "hero";

    var left = document.createElement("div");
    left.className = "left-content";
    left.innerHTML =
      '<div class="hero-kicker">AI Video Security</div>' +
      '<h1 class="hero-title">Deepfake Detection</h1>' +
      '<div class="hero-subtitle">AI-Powered Video Verification System</div>' +
      '<p class="hero-desc">' +
      "Detect manipulated videos using advanced deep learning models. " +
      "Our system analyzes facial inconsistencies and synthetic artifacts " +
      "to classify videos as REAL or FAKE with high accuracy." +
      "</p>" +
      '<div class="hero-actions">' +
      '  <a class="hero-cta" href="/Detect">🚀 Run Deepfake Scan</a>' +
      "</div>" +
      '<div class="hero-trust">' +
      '  <div class="hero-trust__item">✔ 95%+ Accuracy</div>' +
      '  <div class="hero-trust__item">✔ CNN + LSTM Model</div>' +
      '  <div class="hero-trust__item">✔ Real-Time Processing</div>' +
      "</div>";

    var right = document.createElement("div");
    right.className = "right-card";
    right.innerHTML =
      '<div class="awareness-card">' +
      '  <div class="awareness-quote">"Seeing is no longer believing."</div>' +
      '  <div class="awareness-by">— Deepfake Awareness</div>' +
      "</div>";

    hero.appendChild(left);
    hero.appendChild(right);
    content.appendChild(hero);
  }

  function enhanceDetectDropzone() {
    if (!isDetectPath()) return;
    var form = document.querySelector(".background1 form");
    var fileInput = document.getElementById("video");
    var label = document.querySelector('label.button[for="video"]');
    if (!form || !fileInput || !label) return;

    // Ensure the form submits to the Flask endpoint regardless of router state.
    try {
      form.setAttribute("method", "POST");
      form.setAttribute("action", "/Detect");
      form.setAttribute("encType", "multipart/form-data");
    } catch (e) {}

    // Upgrade label to look/behave like a dropzone.
    label.classList.add("df-dropzone");

    // Store dropped file here (some browsers disallow assigning to input.files).
    if (typeof label.__dfDroppedFile === "undefined") {
      label.__dfDroppedFile = null;
    }

    // Area to show selected file name.
    var fileNameSpan = label.querySelector(".df-dropzone-file");
    if (!fileNameSpan) {
      fileNameSpan = document.createElement("div");
      fileNameSpan.className = "df-dropzone-file";
      label.appendChild(fileNameSpan);
    }

    // Preview row (file chip + optional video preview + remove button)
    var preview = form.querySelector(".df-file-preview");
    if (!preview) {
      preview = document.createElement("div");
      preview.className = "df-file-preview";
      preview.innerHTML =
        '<div class="df-file-preview__thumb" aria-hidden="true"></div>' +
        '<div class="df-file-preview__meta">' +
        '  <div class="df-file-preview__name"></div>' +
        '  <div class="df-file-preview__sub"></div>' +
        "</div>" +
        '<button type="button" class="df-file-preview__remove" aria-label="Remove selected file">Remove</button>';

      // Insert right after the label (dropzone)
      if (label.nextSibling) {
        form.insertBefore(preview, label.nextSibling);
      } else {
        form.appendChild(preview);
      }
    }

    var removeBtn = preview.querySelector(".df-file-preview__remove");
    var nameEl = preview.querySelector(".df-file-preview__name");
    var subEl = preview.querySelector(".df-file-preview__sub");
    var thumbEl = preview.querySelector(".df-file-preview__thumb");
    var lastObjectUrl = null;

    function formatBytes(bytes) {
      if (typeof bytes !== "number" || isNaN(bytes) || bytes <= 0) return "";
      var units = ["B", "KB", "MB", "GB"];
      var i = Math.floor(Math.log(bytes) / Math.log(1024));
      i = Math.max(0, Math.min(i, units.length - 1));
      var val = bytes / Math.pow(1024, i);
      return (Math.round(val * 10) / 10) + " " + units[i];
    }

    function clearPreview() {
      label.classList.remove("df-dropzone--has-file");
      fileNameSpan.textContent = "";
      preview.classList.remove("is-visible");
      if (nameEl) nameEl.textContent = "";
      if (subEl) subEl.textContent = "";
      if (thumbEl) thumbEl.innerHTML = "";
      if (lastObjectUrl) {
        try {
          URL.revokeObjectURL(lastObjectUrl);
        } catch (e) {}
        lastObjectUrl = null;
      }
    }

    function clearSelection() {
      // Clear native input
      try {
        fileInput.value = "";
      } catch (e) {}
      label.__dfDroppedFile = null;
      clearPreview();
      // Hide submit again
      var submit = document.getElementById("sub");
      if (submit) submit.style.display = "none";
    }

    if (removeBtn && !removeBtn.__dfBound) {
      removeBtn.__dfBound = true;
      removeBtn.addEventListener(
        "click",
        function (evt) {
          evt.preventDefault();
          evt.stopPropagation(); // don't open file dialog
          clearSelection();
        },
        false
      );
    }

    function showSubmitIfFile() {
      var submit = document.getElementById("sub");
      if (!submit) return;

      var f = null;
      if (fileInput.files && fileInput.files.length > 0) {
        f = fileInput.files[0];
      } else if (label.__dfDroppedFile) {
        f = label.__dfDroppedFile;
      }

      if (f) {
        submit.style.display = "inline-block";
        // Ensure the submit is still connected to the form after DOM moves.
        try {
          var form = document.querySelector(".background1 form");
          if (form && form.id) submit.setAttribute("form", form.id);
        } catch (e) {}
        // In case it was disabled by a previous submit handler
        try {
          submit.removeAttribute("disabled");
        } catch (e) {}
        label.classList.add("df-dropzone--has-file");
        if (fileNameSpan) fileNameSpan.textContent = f.name;

        // Update preview
        if (preview) preview.classList.add("is-visible");
        if (nameEl) nameEl.textContent = f.name || "selected video";
        if (subEl) subEl.textContent = [formatBytes(f.size), (f.type || "video")].filter(Boolean).join(" • ");

        // Optional: tiny video preview (if browser supports it)
        if (thumbEl) {
          thumbEl.innerHTML = "";
          if (lastObjectUrl) {
            try {
              URL.revokeObjectURL(lastObjectUrl);
            } catch (e) {}
            lastObjectUrl = null;
          }
          try {
            lastObjectUrl = URL.createObjectURL(f);
            var vid = document.createElement("video");
            vid.className = "df-file-preview__video";
            vid.src = lastObjectUrl;
            vid.muted = true;
            vid.playsInline = true;
            vid.preload = "metadata";
            thumbEl.appendChild(vid);
          } catch (e) {
            // ignore preview failures
          }
        }
      } else {
        label.classList.remove("df-dropzone--has-file");
        if (fileNameSpan) {
          fileNameSpan.textContent = "";
        }
        clearPreview();
      }
    }

    // Drag & drop handlers on the dropzone.
    ["dragenter", "dragover"].forEach(function (evtName) {
      label.addEventListener(
        evtName,
        function (evt) {
          evt.preventDefault();
          evt.stopPropagation();
          label.classList.add("df-dropzone--active");
        },
        false
      );
    });

    ["dragleave", "dragend", "drop"].forEach(function (evtName) {
      label.addEventListener(
        evtName,
        function (evt) {
          evt.preventDefault();
          evt.stopPropagation();
          label.classList.remove("df-dropzone--active");
        },
        false
      );
    });

    label.addEventListener(
      "drop",
      function (evt) {
        var dt = evt.dataTransfer;
        if (!dt || !dt.files || dt.files.length === 0) return;

        // Assign dropped file to the hidden input (best-effort; may be blocked on some browsers).
        try {
          // Prefer creating a new DataTransfer with only the first file.
          if (window.DataTransfer) {
            var dt2 = new DataTransfer();
            dt2.items.add(dt.files[0]);
            fileInput.files = dt2.files;
          } else {
            fileInput.files = dt.files;
          }
        } catch (e) {
          // Some browsers don't allow direct assignment; fall back silently.
        }

        // Always keep a reference so submit can still work.
        label.__dfDroppedFile = dt.files[0];

        // Trigger change so React + our handler both run consistently.
        try {
          if (typeof Event === "function") {
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            var ev = document.createEvent("Event");
            ev.initEvent("change", true, true);
            fileInput.dispatchEvent(ev);
          }
        } catch (e) {}

        // If we couldn't assign files, still show the filename in the UI
        if ((!fileInput.files || fileInput.files.length === 0) && dt.files[0] && fileNameSpan) {
          fileNameSpan.textContent = dt.files[0].name;
        }
        showSubmitIfFile();
      },
      false
    );

    // Also react when user picks a file via the native dialog.
    fileInput.addEventListener("change", showSubmitIfFile, false);

    // If React re-renders, keep UI in sync with the current input state.
    showSubmitIfFile();
  }

  function enhanceDetectLayout() {
    if (!isDetectPath()) return;
    var bg = document.querySelector(".background1");
    if (!bg) return;

    // Create a single centered container once.
    var container = bg.querySelector(".detect-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "detect-container";
      container.innerHTML =
        '<div class="detect-header">' +
        '  <div class="detect-title">AI Deepfake Detection</div>' +
        '  <div class="detect-subtitle">Analyze Your Video with Advanced AI</div>' +
        "</div>" +
        '<div class="detect-upload"></div>' +
        '<div class="detect-actions"></div>' +
        '<div class="df-result-card" aria-live="polite">' +
        '  <div class="df-error" role="alert"></div>' +
        '  <div class="df-result-row">' +
        '    <div class="df-result-label">Prediction</div>' +
        '    <div class="df-pred-badge">--</div>' +
        "  </div>" +
        "</div>";
      bg.insertBefore(container, bg.firstChild);
    }

    // Hide the legacy heading.
    var oldH = bg.querySelector(".detectHeading");
    if (oldH) oldH.style.display = "none";

    // Move the existing form into the upload slot.
    var form = bg.querySelector("form");
    var uploadSlot = container.querySelector(".detect-upload");
    if (form && uploadSlot && form.parentNode !== uploadSlot) {
      uploadSlot.appendChild(form);
    }

    // Ensure form has a stable id so the submit button can live outside the form.
    if (form && !form.id) {
      form.id = "df-detect-form";
    }

    // Move the submit button into the action slot (and rename it).
    var actions = container.querySelector(".detect-actions");
    var submit = document.getElementById("sub");
    if (submit) {
      try {
        if (submit.value !== "🚀 Analyze Video") {
          submit.value = "🚀 Analyze Video";
        }
      } catch (e) {}
      // Critical: keep it wired to the form even if we move it.
      try {
        if (form && form.id) submit.setAttribute("form", form.id);
      } catch (e) {}
    }
    if (actions && submit && submit.parentNode !== actions) {
      actions.appendChild(submit);
    }

    // Remove placeholder line from view (we show results in our result card).
    var line = document.getElementById("line");
    if (line) line.style.display = "none";
  }

  function enhanceDetectSubmission() {
    if (!isDetectPath()) return;
    var form = document.querySelector(".background1 form");
    var fileInput = document.getElementById("video");
    var label = document.querySelector('label.button[for="video"]');
    if (!form || !fileInput || !label) return;

    if (form.__dfEnhancedSubmit) return;
    form.__dfEnhancedSubmit = true;

    function showOverlay() {
      var o = document.getElementById("loadingOverlay");
      if (!o) return;
      o.classList.add("is-visible");
      o.setAttribute("aria-hidden", "false");
    }

    form.addEventListener(
      "submit",
      function (evt) {
        // If browser has a real file in the input, let normal form submit.
        // If not, fall back to fetch upload (drag-drop safety).
        var hasInputFile = fileInput.files && fileInput.files.length > 0;
        var f = hasInputFile ? fileInput.files[0] : label.__dfDroppedFile;
        if (!f) return;

        if (hasInputFile) return;

        evt.preventDefault();
        evt.stopPropagation();
        showOverlay();

        var fd = new FormData();
        fd.append("video", f, f.name || "video.mp4");

        fetch("/Detect", { method: "POST", body: fd })
          .then(function (res) {
            return res.text();
          })
          .then(function (html) {
            document.open();
            document.write(html);
            document.close();
          })
          .catch(function () {
            try {
              form.submit();
            } catch (e) {}
          });
      },
      true
    );
  }

  function enhanceDetectResults() {
    if (!isDetectPath()) return;

    var container = document.querySelector(".detect-container");
    if (!container) return;

    var resultCard = container.querySelector(".df-result-card");
    if (!resultCard) return;

    function safeParseData() {
      try {
        if (!window.data) return null;
        var s = String(window.data);
        if (!s || s === "None" || s === "undefined") return null;
        if (s.indexOf("&#34;") !== -1 && s.replace) {
          s = s.replace(/&#34;/g, '"');
        }
        return JSON.parse(s);
      } catch (e) {
        return null;
      }
    }

    var data = safeParseData();
    if (!data) {
      resultCard.classList.remove("is-visible");
      return;
    }

    var errEl = resultCard.querySelector(".df-error");
    var badge = resultCard.querySelector(".df-pred-badge");
    var confText = resultCard.querySelector(".df-conf-text");
    var barFill = resultCard.querySelector(".df-conf-fill");
    var rows = resultCard.querySelectorAll(".df-result-row");
    var bar = resultCard.querySelector(".df-conf-bar");

    // Error state from backend
    if (data.error) {
      if (errEl) {
        errEl.textContent = String(data.error);
        errEl.classList.add("is-visible");
      }
      if (rows) {
        for (var i = 0; i < rows.length; i++) rows[i].style.display = "none";
      }
      if (bar) bar.style.display = "none";
      resultCard.classList.add("is-visible");
      return;
    }

    // Normal success state
    if (errEl) {
      errEl.textContent = "";
      errEl.classList.remove("is-visible");
    }
    if (rows) {
      for (var j = 0; j < rows.length; j++) rows[j].style.display = "flex";
    }
    if (bar) bar.style.display = "block";

    if (!data.output) {
      resultCard.classList.remove("is-visible");
      return;
    }

    var out = String(data.output || "");
    var conf = null;

    if (badge) {
      badge.textContent = out.toUpperCase();
      badge.classList.remove("is-real");
      badge.classList.remove("is-fake");
      if (out.toLowerCase().indexOf("real") !== -1) badge.classList.add("is-real");
      if (out.toLowerCase().indexOf("fake") !== -1) badge.classList.add("is-fake");
    }
    if (confText) confText.textContent = "";
    if (barFill) barFill.style.width = "0%";

    resultCard.classList.add("is-visible");
  }

  function apply() {
    if (__dfIsApplying) return;
    __dfIsApplying = true;
    if (isHomePath()) {
      disableInlineAppBackground();
      buildHomeHero();
    } else if (isDetectPath()) {
      disableInlineAppBackground();
      enhanceDetectLayout();
      enhanceDetectDropzone();
      enhanceDetectSubmission();
      enhanceDetectResults();
    }
    __dfIsApplying = false;
  }

  // React renders after load and may re-render when changing routes.
  // We re-apply whenever the DOM changes on home, plus on navigation events.
  function initialTick() {
    apply();
  }

  window.addEventListener("load", initialTick);
  window.addEventListener("popstate", initialTick);
  window.addEventListener("hashchange", initialTick);

  if (window.MutationObserver) {
    var observer = new MutationObserver(function () {
      if (__dfIsApplying) return;
      if (!(isHomePath() || isDetectPath())) return;
      if (__dfApplyScheduled) return;
      __dfApplyScheduled = true;
      window.setTimeout(function () {
        __dfApplyScheduled = false;
        apply();
      }, 60);
    });
    var rootEl = document.getElementById("root") || document.body || document.documentElement;
    observer.observe(rootEl, {
      childList: true,
      subtree: true,
    });
  }
})();


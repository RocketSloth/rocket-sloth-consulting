(function () {
  const canvas = document.querySelector("#starfield canvas");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: 180 }, function () {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.4 + 0.25,
        a: Math.random() * Math.PI * 2,
        s: Math.random() * 0.01 + 0.004
      };
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    stars.forEach(function (star) {
      star.a += star.s;
      const alpha = 0.18 + Math.abs(Math.sin(star.a)) * 0.72;

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, " + alpha + ")";
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
})();

(function () {
  const nav = document.getElementById("nav");
  if (!nav) {
    return;
  }

  let lastScroll = 0;

  window.addEventListener("scroll", function () {
    const currentScroll = window.scrollY;
    nav.classList.toggle("is-hidden", currentScroll > lastScroll && currentScroll > 96);
    lastScroll = currentScroll;
  });
})();

(function () {
  const elements = document.querySelectorAll(".reveal");
  if (!elements.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    elements.forEach(function (element) {
      element.classList.add("is-visible");
    });
    return;
  }

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(function (element) {
    observer.observe(element);
  });
})();

(function () {
  const forms = document.querySelectorAll("[data-signup-form]");
  if (!forms.length) {
    return;
  }

  function setStatus(form, message, tone) {
    const statusEl = form.querySelector("[data-form-status]");
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message;

    if (tone) {
      statusEl.dataset.tone = tone;
    } else {
      delete statusEl.dataset.tone;
    }
  }

  forms.forEach(function (form) {
    const button = form.querySelector("[data-submit-button]");
    const originalLabel = button ? button.textContent : "";
    const redirectTarget = form.dataset.redirect || "/thank-you";

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!form.reportValidity()) {
        return;
      }

      const rawEntries = Object.fromEntries(new FormData(form).entries());
      const payload = {
        name: String(rawEntries.name || "").trim(),
        email: String(rawEntries.email || "").trim(),
        company: String(rawEntries.company || "").trim() || "Discovery call lead",
        interest: String(rawEntries.interest || "").trim() || "Workflow assessment request"
      };

      if (button) {
        button.disabled = true;
        button.textContent = "Submitting...";
      }

      setStatus(form, "Saving your signup...", "");

      try {
        const response = await fetch(form.action, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(function () {
          return {};
        });

        if (!response.ok) {
          throw new Error(data.error || "Something went wrong. Please try again.");
        }

        setStatus(form, "You are in. Redirecting...", "success");
        window.location.href = redirectTarget;
      } catch (error) {
        setStatus(form, error.message || "Something went wrong. Please try again.", "error");

        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
      }
    });
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get("signup") === "error") {
    forms.forEach(function (form) {
      setStatus(form, "Signup is not configured yet. Add the Supabase env vars and try again.", "error");
    });
  }
})();

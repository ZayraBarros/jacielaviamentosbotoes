/* =========================================================
   main.js — Jaciel Aviamentos
   - Atualiza ano do footer
   - Anexa UTMs aos links do WhatsApp (sem referrer/page)
   - Animações on-scroll
   - Carrossel de produtos (drag + setas)
   ========================================================= */

/* ===== Footer year (single source of truth) ===== */
document.addEventListener("DOMContentLoaded", () => {
  const y = document.querySelector("#year");
  if (y) y.textContent = String(new Date().getFullYear());
});

/* ===== UTM → WhatsApp (somente UTMs; sem referrer/page) ===== */
function parseUTM() {
  const p = new URLSearchParams(location.search);
  const get = k => p.get(k) || "";
  return {
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_term: get("utm_term"),
    utm_content: get("utm_content"),
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const utm = parseUTM();

  // monta string apenas com UTMs preenchidos
  const utmStr = Object.entries(utm)
    .filter(([, v]) => v && v.length)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");

  if (!utmStr) return;

  // cobre tanto wa.me quanto api.whatsapp.com
  const selectors = 'a[href*="wa.me/"], a[href*="api.whatsapp.com/"]';
  document.querySelectorAll(selectors).forEach(a => {
    try {
      const url = new URL(a.href);
      const txt = url.searchParams.get("text") || "";
      const sep = txt ? "\n\n" : ""; // quebra de linha real
      url.searchParams.set("text", `${txt}${sep}${utmStr}`);
      a.href = url.toString();
    } catch (e) {
      // ignora hrefs malformados
    }
  });
});

/* ===== On-scroll reveal (IntersectionObserver) ===== */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const els = document.querySelectorAll(`
    [data-animate],
    .stat-card,
    .service-card,
    .t-card,
    .closing-box,
    .numbers .text-center
  `);

  els.forEach(el => {
    if (!el.hasAttribute("data-animate")) el.setAttribute("data-animate", "slide-up");
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  els.forEach(el => io.observe(el));
})();

/* ===== Carrossel de produtos (scroll + setas + drag) ===== */
(function () {
  function getTrack() { return document.getElementById("productCarousel"); }
  function getButtons() {
    return {
      prev: document.querySelector(".carousel-btn.prev"),
      next: document.querySelector(".carousel-btn.next"),
    };
  }
  function gapOf(track) {
    return parseFloat(getComputedStyle(track).gap || "24") || 24;
  }
  function stepOf(track) {
    const gap = gapOf(track);
    const card = track.querySelector(".product-card");
    if (!card) return 320 + gap; // fallback
    const rect = card.getBoundingClientRect();
    return rect.width + gap; // 1 card por clique
  }
  function clamp(track, x) {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    return Math.max(0, Math.min(x, max));
  }
  function updateControls() {
    const track = getTrack();
    if (!track) return;
    const { prev, next } = getButtons();
    const max = track.scrollWidth - track.clientWidth - 1; // tolerância
    const atStart = track.scrollLeft <= 0;
    const atEnd = track.scrollLeft >= max;
    if (prev) {
      prev.disabled = atStart;
      prev.setAttribute("aria-disabled", String(atStart));
    }
    if (next) {
      next.disabled = atEnd;
      next.setAttribute("aria-disabled", String(atEnd));
    }
  }

  // função global chamada pelo HTML (onclick) — mantém compatibilidade
  window.scrollCarousel = function (dir) {
    const track = getTrack();
    if (!track) return;
    const delta = (dir === "prev" ? -1 : 1) * stepOf(track);
    track.scrollTo({ left: clamp(track, track.scrollLeft + delta), behavior: "smooth" });
    setTimeout(updateControls, 350); // revalida após o smooth
  };

  document.addEventListener("DOMContentLoaded", () => {
    const track = getTrack();
    if (!track) return;

    // seta eventos nas setas (além do onclick inline, se existir)
    const { prev, next } = getButtons();
    if (prev) prev.addEventListener("click", () => window.scrollCarousel("prev"));
    if (next) next.addEventListener("click", () => window.scrollCarousel("next"));

    // estado dos botões
    track.addEventListener("scroll", updateControls, { passive: true });
    window.addEventListener("resize", updateControls, { passive: true });

    // drag-to-scroll (desktop)
    let isDown = false, startX = 0, startLeft = 0;
    track.addEventListener("mousedown", (e) => {
      isDown = true;
      startX = e.pageX;
      startLeft = track.scrollLeft;
      track.classList.add("grabbing");
    });
    window.addEventListener("mouseup", () => {
      if (!isDown) return;
      isDown = false;
      track.classList.remove("grabbing");
      updateControls();
    });
    window.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      track.scrollLeft = clamp(track, startLeft - dx);
    });

    // quando imagens carregarem, recalcula largura/controles
    track.querySelectorAll("img").forEach(img => {
      if (!img.complete) img.addEventListener("load", updateControls, { once: true });
    });

    updateControls();
  });
})();

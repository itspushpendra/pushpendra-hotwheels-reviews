
(() => {
  const configReady = window.SUPABASE_URL && window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_URL.startsWith("YOUR_") && !window.SUPABASE_ANON_KEY.startsWith("YOUR_");

  const client = configReady && window.supabase
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

  const categories = ["packaging", "delivery", "pricing", "communication"];
  const selected = { packaging: 0, delivery: 0, pricing: 0, communication: 0 };

  const $ = id => document.getElementById(id);
  const msg = (id, text, error = false) => {
    const el = $(id);
    el.textContent = text;
    el.classList.toggle("error", error);
  };

  const stars = n => "★".repeat(n) + "☆".repeat(5 - n);
  const dateLabel = d => new Date(d).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric"
  });

  document.querySelectorAll(".star-picker").forEach(group => {
    const key = group.dataset.rating;
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "★";
      b.setAttribute("aria-label", `${i} stars`);
      b.addEventListener("click", () => {
        selected[key] = i;
        [...group.children].forEach((x, j) => x.classList.toggle("active", j < i));
      });
      group.appendChild(b);
    }
  });

  $("review-text").addEventListener("input", e => {
    $("char-count").textContent = `${e.target.value.length} / 1200`;
  });

  $("review-photos").addEventListener("change", e => {
    const files = [...e.target.files];
    $("photo-preview").innerHTML = "";

    if (files.length > 3) {
      e.target.value = "";
      msg("form-message", "Please select no more than 3 photos.", true);
      return;
    }

    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        e.target.value = "";
        $("photo-preview").innerHTML = "";
        msg("form-message", "Each photo must be 5 MB or smaller.", true);
        return;
      }

      const img = document.createElement("img");
      img.src = URL.createObjectURL(f);
      $("photo-preview").appendChild(img);
    }
  });

  async function loadReviews() {
    if (!client) {
      $("reviews-list").innerHTML =
        '<div class="empty-state"><span>★</span><h3>CONNECT YOUR FREE DATABASE</h3><p>Complete the Supabase setup in README.md to display live public reviews.</p></div>';
      return;
    }

    const { data, error } = await client.from("reviews")
      .select("id,customer_name,review_text,packaging,delivery,pricing,communication,created_at,photo_urls")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      $("reviews-list").innerHTML =
        '<div class="empty-state"><h3>REVIEWS TEMPORARILY UNAVAILABLE</h3><p>Please try again later.</p></div>';
      return;
    }

    renderReviews(data || []);
  }

  function renderReviews(rows) {
    $("review-count").textContent = rows.length
      ? `Based on ${rows.length} published review${rows.length === 1 ? "" : "s"}`
      : "No published reviews yet";

    $("review-total").textContent = `${rows.length} REVIEW${rows.length === 1 ? "" : "S"}`;

    if (!rows.length) {
      $("overall-rating").textContent = "—";
      $("overall-stars").textContent = "☆☆☆☆☆";
      categories.forEach(k => $("avg-" + k).textContent = "—");

      $("reviews-list").innerHTML =
        '<div class="empty-state"><span>★</span><h3>THE FIRST REVIEW STARTS HERE</h3><p>Once a customer submits a review and it is approved, it will appear here for everyone to see.</p></div>';
      return;
    }

    const avg = rows.reduce((s, r) =>
      s + categories.reduce((a, k) => a + r[k], 0) / 4, 0) / rows.length;

    $("overall-rating").textContent = avg.toFixed(1);
    $("overall-stars").textContent = stars(Math.round(avg));

    categories.forEach(k => {
      $("avg-" + k).textContent =
        (rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(1) + " ★";
    });

    $("reviews-list").innerHTML = rows.map(r =>
      `<article class="review-card">
        <div class="review-card-head">
          <div><h3>${esc(r.customer_name)}</h3><div class="date">${dateLabel(r.created_at)}</div></div>
          <span class="date">CUSTOMER REVIEW</span>
        </div>
        <div class="overall-stars">${stars(Math.round(categories.reduce((a, k) => a + r[k], 0) / 4))}</div>
        <p>${esc(r.review_text)}</p>
        <div class="review-ratings">${categories.map(k => `<span>${k.toUpperCase()} <b>${r[k]}★</b></span>`).join("")}</div>
        ${(r.photo_urls || []).length
          ? `<div class="review-photos">${r.photo_urls.map(u => `<a href="${safeUrl(u)}" target="_blank" rel="noopener"><img src="${safeUrl(u)}" alt="Customer review photo" loading="lazy"></a>`).join("")}</div>`
          : ""}
      </article>`
    ).join("");
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function safeUrl(s) {
    try {
      const u = new URL(s);
      return u.protocol === "https:" ? u.href : "#";
    } catch {
      return "#";
    }
  }

  $("review-form").addEventListener("submit", async e => {
    e.preventDefault();

    if (!client) {
      msg("form-message", "The site owner needs to finish the free Supabase setup before reviews can be submitted.", true);
      return;
    }

    if (categories.some(k => !selected[k])) {
      msg("form-message", "Please select a star rating for all four categories.", true);
      return;
    }

    const files = [...$("review-photos").files];

    if (files.length > 3) {
      msg("form-message", "Please select no more than 3 photos.", true);
      return;
    }

    const button = e.submitter;
    button.disabled = true;
    button.textContent = "SUBMITTING…";

    try {
      const photoUrls = [];

      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size > 5 * 1024 * 1024) {
          throw new Error("Use JPG, PNG or WebP images up to 5 MB each.");
        }

        const ext = file.type === "image/png" ? "png" :
          file.type === "image/webp" ? "webp" : "jpg";

        const path = `${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await client.storage
          .from("review-photos")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (upErr) throw upErr;

        const { data } = client.storage.from("review-photos").getPublicUrl(path);
        photoUrls.push(data.publicUrl);
      }

      const payload = {
        customer_name: $("customer-name").value.trim(),
        order_reference: $("order-ref").value.trim() || null,
        review_text: $("review-text").value.trim(),
        photo_urls: photoUrls,
        status: "pending",
        ...selected
      };

      const { error } = await client.from("reviews").insert(payload);
      if (error) throw error;

      $("review-form").reset();

      categories.forEach(k => {
        selected[k] = 0;
        const g = document.querySelector(`[data-rating="${k}"]`);
        [...g.children].forEach(b => b.classList.remove("active"));
      });

      $("photo-preview").innerHTML = "";
      $("char-count").textContent = "0 / 1200";

      msg("form-message", "Thank you! Your review has been submitted and will appear publicly after approval.");

    } catch (err) {
      msg("form-message", err.message || "Could not submit your review. Please try again.", true);
    } finally {
      button.disabled = false;
      button.innerHTML = 'SUBMIT FOR APPROVAL <span>→</span>';
    }
  });

  $("login-form").addEventListener("submit", async e => {
    e.preventDefault();

    if (!client) {
      msg("login-message", "Complete the Supabase setup first.", true);
      return;
    }

    const { error } = await client.auth.signInWithOtp({
      email: $("admin-email").value.trim(),
      options: {
        emailRedirectTo: location.origin + location.pathname + "#admin"
      }
    });

    msg("login-message",
      error ? error.message : "Sign-in link sent. Check your email.",
      !!error
    );
  });

  $("sign-out").addEventListener("click", () => client?.auth.signOut());

  async function refreshAdmin(sessionOverride) {
    if (!client) return;

    let session = sessionOverride;

    if (session === undefined) {
      const { data, error } = await client.auth.getSession();
      if (error) {
        console.error("Session error:", error);
        return;
      }
      session = data.session;
    }

    $("admin-signed-out").hidden = !!session;
    $("admin-signed-in").hidden = !session;

    if (!session) return;

    const { data, error } = await client.from("reviews")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    $("pending-list").innerHTML = error
      ? `<p class="form-message error">${esc(error.message)}</p>`
      : (!data.length
        ? '<p class="muted">No reviews waiting for approval.</p>'
        : data.map(r => `
          <div class="pending-item">
            <b>${esc(r.customer_name)}</b>
            <span class="muted"> · ${dateLabel(r.created_at)}</span>
            <p>${esc(r.review_text)}</p>
            <div class="review-ratings">
              ${categories.map(k => `<span>${k}: <b>${r[k]}★</b></span>`).join("")}
            </div>
            ${r.order_reference ? `<p class="muted">Order reference: ${esc(r.order_reference)}</p>` : ""}
            ${(r.photo_urls || []).map(u => `<a href="${safeUrl(u)}" target="_blank" rel="noopener"><img src="${safeUrl(u)}" style="width:85px;height:85px;object-fit:cover;margin:8px 8px 0 0"></a>`).join("")}
            <div class="pending-actions">
              <button class="secondary-btn approve" data-id="${r.id}" data-status="approved">APPROVE</button>
              <button class="secondary-btn reject" data-id="${r.id}" data-status="rejected">REJECT</button>
            </div>
          </div>`
        ).join(""));

    $("pending-list").querySelectorAll("button[data-id]").forEach(b => {
      b.addEventListener("click", async () => {
        b.disabled = true;

        const { error } = await client.from("reviews")
          .update({ status: b.dataset.status })
          .eq("id", b.dataset.id);

        if (error) {
          alert(error.message);
          b.disabled = false;
        } else {
          await refreshAdmin();
          await loadReviews();
        }
      });
    });
  }

  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        setTimeout(() => refreshAdmin(session), 0);
      }
    });
  }

  loadReviews();
  refreshAdmin();
})();

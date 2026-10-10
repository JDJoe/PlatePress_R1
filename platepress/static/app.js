const $ = (id) => document.getElementById(id);
const banner = $("banner");
let book = {};
let settings = {};
let pollTimer = null;

function showBanner(text, kind) {
  banner.textContent = text || "";
  banner.className = text ? kind || "err" : "";
}

function setComfyStatus(ok, message) {
  const chip = $("comfy-status");
  if (!chip) return;
  chip.dataset.state = ok ? "ok" : "err";
  chip.title = message || "";
  const txt = chip.querySelector(".status-text");
  if (txt) txt.textContent = ok ? "ComfyUI connected" : "ComfyUI offline";
}

async function j(url, opts) {
  const r = await fetch(url, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data.detail || data.error || r.statusText;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

async function withBusy(el, busyLabel, fn) {
  if (!el || el.disabled) return;
  const label = el.textContent;
  el.disabled = true;
  el.textContent = busyLabel;
  try {
    await fn();
  } finally {
    el.disabled = false;
    el.textContent = label;
  }
}

function setView(name) {
  document.querySelectorAll("nav button").forEach((b) => {
    b.classList.toggle("on", b.dataset.view === name);
    if (b.dataset.view === name) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("on", v.id === "view-" + name);
  });
  showCurrentBook();
  window.scrollTo(0, 0);
  if (name === "queue") refreshRuns();
  if (name === "settings") loadBooks();
}

document.querySelectorAll("nav button").forEach((b) => {
  b.addEventListener("click", () => setView(b.dataset.view));
});

const SET_KEYS = [
  "host", "port", "workflow_text", "workflow_ref",
  "models_dir", "loras_dir", "unet_name",
  "style", "layout", "layout_text", "tail", "neg",
  "images_per_plate", "image_width", "image_height", "output_root",
  "steps", "cfg", "sampler_name", "scheduler",
];
const LORA_SLOTS = 4;
let weightLists = { models: [], loras: [] };

function krea2Name(name) {
  return /krea/i.test(name || "");
}

function resolveCombo(wanted, available) {
  const name = String(wanted || "").trim();
  const list = available || [];
  if (!name || !list.length) return name;
  if (list.indexOf(name) >= 0) return name;
  const base = name.split("/").pop();
  const hits = list.filter((n) => String(n).split("/").pop() === base);
  if (hits.length === 1) return hits[0];
  return name;
}

function updateUnetWarn() {
  const el = $("unet-warn");
  if (!el) return;
  const name = ($("unet_name") && $("unet_name").value) || "";
  const models = weightLists.models || [];
  const resolved = resolveCombo(name, models);
  const inList = !models.length || !name || models.indexOf(resolved) >= 0;
  const krea = !name || krea2Name(resolved);
  if (name && models.length && !inList) {
    el.textContent = name + " is not in Comfy’s UNETLoader list. Load lists from Comfy and pick the exact name.";
    el.classList.remove("off");
    return;
  }
  el.textContent = "Must be a Krea 2 UNET. Pick the exact Comfy name (e.g. KREA2/krea2_turbo_bf16.safetensors). Bare filenames fail. This app does not download models.";
  el.classList.toggle("off", krea);
}

function fillDatalist(id, names, extra) {
  const dl = $(id);
  if (!dl) return;
  const seen = new Set();
  dl.innerHTML = "";
  [extra, ...(names || [])].forEach((n) => {
    if (!n || seen.has(n)) return;
    seen.add(n);
    const o = document.createElement("option");
    o.value = n;
    dl.appendChild(o);
  });
}

function readLoras() {
  const box = $("lora-stack");
  if (!box) return [];
  const out = [];
  box.querySelectorAll(".lora-row").forEach((row) => {
    const name = String((row.querySelector(".lora-name") || {}).value || "").trim();
    if (!name) return;
    const strength = Number((row.querySelector(".lora-strength") || {}).value);
    out.push({ name, strength: Number.isFinite(strength) ? strength : 0.8 });
  });
  return out.slice(0, LORA_SLOTS);
}

function renderLoras(slots) {
  const box = $("lora-stack");
  if (!box) return;
  const list = (slots && slots.length) ? slots.slice(0, LORA_SLOTS) : [{ name: "", strength: 0.8 }];
  box.innerHTML = "";
  list.forEach((slot, i) => {
    const row = document.createElement("div");
    row.className = "lora-row";
    row.innerHTML = `
      <span class="lora-idx${i === 0 ? " first" : ""}" title="${i === 0 ? "Style LoRA" : "LoRA " + (i + 1)}">${i + 1}</span>
      <div>
        <label for="lora-name-${i}">${i === 0 ? "LoRA 1 · style" : "LoRA " + (i + 1)}</label>
        <input class="lora-name" id="lora-name-${i}" type="text" list="lora-list" autocomplete="off" placeholder="folder/file.safetensors" />
      </div>
      <div>
        <label for="lora-strength-${i}">Strength</label>
        <input class="lora-strength" id="lora-strength-${i}" type="number" step="0.05" />
      </div>
      <div class="lora-remove-wrap">
        <button type="button" class="act ghost small lora-remove" aria-label="Remove LoRA ${i + 1}">Remove</button>
      </div>`;
    row.querySelector(".lora-name").value = slot.name || "";
    row.querySelector(".lora-strength").value = slot.strength ?? 0.8;
    row.querySelector(".lora-remove").onclick = () => {
      const next = [...box.querySelectorAll(".lora-row")]
        .map((r, j) => ({
          name: String((r.querySelector(".lora-name") || {}).value || "").trim(),
          strength: Number((r.querySelector(".lora-strength") || {}).value) || 0.8,
          drop: j === i,
        }))
        .filter((x) => !x.drop)
        .map(({ name, strength }) => ({ name, strength }));
      renderLoras(next);
    };
    box.appendChild(row);
  });
  const add = $("add-lora");
  if (add) add.disabled = list.length >= LORA_SLOTS;
}

function layoutValue() {
  return ($("layout") && $("layout").value) || (settings.layout) || "one";
}

function updateAssemblePreview() {
  const box = $("assemble-preview");
  if (!box) return;
  const bits = [
    ($("style") && $("style").value.trim()) || "",
    ($("layout_text") && $("layout_text").value.trim()) || "",
    layoutValue() === "split"
      ? "Left pane: (first slug). Right pane: (next slug)."
      : "",
    ($("tail") && $("tail").value.trim()) || "",
    "(Book wall — Text / Image columns on Parse)",
  ].filter(Boolean);
  box.textContent = bits.join(" ");
}

function renderExamples(examples) {
  const box = $("examples");
  if (!box) return;
  box.innerHTML = "";
  const list = examples && typeof examples === "object"
    ? Object.values(examples)
    : [];
  list.forEach((ex) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "example";
    btn.dataset.exid = ex.id || "";
    btn.innerHTML = `<strong>${ex.label || ex.id}</strong><span>${ex.blurb || ""}</span>`;
    btn.addEventListener("click", () => applyExample(ex));
    box.appendChild(btn);
  });
  markActiveExample();
}

function exampleInserts() {
  const examples = settings.examples && typeof settings.examples === "object"
    ? Object.values(settings.examples)
    : [];
  return examples.map((ex) => String((ex && ex.insert) || "").trim()).filter(Boolean);
}

function markActiveExample() {
  const style = ($("style") && $("style").value) || "";
  const inserts = exampleInserts();
  const hasInsert = inserts.some((line) => style.includes(line));
  document.querySelectorAll("#examples .example").forEach((btn) => {
    const ex = (settings.examples || {})[btn.dataset.exid] || {};
    const line = String(ex.insert || "").trim();
    btn.classList.toggle("on", line ? style.includes(line) : !hasInsert);
  });
}

function appendStyleLine(line) {
  const el = $("style");
  const addition = String(line || "").trim();
  if (!el || !addition) return false;
  const cur = el.value.replace(/\s+$/, "");
  if (cur.includes(addition)) return false;
  el.value = cur ? `${cur} ${addition}` : addition;
  return true;
}

function removeStyleLine(line) {
  const el = $("style");
  const removal = String(line || "").trim();
  if (!el || !removal || !el.value.includes(removal)) return false;
  el.value = el.value
    .split(removal)
    .join(" ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^\s+/, "")
    .replace(/\s+$/, "");
  return true;
}

async function saveExample(message) {
  markActiveExample();
  updateAssemblePreview();
  settings = await j("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(readSettings()),
  });
  fillSettings(settings);
  showBanner(message, "ok");
}

async function applyExample(ex) {
  if (!ex) return;
  const line = String(ex.insert || "").trim();
  const name = ex.label || ex.id || "example";
  try {
    if (!line) {
      let removed = false;
      exampleInserts().forEach((insert) => {
        if (removeStyleLine(insert)) removed = true;
      });
      if ($("layout")) $("layout").value = "one";
      await saveExample(
        removed
          ? "Removed the two-pane line. The rest of the style box stays."
          : "One plate. The style box stays as written."
      );
      return;
    }
    const added = appendStyleLine(line);
    await saveExample(added ? "added " + name + " to the style box" : name + " is already in the style box");
  } catch (e) {
    showBanner(e.message, "err");
  }
}

function fillSettings(s) {
  settings = s;
  rememberBookGen(s);
  SET_KEYS.forEach((k) => {
    const el = $(k);
    if (el) el.value = s[k] ?? "";
  });
  if ($("layout")) $("layout").value = s.layout || "one";
  renderLoras(s.loras);
  fillDatalist("unet-list", weightLists.models, s.unet_name);
  fillDatalist("lora-list", weightLists.loras, (s.loras && s.loras[0] && s.loras[0].name) || s.lora_name);
  updateUnetWarn();
  renderExamples(s.examples);
  updateAssemblePreview();
}

function readSettings() {
  const body = {};
  SET_KEYS.forEach((k) => {
    const el = $(k);
    if (!el) return;
    const v = el.value;
    body[k] = el.type === "number" ? Number(v) : v;
  });
  body.loras = readLoras();
  return body;
}

const BOOK_GEN_KEYS = [
  "style", "layout", "layout_text", "tail", "neg",
  "unet_name", "loras", "lora_name", "lora_strength",
  "steps", "cfg", "sampler_name", "scheduler",
  "images_per_plate", "image_width", "image_height",
];

function rememberBookGen(s) {
  if (!s) return;
  BOOK_GEN_KEYS.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(s, k)) book[k] = s[k];
  });
}

async function saveSettingsSilent() {
  settings = await j("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(readSettings()),
  });
  rememberBookGen(settings);
  return settings;
}

function bookLabel() {
  const id = book.id || "";
  const title = (book.title || "").trim();
  if (title && id && title !== id) return `${id} · ${title}`;
  return id || title || "no book";
}

function showCurrentBook() {
  const label = bookLabel();
  const header = $("current-book");
  if (header) header.textContent = label;
  document.querySelectorAll("[data-book-heading]").forEach((el) => {
    const prefix = el.getAttribute("data-book-heading") || "";
    el.textContent = prefix ? `${prefix} · ${label}` : label;
  });
  const bookId = $("book-id");
  if (bookId) bookId.textContent = book.id ? `folder ${book.id} — cast, story, and plates live here` : "";
}

function renderCast() {
  showCurrentBook();
  const box = $("cast");
  box.innerHTML = "";
  (book.characters || []).forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "card char-card";
    const slots = (c.ref_slots || []).map((slot) => {
      const on = slot.active ? "on" : "off";
      const label = slot.active ? "active" : "disabled";
      const img = slot.url ? `<img src="${slot.url}" alt="${slot.name}" />` : "";
      return `<div class="ref-slot ${on}">
        ${img}
        <div class="tiny" title="${slot.name} · ${label}">${slot.name} · ${label}</div>
        <div class="ref-actions">
          <button type="button" class="act ghost" data-useref="${c.name}" data-cid="${c.id}" data-refpath="${encodeURIComponent(slot.path)}" ${slot.active ? "disabled" : ""}>Use this</button>
          <button type="button" class="act danger" data-rmref="${c.name}" data-cid="${c.id}" data-rmpath="${encodeURIComponent(slot.path)}">Remove</button>
        </div>
      </div>`;
    }).join("");
    div.innerHTML = `
      <div class="char-head">
        <div class="field">
          <label for="char-name-${i}">Name <span class="hint">wall token</span></label>
          <input type="text" id="char-name-${i}" data-k="name" data-i="${i}" value="${c.name || ""}" />
        </div>
      </div>
      <div class="field">
        <label for="char-lock-${i}">Lock <span class="hint">face · suit · pack</span></label>
        <textarea id="char-lock-${i}" data-k="lock_text" data-i="${i}">${c.lock_text || ""}</textarea>
      </div>
      <div class="char-meta">
        <label class="tiny"><input type="checkbox" data-k="ref_cutout" data-i="${i}" ${c.ref_cutout ? "checked" : ""} /> Cutout (background already removed)</label>
        <p class="tiny seed">Locked seed: <span class="badge${c.locked_seed != null ? " accent" : ""}">${c.locked_seed ?? "none"}</span>
          <button type="button" class="act ghost small" data-clear="${c.name}">Clear seed</button></p>
      </div>
      <div class="field">
        <span class="lbl">Still <span class="hint">one body</span></span>
        <div class="ref-row">${slots || '<p class="ref-empty">No still yet</p>'}</div>
        <label class="tiny" for="char-file-${i}">Replace still</label>
        <input type="file" id="char-file-${i}" accept="image/*" data-upload="${c.name}" data-cid="${c.id}" />
      </div>
      <div class="char-foot">
        <button type="button" class="act danger small" data-del-id="${c.id || ""}" data-del-name="${c.name || ""}">Delete character</button>
      </div>
    `;
    box.appendChild(div);
  });
  if (!(book.characters || []).length) {
    box.innerHTML = `<div class="empty-state"><strong>No characters in this book yet</strong>
      <p>Add a character to give the wall a token like <code>CHAR1</code>, a lock, and an optional still — or load the demo cast.</p></div>`;
  }
  box.querySelectorAll("input[data-k], textarea[data-k]").forEach((el) => {
    el.addEventListener("change", () => {
      const i = Number(el.dataset.i);
      if (el.dataset.k === "name") {
        const token = el.value.trim();
        const clash = (book.characters || []).some((c, j) => j !== i && c.name === token);
        if (clash) {
          showBanner(`${token} already exists. Replace the still on that card.`, "err");
          el.value = book.characters[i].name;
          return;
        }
      }
      book.characters[i][el.dataset.k] = el.type === "checkbox" ? el.checked : el.value;
      saveBookSilent().catch((e) => {
        showBanner(e.message, "err");
        loadBook();
      });
    });
  });
  function bindDelete(el) {
    el.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const id = el.getAttribute("data-del-id") || "";
      const name = el.getAttribute("data-del-name") || "";
      try {
        const r = await j("/api/character/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name }),
        });
        book = r.book;
        renderCast();
        showBanner("character removed", "ok");
      } catch (e) {
        showBanner(e.message, "err");
      }
    });
  }
  box.querySelectorAll("[data-del-id], [data-del]").forEach(bindDelete);
  box.querySelectorAll("[data-clear]").forEach((el) => {
    el.addEventListener("click", async () => {
      await j("/api/lock-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: el.dataset.clear, clear: true }),
      });
      await loadBook();
    });
  });
  box.querySelectorAll("[data-upload]").forEach((el) => {
    el.addEventListener("change", async () => {
      if (!el.files[0]) return;
      const fd = new FormData();
      fd.append("character", el.dataset.upload);
      fd.append("character_id", el.dataset.cid || "");
      fd.append("file", el.files[0]);
      const r = await fetch("/api/upload-ref", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) { showBanner(data.detail || "upload failed", "err"); return; }
      book = data.book;
      renderCast();
    });
  });
  box.querySelectorAll("[data-rmref]").forEach((el) => {
    el.addEventListener("click", async () => {
      const r = await j("/api/remove-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: el.dataset.cid,
          character: el.dataset.rmref,
          path: decodeURIComponent(el.dataset.rmpath),
        }),
      });
      book = r.book;
      renderCast();
    });
  });
  box.querySelectorAll("[data-useref]").forEach((el) => {
    el.addEventListener("click", async () => {
      const r = await j("/api/activate-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: el.dataset.cid,
          character: el.dataset.useref,
          path: decodeURIComponent(el.dataset.refpath),
        }),
      });
      book = r.book;
      renderCast();
    });
  });
}

async function copyAssembled(text, slug) {
  try {
    await navigator.clipboard.writeText(text || "");
    showBanner(slug ? "copied " + slug : "copied prompt", "ok");
  } catch (e) {
    showBanner(e.message, "err");
  }
}

function slugOpt(slug) {
  const o = (book.slug_opts && book.slug_opts[slug]) || {};
  return {
    use_text: !!o.use_text,
    use_image: !!o.use_image,
    use_letter: !!o.use_letter,
  };
}

function collectSlugOpts() {
  const opts = Object.assign({}, book.slug_opts || {});
  document.querySelectorAll("#preview tr").forEach((tr) => {
    const slugEl = tr.querySelector("input[data-slug]");
    if (!slugEl) return;
    const slug = slugEl.dataset.slug;
    opts[slug] = {
      use_text: !!(tr.querySelector("input[data-use-text]") || {}).checked,
      use_image: !!(tr.querySelector("input[data-use-image]") || {}).checked,
      use_letter: !!(tr.querySelector("input[data-use-letter]") || {}).checked,
    };
  });
  return opts;
}

function parsePayload() {
  return {
    slug_opts: collectSlugOpts(),
    use_text_default: !!($("text-all") && $("text-all").checked),
    use_image_default: !!($("image-all") && $("image-all").checked),
    use_letter_default: !!($("letter-all") && $("letter-all").checked),
  };
}

function renderPreview(plates, warnings, checkedSlugs) {
  const tb = $("preview");
  tb.innerHTML = "";
  (plates || []).forEach((p) => {
    const tr = document.createElement("tr");
    const pane = p.pane ? `${p.pane}${p.pair_with ? " · " + p.pair_with : ""}` : "";
    const warn = [pane, p.risky_twoshot ? "two-shot" : "", (p.warnings || []).join("; ")]
      .filter(Boolean).join("; ");
    const on = !checkedSlugs || checkedSlugs.some((s) => s === p.slug);
    const assembled = p.assembled || "";
    const opt = {
      use_text: !!(p.use_text || slugOpt(p.slug).use_text),
      use_image: !!(p.use_image || slugOpt(p.slug).use_image),
      use_letter: !!(p.use_letter || slugOpt(p.slug).use_letter),
    };

    const tdCheck = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.slug = p.slug;
    if (on) cb.checked = true;
    tdCheck.appendChild(cb);

    const tdText = document.createElement("td");
    const cbText = document.createElement("input");
    cbText.type = "checkbox";
    cbText.dataset.useText = "1";
    cbText.checked = opt.use_text;
    tdText.appendChild(cbText);

    const tdImg = document.createElement("td");
    const cbImg = document.createElement("input");
    cbImg.type = "checkbox";
    cbImg.dataset.useImage = "1";
    cbImg.checked = opt.use_image;
    tdImg.appendChild(cbImg);

    const tdLetter = document.createElement("td");
    const cbLetter = document.createElement("input");
    cbLetter.type = "checkbox";
    cbLetter.dataset.useLetter = "1";
    cbLetter.checked = opt.use_letter;
    tdLetter.appendChild(cbLetter);

    const tdSlug = document.createElement("td");
    const code = document.createElement("code");
    code.textContent = p.slug;
    tdSlug.appendChild(code);

    const tdCast = document.createElement("td");
    tdCast.textContent = (p.character_ids || []).join(", ");

    const tdMeta = document.createElement("td");
    tdMeta.textContent = p.metaphor || "";

    const tdWarn = document.createElement("td");
    tdWarn.textContent = warn;
    if (p.risky_twoshot) tdWarn.className = "risky";

    const tdPrompt = document.createElement("td");
    tdPrompt.className = "preview" + (assembled ? " copy-prompt" : "");
    const snippet = document.createElement("span");
    snippet.textContent = assembled.slice(0, 180);
    tdPrompt.appendChild(snippet);
    if (assembled) {
      tdPrompt.title = "Click to copy the full assembled prompt";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "act ghost copy-assembled";
      btn.textContent = "Copy";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        copyAssembled(assembled, p.slug);
      });
      tdPrompt.appendChild(btn);
      tdPrompt.addEventListener("click", () => copyAssembled(assembled, p.slug));
    }

    tr.append(tdCheck, tdText, tdImg, tdLetter, tdSlug, tdCast, tdMeta, tdWarn, tdPrompt);
    tb.appendChild(tr);
  });
  if (!(plates || []).length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 9;
    td.className = "empty-row";
    td.innerHTML = "<strong>No plates parsed yet</strong>Write or paste the story wall above, then press <b>Parse</b>.";
    tr.appendChild(td);
    tb.appendChild(tr);
  }
  slugBoxes().forEach((el) => el.addEventListener("change", syncSlugAll));
  document.querySelectorAll("#preview input[data-use-text]").forEach((el) => {
    el.addEventListener("change", onSlugOptChange);
  });
  document.querySelectorAll("#preview input[data-use-image]").forEach((el) => {
    el.addEventListener("change", onSlugOptChange);
  });
  document.querySelectorAll("#preview input[data-use-letter]").forEach((el) => {
    el.addEventListener("change", onSlugOptChange);
  });
  syncSlugAll();
  syncColAll("text");
  syncColAll("image");
  syncColAll("letter");
  if (warnings && warnings.length) showBanner(warnings.join(" · "), "warn");
}

function slugBoxes() {
  return [...document.querySelectorAll("#preview input[data-slug]")];
}

function selectedSlugs() {
  return slugBoxes().filter((el) => el.checked).map((el) => el.dataset.slug);
}

function syncSlugAll() {
  const head = $("slug-all");
  if (!head) return;
  const boxes = slugBoxes();
  const n = boxes.filter((el) => el.checked).length;
  head.indeterminate = n > 0 && n < boxes.length;
  head.checked = boxes.length > 0 && n === boxes.length;
}

function setAllSlugs(on) {
  slugBoxes().forEach((el) => { el.checked = on; });
  syncSlugAll();
}

function colBoxes(kind) {
  const key = kind === "image" ? "data-use-image" : kind === "letter" ? "data-use-letter" : "data-use-text";
  return [...document.querySelectorAll(`#preview input[${key}]`)];
}

function syncColAll(kind) {
  const head = $(kind === "image" ? "image-all" : kind === "letter" ? "letter-all" : "text-all");
  if (!head) return;
  const boxes = colBoxes(kind);
  const n = boxes.filter((el) => el.checked).length;
  head.indeterminate = n > 0 && n < boxes.length;
  head.checked = boxes.length > 0 && n === boxes.length;
}

function setAllCol(kind, on) {
  colBoxes(kind).forEach((el) => { el.checked = on; });
  syncColAll(kind);
  onSlugOptChange();
}

async function onSlugOptChange() {
  book.slug_opts = collectSlugOpts();
  syncColAll("text");
  syncColAll("image");
  syncColAll("letter");
  try {
    await saveBookSilent();
    await saveSettingsSilent();
    const picked = selectedSlugs();
    const r = await j("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsePayload()),
    });
    book.plates = r.plates;
    renderPreview(r.plates, r.warnings, picked);
    if (r.notice) showBanner(r.notice, "warn");
  } catch (e) {
    showBanner(e.message, "err");
  }
}

async function saveBookSilent() {
  book.title = $("title").value;
  book.prompts_raw = $("prompts_raw").value;
  book.captions_raw = $("captions_raw").value;
  book.slug_opts = collectSlugOpts();
  if ($("ref_cutout_text")) book.ref_cutout_text = $("ref_cutout_text").value;
  const wf = $("book-workflow");
  if (wf) book.workflow = wf.value || null;
  const r = await j("/api/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(book),
  });
  book = r.book;
  showCurrentBook();
}

async function fillWorkflowSelect() {
  const sel = $("book-workflow");
  if (!sel) return;
  const r = await j("/api/workflows");
  const selected = book.workflow || r.selected || "";
  const items = r.workflows || [];
  sel.innerHTML = "";
  const def = document.createElement("option");
  def.value = "";
  def.textContent = "Default (Settings V3)";
  sel.appendChild(def);
  items.forEach((w) => {
    const o = document.createElement("option");
    o.value = w.path;
    const tag = w.source === "book" ? "this book" : w.source === "settings" ? "settings" : "shared";
    o.textContent = w.name + " (" + tag + ")";
    sel.appendChild(o);
  });
  const paths = items.map((w) => w.path);
  if (selected && paths.indexOf(selected) < 0) {
    const o = document.createElement("option");
    o.value = selected;
    o.textContent = selected;
    sel.appendChild(o);
  }
  sel.value = selected || "";
}

async function loadBook() {
  const r = await j("/api/book");
  book = r.book;
  $("title").value = book.title || "";
  $("prompts_raw").value = book.prompts_raw || "";
  $("captions_raw").value = book.captions_raw || "";
  if ($("ref_cutout_text")) $("ref_cutout_text").value = book.ref_cutout_text || settings.ref_cutout_text || "";
  await fillWorkflowSelect();
  renderCast();
  renderPreview(book.plates || [], []);
  if (r.notice) showBanner(r.notice, "warn");
}

let lightboxItems = [];
let lightboxIndex = -1;

function lightboxFrames() {
  return [...document.querySelectorAll("#thumbs img[data-full]")].map((el) => ({
    url: el.getAttribute("data-full") || el.src,
    name: el.getAttribute("data-full-name") || el.alt || "",
  }));
}

function showLightboxAt(index) {
  const box = $("lightbox");
  const img = $("lightbox-img");
  const cap = $("lightbox-cap");
  const pos = $("lightbox-pos");
  const prev = $("lightbox-prev");
  const next = $("lightbox-next");
  if (!box || !img || !lightboxItems.length) return;
  const last = lightboxItems.length - 1;
  if (index < 0) index = 0;
  if (index > last) index = last;
  lightboxIndex = index;
  const item = lightboxItems[index];
  img.src = item.url || "";
  img.alt = item.name || "";
  if (cap) cap.textContent = item.name || "";
  if (pos) pos.textContent = (index + 1) + " / " + lightboxItems.length;
  if (prev) prev.disabled = index <= 0;
  if (next) next.disabled = index >= last;
  box.classList.add("on");
  box.removeAttribute("hidden");
}

function openLightbox(url, name) {
  lightboxItems = lightboxFrames();
  let index = lightboxItems.findIndex((it) => it.url === url);
  if (index < 0) {
    lightboxItems = [{ url: url || "", name: name || "" }];
    index = 0;
  }
  showLightboxAt(index);
}

function stepLightbox(delta) {
  const box = $("lightbox");
  if (!box || !box.classList.contains("on") || lightboxIndex < 0) return;
  showLightboxAt(lightboxIndex + delta);
}

function closeLightbox() {
  const box = $("lightbox");
  const img = $("lightbox-img");
  if (!box) return;
  box.classList.remove("on");
  box.setAttribute("hidden", "");
  if (img) img.src = "";
  lightboxItems = [];
  lightboxIndex = -1;
}

function slugsInName(name) {
  const stem = String(name || "").replace(/\.[a-z0-9]+$/i, "");
  const re = /(?:^|_)((?:p|t)\d+_[A-Za-z0-9]+(?:_(?!p\d+_|t\d+_|\d+$)[A-Za-z0-9]+)*)/gi;
  return [...stem.matchAll(re)].map((m) => m[1]);
}

function slugFromName(name) {
  const found = slugsInName(name);
  if (found.length) return found[0];
  const stem = String(name || "").replace(/\.[a-z]+$/i, "");
  return stem.replace(/_\d+$/, "");
}

function thumbFigure(t, names) {
  const slug = t.slug || slugFromName(t.name);
  const seed = t.seed != null && t.seed !== "" ? String(t.seed) : "";
  const bid = t.book_id || "";
  const fig = document.createElement("figure");
  const opts = names.map((n) => `<option value="${n}">${n}</option>`).join("");
  const lockBtn = seed
    ? `<button type="button" class="act ghost" data-lock="${seed}" title="Lock seed ${seed} to the chosen character">Lock seed</button>`
    : "";
  const letteredMark = t.lettered ? " · lettered" : "";
  const letterBtn = t.lettered || t.published
    ? ""
    : `<button type="button" class="act ghost" data-letter="${slug}">Letter this</button>`;
  const pick = t.published
    ? ""
    : `<label class="pick"><input type="checkbox" data-publish-path="${t.path}" /> pick</label>`;
  fig.innerHTML = `
    <div class="thumb-media">
      ${pick}
      <img src="${t.url}" alt="${t.name}" data-full="${t.url}" data-full-name="${t.name || ""}" loading="lazy" />
    </div>
    <figcaption>${t.name || ""}${letteredMark}</figcaption>
    <div class="thumb-tools">
      <select data-char aria-label="Character for seed / ref">${opts}</select>
      ${t.published ? "" : lockBtn}
    </div>
    <div class="thumb-actions">
      ${t.published ? "" : `<button type="button" class="act ghost" data-reroll="${slug}">Reroll</button>`}
      <button type="button" class="act ghost" data-asref="${t.path}">Use as ref</button>
      ${letterBtn}
      ${t.published ? "" : `<button type="button" class="act danger" data-rmfile="${encodeURIComponent(t.path)}" data-bookid="${bid}">Delete</button>`}
    </div>
  `;
  return fig;
}

async function refreshRuns() {
  const r = await j("/api/runs");
  $("qstatus").textContent = `queue ${r.queue_depth} · ${r.comfy.ok ? "Comfy up" : r.comfy.message} · ${r.current || ""}`;
  setComfyStatus(r.comfy.ok, r.comfy.message);
  if (!r.comfy.ok) showBanner(r.comfy.message, "err");
  const fallbackNames = (book.characters || []).map((c) => c.name);
  const box = $("thumbs");
  box.innerHTML = "";
  const current = (r.books || []).find((b) => b.current)
    || (r.books || []).find((b) => b.id === r.current)
    || { id: r.current || "", title: "This book", thumbs: r.thumbs || [], names: fallbackNames, n: (r.thumbs || []).length };
  const names = current.names && current.names.length ? current.names : fallbackNames;
  const thumbs = current.thumbs || [];
  const batches = (current.batches && current.batches.length)
    ? current.batches
    : (thumbs.length ? [{ id: "all", label: "", thumbs, n: thumbs.length }] : []);
  const sec = document.createElement("section");
  sec.className = "book-block latest";
  const h = document.createElement("h3");
  const n = current.n != null ? current.n : thumbs.length;
  h.textContent = [current.id || r.current, current.title && current.title !== current.id ? current.title : "", n]
    .filter((x) => x !== "" && x != null)
    .join(" · ");
  sec.appendChild(h);
  if (!batches.length) {
    const p = document.createElement("p");
    p.className = "empty-state";
    p.innerHTML = "<strong>No plates in this book yet.</strong>Parse the wall on the Book page, then Generate. New plates appear here.";
    sec.appendChild(p);
  } else {
    batches.forEach((b, i) => {
      const block = document.createElement("section");
      block.className = "version-block" + (i === 0 ? " latest" : "");
      const vh = document.createElement("h4");
      const vn = b.n != null ? b.n : (b.thumbs || []).length;
      vh.textContent = [b.label, vn].filter((x) => x !== "" && x != null).join(" · ");
      const pickVer = document.createElement("label");
      pickVer.className = "pick tiny";
      pickVer.innerHTML = `<input type="checkbox" data-pick-version /> pick this version`;
      vh.appendChild(pickVer);
      block.appendChild(vh);
      const grid = document.createElement("div");
      grid.className = "thumbs";
      (b.thumbs || []).forEach((t) => grid.appendChild(thumbFigure(t, names)));
      block.appendChild(grid);
      sec.appendChild(block);
    });
  }
  (current.published || r.published || []).forEach((pub) => {
    const block = document.createElement("section");
    block.className = "version-block published";
    const vh = document.createElement("h4");
    vh.textContent = [pub.name, pub.n].filter((x) => x !== "" && x != null).join(" · ");
    if (pub.has_snapshot) {
      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "act ghost";
      loadBtn.dataset.loadPublished = pub.name;
      loadBtn.textContent = "Load published";
      vh.appendChild(loadBtn);
    } else {
      const miss = document.createElement("span");
      miss.className = "tiny";
      miss.textContent = " (no snapshot)";
      vh.appendChild(miss);
    }
    block.appendChild(vh);
    const grid = document.createElement("div");
    grid.className = "thumbs";
    (pub.thumbs || []).forEach((t) => grid.appendChild(thumbFigure(t, names)));
    block.appendChild(grid);
    sec.appendChild(block);
  });
  box.appendChild(sec);
  box.querySelectorAll("[data-load-published]").forEach((el) => {
    el.addEventListener("click", async () => {
      if (!confirm("Load “" + el.dataset.loadPublished + "”?\nInk, LoRAs, story, and captions go back to that publish. Plates stay in that folder.")) return;
      try {
        const r = await j("/api/publish/load", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: el.dataset.loadPublished }),
        });
        book = r.book;
        if (r.settings) fillSettings(r.settings);
        $("title").value = book.title || "";
        $("prompts_raw").value = book.prompts_raw || "";
        $("captions_raw").value = book.captions_raw || "";
        await fillWorkflowSelect();
        renderCast();
        setView("book");
        const parsed = await j("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug_opts: book.slug_opts || {},
            use_text_default: false,
            use_image_default: false,
            use_letter_default: false,
          }),
        });
        book.plates = parsed.plates;
        renderPreview(parsed.plates || [], parsed.warnings || []);
        const warn = (r.warnings || []).join(" · ");
        showBanner(
          warn
            ? ("loaded " + r.name + " · " + warn)
            : ("loaded " + r.name + " — Book wall restored. Plates stay in that published folder."),
          warn ? "warn" : "ok"
        );
      } catch (e) { showBanner(e.message, "err"); }
    });
  });
  box.querySelectorAll("[data-pick-version]").forEach((el) => {
    el.addEventListener("change", () => {
      const block = el.closest(".version-block");
      if (!block) return;
      block.querySelectorAll("[data-publish-path]").forEach((cb) => {
        cb.checked = el.checked;
      });
    });
  });
  box.querySelectorAll(".thumbs img[data-full]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.preventDefault();
      openLightbox(el.getAttribute("data-full") || el.src, el.getAttribute("data-full-name") || el.alt || "");
    });
  });
  box.querySelectorAll("[data-lock]").forEach((el) => {
    el.addEventListener("click", async () => {
      const sel = (el.closest("figure") || el.parentElement).querySelector("[data-char]");
      await j("/api/lock-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: sel.value, seed: Number(el.dataset.lock) }),
      });
      showBanner(`locked ${el.dataset.lock} to ${sel.value}`, "ok");
      loadBook();
    });
  });
  box.querySelectorAll("[data-reroll]").forEach((el) => {
    el.addEventListener("click", async () => {
      try {
        await saveBookSilent();
        const r = await j("/api/reroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: el.dataset.reroll }),
        });
        if (!r.ok) { showBanner(r.error || "reroll failed", "err"); return; }
        if (!r.queued) {
          showBanner(`nothing queued${r.notice ? " · " + r.notice : ""}`, "warn");
          return;
        }
        showBanner(`queued ${r.queued}${r.notice ? " · " + r.notice : ""}`, "ok");
        startPoll();
      } catch (e) { showBanner(e.message, "err"); }
    });
  });
  box.querySelectorAll("[data-asref]").forEach((el) => {
    el.addEventListener("click", async () => {
      const sel = (el.closest("figure") || el.parentElement).querySelector("[data-char]");
      await j("/api/use-as-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: sel.value, path: el.dataset.asref }),
      });
      showBanner(`ref → ${sel.value}`, "ok");
      loadBook();
    });
  });
  box.querySelectorAll("[data-letter]").forEach((el) => {
    el.addEventListener("click", async () => {
      const slug = el.dataset.letter;
      showBanner(`lettering ${slug}…`, "ok");
      try {
        await withBusy(el, "Lettering…", async () => {
          await saveBookSilent();
          const r = await j("/api/letter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug }),
          });
          showBanner(`lettered ${r.lettered}`, "ok");
          await refreshRuns();
        });
      } catch (e) { showBanner(e.message, "err"); }
    });
  });
  box.querySelectorAll("[data-rmfile]").forEach((el) => {
    el.addEventListener("click", async () => {
      if (!confirm("Delete this generated image? This cannot be undone.")) return;
      try {
        const r = await j("/api/plates/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirm: true,
            scope: "files",
            book_id: el.dataset.bookid || undefined,
            paths: [decodeURIComponent(el.dataset.rmfile)],
          }),
        });
        showBanner(`deleted ${r.deleted}`, "ok");
        refreshRuns();
      } catch (e) { showBanner(e.message, "err"); }
    });
  });
}

async function loadBooks() {
  const box = $("books");
  if (!box) return;
  const r = await j("/api/books");
  box.innerHTML = "";
  (r.books || []).forEach((b) => {
    const row = document.createElement("div");
    row.className = "book-row" + (b.current ? " current" : "");
    row.innerHTML = `
      <div class="book-meta">
        <span class="book-title">${b.title} ${b.current ? `<span class="badge accent">open</span>` : ""}</span>
        <span class="tiny">${b.id} · ${b.n_plates} plates</span>
      </div>
      <div class="book-actions">
        ${b.current ? "" : `<button type="button" class="act ghost small" data-openbook="${b.id}">Open</button>`}
        ${b.protected || b.id === "default" ? `<span class="badge">demo</span>` : `<button type="button" class="act danger small" data-delbook="${b.id}">Delete book</button>`}
      </div>
    `;
    box.appendChild(row);
  });
  box.querySelectorAll("[data-openbook]").forEach((el) => {
    el.addEventListener("click", async () => {
      const r = await j("/api/book/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: el.dataset.openbook }),
      });
      book = r.book;
      $("title").value = book.title || "";
      $("prompts_raw").value = book.prompts_raw || "";
      $("captions_raw").value = book.captions_raw || "";
      fillSettings(await j("/api/settings"));
      await fillWorkflowSelect();
      renderCast();
      renderPreview(book.plates || [], []);
      showBanner("opened " + el.dataset.openbook, "ok");
      loadBooks();
    });
  });
  box.querySelectorAll("[data-delbook]").forEach((el) => {
    el.addEventListener("click", async () => {
      if (!confirm("Delete book “" + el.dataset.delbook + "”?\nThis removes the folder: plates, lettered files, stills, and story.\nThis cannot be undone.")) return;
      try {
        const r = await j("/api/book/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true, id: el.dataset.delbook }),
        });
        book = r.book;
        $("title").value = book.title || "";
        $("prompts_raw").value = book.prompts_raw || "";
        $("captions_raw").value = book.captions_raw || "";
        fillSettings(await j("/api/settings"));
        await fillWorkflowSelect();
        renderCast();
        renderPreview(book.plates || [], []);
        showBanner("book deleted", "ok");
        loadBooks();
      } catch (e) { showBanner(e.message, "err"); }
    });
  });
}

function startPoll() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    const r = await j("/api/runs");
    if (document.getElementById("view-queue").classList.contains("on")) refreshRuns();
    $("qstatus").textContent = `queue ${r.queue_depth}`;
    if (r.queue_depth === 0) {
      clearInterval(pollTimer);
      pollTimer = null;
      if (document.getElementById("view-queue").classList.contains("on")) refreshRuns();
    }
  }, 2000);
}

async function generate(mode) {
  const btn = mode === "sel" ? $("gen-sel") : mode === "all" ? $("gen-all") : $("gen-missing");
  try {
    await saveBookSilent();
    await saveSettingsSilent();
    const preserveSel = slugBoxes().length > 0;
    const picked = selectedSlugs();
    const parsed = await j("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsePayload()),
    });
    renderPreview(parsed.plates || [], parsed.warnings || [], preserveSel ? picked : undefined);
    book.plates = parsed.plates;
    const body = {
      skip_done: $("skip_done").checked,
      ...parsePayload(),
    };
    if (mode === "all") body.skip_done = false;
    if (mode === "sel") {
      body.slugs = selectedSlugs();
      if (layoutValue() === "split" && body.slugs.length === 1) {
        const plates = parsed.plates || [];
        const i = plates.findIndex((p) => p.slug === body.slugs[0]);
        if (i >= 0 && plates[i + 1]) body.slugs.push(plates[i + 1].slug);
      }
      body.skip_done = false;
      if (!body.slugs.length) {
        showBanner("no plates selected after Parse — check the rows (slug renamed?)", "err");
        return;
      }
    }
    await withBusy(btn, "Queuing…", async () => {
      const r = await j("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { showBanner(r.error || "generate failed", "err"); return; }
      if (!r.queued) {
        showBanner(
          `nothing queued (skipped ${r.skipped})${r.notice ? " · " + r.notice : ""}`,
          "warn"
        );
        return;
      }
      showBanner(`queued ${r.queued} (skipped ${r.skipped})${r.notice ? " · " + r.notice : ""}`, "ok");
      startPoll();
      setView("queue");
    });
  } catch (e) {
    showBanner(e.message, "err");
  }
}

["style", "layout_text", "tail"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener("input", () => {
    markActiveExample();
    updateAssemblePreview();
  });
});
if ($("ref_cutout_text")) {
  $("ref_cutout_text").addEventListener("change", () => {
    book.ref_cutout_text = $("ref_cutout_text").value;
    saveBookSilent().catch((e) => showBanner(e.message, "err"));
  });
}
if ($("unet_name")) {
  $("unet_name").addEventListener("input", updateUnetWarn);
  $("unet_name").addEventListener("change", updateUnetWarn);
}
if ($("add-lora")) {
  $("add-lora").onclick = () => {
    const box = $("lora-stack");
    const rows = box ? [...box.querySelectorAll(".lora-row")] : [];
    if (rows.length >= LORA_SLOTS) return;
    const cur = rows.map((row) => ({
      name: String((row.querySelector(".lora-name") || {}).value || "").trim(),
      strength: Number((row.querySelector(".lora-strength") || {}).value) || 0.8,
    }));
    cur.push({ name: "", strength: 0.8 });
    renderLoras(cur);
  };
}
if ($("scan-weights")) {
  $("scan-weights").onclick = async () => {
    try {
      const r = await j("/api/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: ($("host") && $("host").value) || "",
          port: ($("port") && $("port").value) || "",
          models_dir: ($("models_dir") && $("models_dir").value) || "",
          loras_dir: ($("loras_dir") && $("loras_dir").value) || "",
        }),
      });
      weightLists.models = r.models || [];
      weightLists.loras = r.loras || [];
      if ($("unet_name")) {
        $("unet_name").value = resolveCombo($("unet_name").value, weightLists.models);
      }
      document.querySelectorAll(".lora-name").forEach((el) => {
        el.value = resolveCombo(el.value, weightLists.loras);
      });
      fillDatalist("unet-list", weightLists.models, $("unet_name") && $("unet_name").value);
      fillDatalist("lora-list", weightLists.loras);
      updateUnetWarn();
      const bits = [];
      if (r.source === "comfy") bits.push("from Comfy");
      if (weightLists.models.length) bits.push(weightLists.models.length + " UNETs");
      if (weightLists.loras.length) bits.push(weightLists.loras.length + " LoRAs");
      const err = (r.errors || []).join("; ");
      if (err && !bits.length) showBanner(err, "err");
      else showBanner((bits.join(", ") || "loaded") + (err ? " · " + err : ""), err && bits.length ? "warn" : "ok");
    } catch (e) {
      showBanner(e.message, "err");
    }
  };
}
$("save-settings").onclick = async () => {
  settings = await j("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(readSettings()),
  });
  fillSettings(settings);
  showBanner("settings saved on this book", "ok");
  loadBooks();
};
$("test-comfy").onclick = async () => {
  const r = await j("/api/comfy/test");
  setComfyStatus(r.ok, r.message);
  showBanner(r.message, r.ok ? "ok" : "err");
};
$("demo-cast").onclick = async () => {
  const r = await j("/api/demo/cast", { method: "POST" });
  book = r.book;
  renderCast();
};
$("add-char").onclick = async () => {
  try {
    const r = await j("/api/character/add", { method: "POST" });
    book = r.book;
    renderCast();
    showBanner("added " + (book.characters || []).slice(-1)[0]?.name, "ok");
  } catch (e) {
    showBanner(e.message, "err");
  }
};
$("save-book").onclick = async () => {
  await saveBookSilent();
  showBanner("book saved", "ok");
};
if ($("refresh-workflows")) {
  $("refresh-workflows").onclick = async () => {
    await fillWorkflowSelect();
    showBanner("workflow list refreshed", "ok");
  };
}
if ($("book-workflow")) {
  $("book-workflow").addEventListener("change", async () => {
    await saveBookSilent();
    showBanner(
      book.workflow ? "using " + book.workflow : "using Settings default workflow",
      "ok"
    );
  });
}
$("title").addEventListener("input", () => {
  book.title = $("title").value;
  showCurrentBook();
});
$("parse").onclick = async () => {
  await saveBookSilent();
  await saveSettingsSilent();
  const preserveSel = slugBoxes().length > 0;
  const picked = selectedSlugs();
  const r = await j("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsePayload()),
  });
  book.plates = r.plates;
  renderPreview(r.plates, r.warnings, preserveSel ? picked : undefined);
  if (r.notice) showBanner(r.notice, "warn");
  else if (!r.warnings.length) showBanner(`${r.plates.length} plates`, "ok");
};
$("demo-bos").onclick = async () => {
  const r = await j("/api/demo/bos", { method: "POST" });
  await loadBook();
  renderPreview(r.plates, r.warnings);
};
$("demo-t1").onclick = async () => {
  const r = await j("/api/demo/t1", { method: "POST" });
  await loadBook();
  renderPreview(r.plates, r.warnings);
};
$("copy-llm").onclick = async () => {
  const r = await j("/api/llm-sheet");
  await navigator.clipboard.writeText(r.text);
  showBanner("LLM sheet copied", "ok");
};
$("gen-missing").onclick = () => generate("missing");
$("gen-all").onclick = () => generate("all");
$("gen-sel").onclick = () => generate("sel");
$("slug-all").addEventListener("change", () => setAllSlugs($("slug-all").checked));
$("text-all").addEventListener("change", () => setAllCol("text", $("text-all").checked));
$("image-all").addEventListener("change", () => setAllCol("image", $("image-all").checked));
if ($("letter-all")) {
  $("letter-all").addEventListener("change", () => setAllCol("letter", $("letter-all").checked));
}
if ($("letter-all-btn")) {
  $("letter-all-btn").onclick = async () => {
    showBanner("lettering all…", "ok");
    try {
      await withBusy($("letter-all-btn"), "Lettering…", async () => {
        await saveBookSilent();
        const r = await j("/api/letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        showBanner(`lettered ${r.lettered}, skipped ${r.skipped}`, "ok");
        await refreshRuns();
      });
    } catch (e) { showBanner(e.message, "err"); }
  };
}
$("export").onclick = async () => {
  const r = await j("/api/export", { method: "POST" });
  showBanner(`export ${r.dir}`, "ok");
};
$("open-folder").onclick = async () => {
  const r = await j("/api/open-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ which: "book" }),
  });
  showBanner(r.dir, r.ok ? "ok" : "err");
};
$("publish").onclick = async () => {
  const paths = [...document.querySelectorAll("#thumbs [data-publish-path]:checked")].map(
    (el) => el.getAttribute("data-publish-path")
  ).filter(Boolean);
  if (!paths.length) {
    showBanner("pick plates to publish", "warn");
    return;
  }
  if (!confirm(`Publish ${paths.length} selected file(s) into a new 01_BookName_Published folder?\nThey leave Queue. Delete all plates will not touch that folder.`)) return;
  try {
    const r = await j("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    });
    showBanner(`published ${r.n} → ${r.name}`, "ok");
    refreshRuns();
  } catch (e) { showBanner(e.message, "err"); }
};
$("del-earlier").onclick = async () => {
  if (!confirm("Delete earlier versions and keep only the latest generate?\nThis cannot be undone.")) return;
  try {
    const r = await j("/api/plates/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true, scope: "earlier" }),
    });
    showBanner(`deleted ${r.deleted}`, "ok");
    refreshRuns();
  } catch (e) { showBanner(e.message, "err"); }
};
$("del-all-plates").onclick = async () => {
  if (!confirm("Delete ALL generated plates in this book?\nStory text and character stills stay. Images go.\nThis cannot be undone.")) return;
  try {
    const r = await j("/api/plates/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true, scope: "all" }),
    });
    showBanner(`deleted ${r.deleted}`, "ok");
    refreshRuns();
  } catch (e) { showBanner(e.message, "err"); }
};
async function startNewBook() {
  const title = prompt("New book title?", "Untitled");
  if (title == null || !title.trim()) return;
  try {
    const r = await j("/api/book/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    book = r.book;
    $("title").value = book.title || "";
    $("prompts_raw").value = "";
    $("captions_raw").value = "";
    fillSettings(await j("/api/settings"));
    await fillWorkflowSelect();
    renderCast();
    renderPreview([], []);
    showBanner("new book " + ((r.book && r.book.id) || ""), "ok");
    loadBooks();
    setView("book");
  } catch (e) { showBanner(e.message, "err"); }
}
document.querySelectorAll(".js-new-book").forEach((el) => {
  el.onclick = startNewBook;
});
if ($("lightbox")) {
  $("lightbox").addEventListener("click", (ev) => {
    if (ev.target && ev.target.id === "lightbox") closeLightbox();
  });
}
if ($("lightbox-close")) {
  $("lightbox-close").addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeLightbox();
  });
}
if ($("lightbox-prev")) {
  $("lightbox-prev").addEventListener("click", (ev) => {
    ev.stopPropagation();
    stepLightbox(-1);
  });
}
if ($("lightbox-next")) {
  $("lightbox-next").addEventListener("click", (ev) => {
    ev.stopPropagation();
    stepLightbox(1);
  });
}
document.addEventListener("keydown", (ev) => {
  const open = $("lightbox") && $("lightbox").classList.contains("on");
  if (ev.key === "Escape") {
    if (open) closeLightbox();
    return;
  }
  if (!open) return;
  const tag = ev.target && ev.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (ev.key === "ArrowLeft") {
    ev.preventDefault();
    stepLightbox(-1);
  } else if (ev.key === "ArrowRight") {
    ev.preventDefault();
    stepLightbox(1);
  }
});
if ($("copy-plate-template")) {
  $("copy-plate-template").onclick = async () => {
    const pre = $("plate-template");
    const text = pre ? pre.textContent : "";
    try {
      await navigator.clipboard.writeText(text);
      showBanner("plate template copied", "ok");
    } catch (e) {
      showBanner(e.message, "err");
    }
  };
}

(async function init() {
  try {
    await loadBook();
    fillSettings(await j("/api/settings"));
    await loadBooks();
    const ping = await j("/api/comfy/test");
    setComfyStatus(ping.ok, ping.message);
    showBanner(ping.message, ping.ok ? "ok" : "err");
  } catch (e) {
    showBanner(e.message, "err");
  }
})();

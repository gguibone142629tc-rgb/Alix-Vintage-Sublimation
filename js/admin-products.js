(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);

    const productForm = qs("#productForm");
    const productIdInput = qs("#productId");
    const productNameInput = qs("#productName");
    const productCategoryInput = qs("#productCategory");
    const productCollectionInput = qs("#productCollection");
    const productPriceInput = qs("#productPrice");
    const imageInputs = {
        front: qs("#productImageFront"),
        back: qs("#productImageBack"),
        lower: qs("#productImageLower"),
        full: qs("#productImageFull"),
    };
    const imageDataInputs = {
        front: qs("#productImageFrontDataUrl"),
        back: qs("#productImageBackDataUrl"),
        lower: qs("#productImageLowerDataUrl"),
        full: qs("#productImageFullDataUrl"),
    };
    const imagePreview = qs("#imagePreview");
    const resetButton = qs("#resetProductBtn");
    const searchInput = qs("#productSearch");

    const tbody = qs("#productsTbody");

    const CATEGORY_PRESETS = [
        { value: "jersey", label: "Jersey" },
        { value: "shirt", label: "Shirt" },
        { value: "hoodie", label: "Hoodie" },
        { value: "shorts", label: "Shorts" },
        { value: "other", label: "Other" },
    ];

    const normalizeCategoryKey = (value) => String(value || "").trim().toLowerCase();

    const syncCategoryOptions = (preferValue = null) => {
        if (!productCategoryInput) return;

        const current = preferValue != null ? String(preferValue) : String(productCategoryInput.value || "");
        const seen = new Set();

        const options = [];
        options.push({ value: "", label: "Select category", disabled: true });

        CATEGORY_PRESETS.forEach((p) => {
            const key = normalizeCategoryKey(p.value);
            if (!key || seen.has(key)) return;
            seen.add(key);
            options.push({ value: p.value, label: p.label });
        });

        const extras = new Map();
        productsCache.forEach((prod) => {
            const raw = String(prod?.category || "").trim();
            const key = normalizeCategoryKey(raw);
            if (!key || seen.has(key)) return;
            if (!extras.has(key)) extras.set(key, raw);
        });

        Array.from(extras.entries())
            .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
            .forEach(([key, raw]) => {
                seen.add(key);
                options.push({ value: raw, label: raw });
            });

        const currentKey = normalizeCategoryKey(current);
        if (currentKey && !seen.has(currentKey)) {
            options.push({ value: current, label: current });
        }

        productCategoryInput.innerHTML = options
            .map((opt) => {
                const attrs = [
                    `value="${escapeAttr(opt.value)}"`,
                    opt.disabled ? "disabled" : "",
                    current && opt.value === current ? "selected" : "",
                ]
                    .filter(Boolean)
                    .join(" ");
                return `<option ${attrs}>${escapeHtml(opt.label)}</option>`;
            })
            .join("");

        if (current && Array.from(productCategoryInput.options).some((o) => o.value === current)) {
            productCategoryInput.value = current;
        }
    };

    const formatDateTime = (iso) => {
        if (!iso) return "-";
        const dt = new Date(iso);
        if (Number.isNaN(dt.getTime())) return "-";
        return dt.toLocaleString("en-PH", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    };

    const formatMoney = (value) => `\u20B1${Number(value || 0).toLocaleString("en-PH")}`;

    const getApiBaseUrl = () => {
        if (window.AlixAuth && typeof window.AlixAuth.apiBaseUrl === "function") {
            return window.AlixAuth.apiBaseUrl();
        }

        const origin = window.location && window.location.origin ? window.location.origin : "";
        if (origin && origin !== "null") return origin;
        return "";
    };

    const getAdminToken = () => {
        if (window.AlixAdminAuth && typeof window.AlixAdminAuth.getToken === "function") {
            return window.AlixAdminAuth.getToken();
        }
        const token = sessionStorage.getItem("alix_admin_auth_token");
        return token && String(token).trim() ? String(token).trim() : null;
    };

    const resolveImageUrl = (imagePath) => {
        const raw = String(imagePath || "").trim();
        if (!raw) return null;
        if (/^https?:\/\//i.test(raw)) return raw;
        const base = getApiBaseUrl().replace(/\/$/, "");
        if (raw.startsWith("/")) return `${base}${raw}`;
        return `${base}/${raw}`;
    };

    const normalizeProduct = (row) => {
        const productId = row?.product_id ?? row?.id ?? null;
        const imagePath = row?.image_path ?? row?.imagePath ?? null;
        const imagesRaw = Array.isArray(row?.images) ? row.images : [];
        const images = imagesRaw
            .map((img) => ({
                view: String(img?.view_type || "").trim().toLowerCase(),
                path: String(img?.image_path || "").trim(),
            }))
            .filter((img) => img.view && img.path)
            .map((img) => ({ ...img, url: resolveImageUrl(img.path) }));

        const imageByView = {};
        images.forEach((img) => {
            imageByView[img.view] = img;
        });

        return {
            id: productId != null ? String(productId) : "",
            name: String(row?.product_name ?? row?.name ?? "").trim(),
            category: String(row?.apparel_type ?? row?.category ?? "").trim(),
            collection: String(row?.collection ?? "").trim(),
            price: Number(row?.base_price ?? row?.price ?? 0),
            imagePath: imagePath ? String(imagePath) : null,
            imageUrl: resolveImageUrl(imagePath),
            images,
            imageByView,
            updatedAt: row?.created_at ?? row?.updated_at ?? null,
        };
    };

    const renderImagePreview = (product) => {
        if (!imagePreview) return;
        imagePreview.innerHTML = "";

        const views = ["front", "back", "lower", "full"];
        const existing = product && typeof product === "object" ? product.imageByView || {} : {};

        const cards = [];
        views.forEach((view) => {
            const fromDraft = imageDataInputs[view]?.value ? String(imageDataInputs[view].value) : "";
            const fromExisting = existing[view]?.url ? String(existing[view].url) : "";
            const src = fromDraft || fromExisting;
            if (!src) return;

            cards.push(`
                <div style="display:grid;gap:6px;min-width:120px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#7a7670;">${escapeHtml(view)}</div>
                    <img src="${escapeAttr(src)}" alt="${escapeAttr(view)} preview" loading="lazy" style="width:100%;max-height:120px;object-fit:contain;border-radius:8px;border:1px solid #dad6cf;background:#fff;" />
                </div>
            `);
        });

        if (cards.length === 0) {
            imagePreview.innerHTML = '<div style="font-size:12px;color:#8a867f;">No preview yet.</div>';
            return;
        }

        imagePreview.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;">${cards.join("")}</div>`;
    };

    const setForm = (product) => {
        productIdInput.value = product?.id || "";
        productNameInput.value = product?.name || "";
        syncCategoryOptions(product?.category || "");
        productCategoryInput.value = product?.category || "";
        if (productCollectionInput) {
            productCollectionInput.value = String(product?.collection || "");
        }
        productPriceInput.value = String(product?.price ?? "");
        Object.values(imageDataInputs).forEach((el) => {
            if (el) el.value = "";
        });
        Object.values(imageInputs).forEach((el) => {
            if (el) el.value = "";
        });
        renderImagePreview(product || null);
    };

    const resetForm = () => setForm(null);

    const readFileAsDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const fetchJson = async (path, { method = "GET", body = null, admin = false } = {}) => {
        const headers = { Accept: "application/json" };
        if (body !== null) {
            headers["Content-Type"] = "application/json";
        }

        if (admin) {
            const token = getAdminToken();
            if (token) headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(getApiBaseUrl() + path, {
            method,
            headers,
            body: body !== null ? JSON.stringify(body) : undefined,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = typeof data.error === "string" ? data.error : "Request failed";
            const err = new Error(msg);
            err.status = res.status;
            err.data = data;
            throw err;
        }

        return data;
    };

    let productsCache = [];

    const loadProducts = async () => {
        const data = await fetchJson("/api/products", { method: "GET" });
        const rows = Array.isArray(data?.products) ? data.products : [];
        productsCache = rows.map(normalizeProduct);
        syncCategoryOptions();
    };

    const getFilteredProducts = () => {
        const products = productsCache;
        const q = String(searchInput?.value || "").trim().toLowerCase();
        if (!q) return products;
        return products.filter((p) =>
            [p.name, p.category, p.collection, p.id].some((v) => String(v || "").toLowerCase().includes(q))
        );
    };

    const renderTable = () => {
        const products = getFilteredProducts();
        if (!tbody) return;

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">No products yet.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = products
            .map(
                (p) => `
                <tr>
                    <td>${escapeHtml(p.name || "-")}</td>
                    <td>${escapeHtml(p.category || "-")}</td>
                    <td><strong>${formatMoney(p.price)}</strong></td>
                    <td>${escapeHtml(formatDateTime(p.updatedAt))}</td>
                    <td>
                        <button class="table-btn" type="button" data-action="edit" data-id="${escapeAttr(p.id)}">Edit</button>
                        <button class="table-btn" type="button" data-action="delete" data-id="${escapeAttr(p.id)}">Delete</button>
                    </td>
                </tr>
            `
            )
            .join("");
    };

    const escapeHtml = (s) =>
        String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const escapeAttr = (s) => escapeHtml(s);

    const getCurrentEditingProduct = () => {
        const id = String(productIdInput.value || "").trim();
        if (!id) return null;
        return productsCache.find((p) => String(p.id) === id) || null;
    };

    ["front", "back", "lower", "full"].forEach((view) => {
        imageInputs[view]?.addEventListener("change", async () => {
            const file = imageInputs[view].files?.[0];
            if (!file) return;
            const dataUrl = await readFileAsDataUrl(file);
            if (imageDataInputs[view]) {
                imageDataInputs[view].value = dataUrl;
            }
            renderImagePreview(getCurrentEditingProduct());
        });
    });

    searchInput?.addEventListener("input", () => {
        renderTable();
    });

    resetButton?.addEventListener("click", () => {
        resetForm();
    });

    const showError = async (message) => {
        if (window.AVDialog?.alert) {
            await window.AVDialog.alert(message, { title: "Error", tone: "danger" });
            return;
        }
        window.alert(message);
    };

    productForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            product_name: productNameInput.value,
            apparel_type: productCategoryInput.value,
            collection: String(productCollectionInput?.value || "").trim(),
            base_price: Number(productPriceInput.value || 0),
            image_map: {
                front: imageDataInputs.front?.value || "",
                back: imageDataInputs.back?.value || "",
                lower: imageDataInputs.lower?.value || "",
                full: imageDataInputs.full?.value || "",
            },
        };

        const editingId = String(productIdInput.value || "").trim();

        try {
            if (editingId) {
                payload.product_id = Number(editingId);
                await fetchJson("/api/admin/products", { method: "PATCH", body: payload, admin: true });
            } else {
                await fetchJson("/api/admin/products", { method: "POST", body: payload, admin: true });
            }

            await loadProducts();
            resetForm();
            renderTable();
        } catch (error) {
            await showError(error instanceof Error ? error.message : "Failed to save product");
        }
    });

    tbody?.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute("data-action");
        const id = target.getAttribute("data-id");
        if (!action || !id) return;

        if (action === "edit") {
            const products = productsCache;
            const product = products.find((p) => String(p.id) === String(id));
            setForm(product || null);
            return;
        }

        if (action === "delete") {
            const run = async () => {
                const ok = window.AVDialog?.confirm
                    ? await window.AVDialog.confirm("Delete this product?", {
                          title: "Confirm",
                          tone: "danger",
                          okText: "Delete",
                          cancelText: "Cancel",
                      })
                    : window.confirm("Delete this product?");
                if (!ok) return;

                try {
                    await fetchJson("/api/admin/products", {
                        method: "DELETE",
                        body: { product_id: Number(id) },
                        admin: true,
                    });
                    if (productIdInput.value === id) resetForm();
                    await loadProducts();
                    renderTable();
                } catch (error) {
                    await showError(error instanceof Error ? error.message : "Failed to delete product");
                }
            };

            run();
        }
    });

    // Page init
    const init = async () => {
        // Remove legacy local-only products to avoid mixed DB/local displays from older builds.
        localStorage.removeItem("alix_products");

        resetForm();
        try {
            await loadProducts();
        } catch (error) {
            await showError(error instanceof Error ? error.message : "Failed to load products");
            productsCache = [];
            syncCategoryOptions();
        }
        renderTable();
    };

    init();
})();


(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);

    const grid = qs("#adminCatalogGrid");
    if (!grid) return;

    const getApiBaseUrl = () => {
        if (window.AlixAuth && typeof window.AlixAuth.apiBaseUrl === "function") {
            return window.AlixAuth.apiBaseUrl();
        }

        const origin = window.location && window.location.origin ? window.location.origin : "";
        if (origin && origin !== "null") return origin;
        return "http://localhost:8000";
    };

    const resolveImageUrl = (path) => {
        const raw = String(path || "").trim();
        if (!raw) return null;
        if (/^https?:\/\//i.test(raw)) return raw;
        const base = getApiBaseUrl().replace(/\/$/, "");
        return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
    };

    const escapeHtml = (value) =>
        String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const formatMoney = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`;

    const pickCardImageUrl = (product) => {
        const images = Array.isArray(product?.images) ? product.images : [];
        const imageByView = new Map(
            images.map((img) => [String(img?.view_type || "").toLowerCase().trim(), String(img?.image_path || "").trim()])
        );

        for (const view of ["full", "front", "back", "lower"]) {
            const path = imageByView.get(view);
            if (path) return resolveImageUrl(path);
        }

        return resolveImageUrl(product?.image_path || null);
    };

    const renderEmpty = (text) => {
        grid.innerHTML = `<div class="admin-catalog-empty">${escapeHtml(text)}</div>`;
    };

    const renderProducts = (products) => {
        const list = Array.isArray(products) ? products : [];
        if (list.length === 0) {
            renderEmpty("No products available yet.");
            return;
        }

        grid.innerHTML = list
            .map((p) => {
                const name = String(p?.product_name || "").trim() || "Unnamed product";
                const type = String(p?.apparel_type || "").trim() || "-";
                const price = p?.base_price;
                const img = pickCardImageUrl(p);

                const imgHtml = img
                    ? `<img class="admin-catalog-thumb" src="${img}" alt="${escapeHtml(name)}" loading="lazy" />`
                    : `<div class="admin-catalog-thumb admin-catalog-thumb--empty">No image</div>`;

                return `
                    <article class="admin-catalog-card" aria-label="${escapeHtml(name)}">
                        <div class="admin-catalog-media">${imgHtml}</div>
                        <div class="admin-catalog-body">
                            <div class="admin-catalog-name">${escapeHtml(name)}</div>
                            <div class="admin-catalog-meta">
                                <span>${escapeHtml(type)}</span>
                                <span>${escapeHtml(formatMoney(price))}</span>
                            </div>
                        </div>
                    </article>
                `;
            })
            .join("");
    };

    const load = async () => {
        try {
            const res = await fetch(getApiBaseUrl() + "/api/products", {
                method: "GET",
                headers: { Accept: "application/json" },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                renderEmpty(typeof data?.error === "string" ? data.error : "Failed to load products.");
                return;
            }

            renderProducts(data?.products);
        } catch {
            renderEmpty("Network error while loading products.");
        }
    };

    load();
})();

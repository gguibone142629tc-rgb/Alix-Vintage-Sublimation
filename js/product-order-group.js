(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);

    const imageWrap = qs("#detailImageWrap");
    const viewSwitcher = qs("#detailViewSwitcher");
    const nameEl = qs("#detailProductName");
    const priceEl = qs("#detailProductPrice");
    const individualLink = qs("#individualOrderLink");

    const getApiBaseUrl = () => {
        if (window.AlixAuth && typeof window.AlixAuth.apiBaseUrl === "function") {
            return window.AlixAuth.apiBaseUrl();
        }

        const origin = window.location && window.location.origin ? window.location.origin : "";
        if (origin && origin !== "null") return origin;
        return "";
    };

    const resolveImageUrl = (path) => {
        const raw = String(path || "").trim();
        if (!raw) return null;
        if (/^https?:\/\//i.test(raw)) return raw;
        const base = getApiBaseUrl().replace(/\/$/, "");
        return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
    };

    const formatMoney = (value) => `\u20B1${Number(value || 0).toLocaleString("en-PH")}`;

    const escapeHtml = (value) =>
        String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const getProductIdFromQuery = () => {
        const params = new URLSearchParams(window.location.search);
        const raw = params.get("product_id");
        const id = Number(raw || 0);
        return Number.isFinite(id) && id > 0 ? id : 0;
    };

    const normalizeProduct = (p) => ({
        id: Number(p?.product_id || 0),
        name: String(p?.product_name || "").trim(),
        price: Number(p?.base_price || 0),
        imagePath: p?.image_path || null,
        images: Array.isArray(p?.images) ? p.images : [],
    });

    const buildViewMap = (product) => {
        const map = new Map();
        const images = Array.isArray(product?.images) ? product.images : [];

        images.forEach((img) => {
            const view = String(img?.view_type || "").trim().toLowerCase();
            const path = String(img?.image_path || "").trim();
            const url = resolveImageUrl(path);
            if (view && url) {
                map.set(view, url);
            }
        });

        if (!map.size) {
            const fallback = resolveImageUrl(product?.imagePath || null);
            if (fallback) {
                map.set("full", fallback);
            }
        }

        return map;
    };

    const renderMainImage = (src, alt) => {
        if (!imageWrap) return;
        if (!src) {
            imageWrap.innerHTML = "";
            return;
        }

        imageWrap.innerHTML = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
    };

    const renderViewButtons = (viewMap, productName) => {
        if (!viewSwitcher) return;

        const orderedViews = ["full", "front", "back", "lower"];
        const available = orderedViews.filter((view) => viewMap.has(view));

        if (available.length === 0) {
            viewSwitcher.innerHTML = "";
            return;
        }

        const first = available[0];
        renderMainImage(viewMap.get(first), `${productName} ${first}`);

        viewSwitcher.innerHTML = available
            .map(
                (view, idx) =>
                    `<button type="button" class="view-btn ${idx === 0 ? "active" : ""}" data-view="${escapeHtml(view)}">${escapeHtml(view)}</button>`
            )
            .join("");

        viewSwitcher.querySelectorAll(".view-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const view = String(btn.getAttribute("data-view") || "");
                const src = viewMap.get(view);
                if (!src) return;

                viewSwitcher.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                renderMainImage(src, `${productName} ${view}`);
            });
        });
    };

    const setIndividualLink = (productId) => {
        if (!individualLink) return;
        if (productId > 0) {
            individualLink.href = `product-order-individual.html?product_id=${encodeURIComponent(String(productId))}`;
        }
    };

    const fetchProducts = async () => {
        const res = await fetch(getApiBaseUrl() + "/api/products", {
            method: "GET",
            headers: { Accept: "application/json" },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(typeof data.error === "string" ? data.error : "Failed to load product");
        }

        const rows = Array.isArray(data?.products) ? data.products : [];
        return rows.map(normalizeProduct);
    };

    const init = async () => {
        try {
            const products = await fetchProducts();
            if (!products.length) return;

            const requestedId = getProductIdFromQuery();
            const product = products.find((p) => p.id === requestedId) || products[0];
            if (!product) return;

            if (nameEl) nameEl.textContent = product.name || "Product";
            if (priceEl) priceEl.textContent = formatMoney(product.price);

            setIndividualLink(product.id);

            const viewMap = buildViewMap(product);
            renderViewButtons(viewMap, product.name || "Product");
        } catch {
            // Keep static fallback UI if API is unavailable.
        }
    };

    init();
})();


(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);

    const grid = qs("#catalogGrid");
    const showSelect = qs("#catalogShow");
    const sortSelect = qs("#catalogSort");
    const shirtTypeSelect = qs("#shirt-type");
    const checkRows = Array.from(document.querySelectorAll(".filter-box .check"));
    const mobileFilterTrigger = qs("#mobileFilterTrigger");
    const mobileSortTrigger = qs("#mobileSortTrigger");
    const mobileFilterSheet = qs("#mobileFilterSheet");
    const mobileSortSheet = qs("#mobileSortSheet");
    const mobileFilterApply = qs("#mobileFilterApply");
    const mobileSortApply = qs("#mobileSortApply");
    const mobileSortLabel = qs("#mobileSortLabel");
    const mobileTypeChecks = Array.from(document.querySelectorAll(".mobile-type-check"));
    const mobileSortRadios = Array.from(document.querySelectorAll("input[name='mobile-sort']"));
    const desktopCollectionButtons = Array.from(document.querySelectorAll(".collection-list .collection-link[data-collection]"));
    const mobileCollectionButtons = Array.from(document.querySelectorAll(".sheet-collections .collection-link[data-collection]"));

    const allowedCollections = new Set(["basketball", "volleyball", "football-soccer", "corporate-event"]);

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

    const escapeHtml = (value) =>
        String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const formatMoney = (value) => `\u20B1${Number(value || 0).toLocaleString("en-PH")}`;

    const normalizeTypeLabel = (value) => {
        const v = String(value || "").trim().toLowerCase();
        if (!v || v.includes("all type")) return "all";
        if (v.includes("polo")) return "poloshirt";
        if (v.includes("hoodie")) return "hoodie";
        if (v.includes("t-shirt") || v.includes("tshirt") || v.includes("tee")) return "tshirt";
        if (v.includes("jersey")) return "jersey";
        if (v.includes("short")) return "shorts";
        return "all";
    };

    const normalizeCollectionKey = (value) => {
        const v = String(value || "").trim().toLowerCase();
        if (!v) return null;

        const normalized = v.replaceAll("_", "-").replaceAll(" ", "-");

        const map = {
            "basketball-apparel": "basketball",
            basketball: "basketball",
            "volleyball-uniforms": "volleyball",
            volleyball: "volleyball",
            "football-and-soccer-kits": "football-soccer",
            "football-soccer-kits": "football-soccer",
            "football-soccer": "football-soccer",
            football: "football-soccer",
            soccer: "football-soccer",
            "corporate-and-event-wear": "corporate-event",
            "corporate-event-wear": "corporate-event",
            "corporate-event": "corporate-event",
            corporate: "corporate-event",
            event: "corporate-event",
        };

        const key = map[normalized] || normalized;
        return allowedCollections.has(key) ? key : null;
    };

    const inferProductTypeKeys = (product) => {
        const keys = new Set();
        const apparel = String(product?.apparelType || "").toLowerCase();
        const name = String(product?.name || "").toLowerCase();

        if (apparel === "jersey" || name.includes("jersey")) keys.add("jersey");
        if (name.includes("short")) keys.add("shorts");

        // Shirt products are split into polo vs tshirt by product naming.
        if (apparel === "shirt" || name.includes("shirt") || name.includes("t-shirt") || name.includes("tee") || name.includes("polo")) {
            if (name.includes("polo")) {
                keys.add("poloshirt");
            } else {
                keys.add("tshirt");
            }
        }

        if (apparel === "hoodie" || name.includes("hoodie")) {
            keys.add("hoodie");
        }

        // Fallback so products don't disappear unexpectedly.
        if (keys.size === 0) {
            if (apparel === "hoodie" || name.includes("hoodie")) {
                keys.add("hoodie");
            } else {
                keys.add("jersey");
            }
        }

        return keys;
    };

    const getCheckboxFilters = () => {
        const out = [];
        checkRows.forEach((row) => {
            const input = row.querySelector("input[type='checkbox']");
            if (!input || !input.checked) return;

            const labelText = String(row.textContent || "").trim();
            const key = normalizeTypeLabel(labelText);
            if (key !== "all") out.push(key);
        });
        return out;
    };

    const closeSheet = (sheet) => {
        if (!sheet) return;
        sheet.classList.add("is-hidden");
    };

    const openSheet = (sheet) => {
        if (!sheet) return;
        sheet.classList.remove("is-hidden");
    };

    const syncMobileSortLabel = () => {
        if (!mobileSortLabel || !sortSelect) return;
        mobileSortLabel.textContent = `Sort: ${String(sortSelect.value || "Price, Low to High")}`;
    };

    const syncMobileSortRadios = () => {
        const selected = String(sortSelect?.value || "Price, Low to High");
        mobileSortRadios.forEach((radio) => {
            radio.checked = String(radio.value) === selected;
        });
    };

    const syncMobileFilterChecks = () => {
        const active = new Set(getCheckboxFilters());
        mobileTypeChecks.forEach((check) => {
            const key = normalizeTypeLabel(check.value);
            check.checked = active.has(key);
        });
    };

    const setActiveClass = (button, active) => {
        if (!button) return;
        button.classList.toggle("is-active", Boolean(active));
    };

    let activeCollection = null;
    let pendingMobileCollection = null;

    const syncCollectionButtons = () => {
        desktopCollectionButtons.forEach((btn) => {
            const key = normalizeCollectionKey(btn.getAttribute("data-collection"));
            setActiveClass(btn, key && key === activeCollection);
        });

        const mobileKey = pendingMobileCollection != null ? pendingMobileCollection : activeCollection;
        mobileCollectionButtons.forEach((btn) => {
            const key = normalizeCollectionKey(btn.getAttribute("data-collection"));
            setActiveClass(btn, key && key === mobileKey);
        });
    };

    const writeCollectionToUrl = (key) => {
        try {
            const url = new URL(window.location.href);
            if (!key) {
                url.searchParams.delete("collection");
            } else {
                url.searchParams.set("collection", key);
            }

            window.history.replaceState({}, "", url.toString());
        } catch {
            // ignore
        }
    };

    const setCollectionFilter = (key, { updateUrl = true } = {}) => {
        activeCollection = normalizeCollectionKey(key);
        if (updateUrl) writeCollectionToUrl(activeCollection);
        syncCollectionButtons();
        render();
    };

    const matchesCollectionFilter = (product) => {
        if (!activeCollection) return true;
        const key = normalizeCollectionKey(product?.collection || "");
        return key === activeCollection;
    };

    const matchesTypeFilters = (product) => {
        const productTypes = inferProductTypeKeys(product);

        const selectedFromDropdown = normalizeTypeLabel(shirtTypeSelect?.value || "all");
        if (selectedFromDropdown !== "all" && !productTypes.has(selectedFromDropdown)) {
            return false;
        }

        const checkedFilters = getCheckboxFilters();
        if (checkedFilters.length > 0) {
            return checkedFilters.some((type) => productTypes.has(type));
        }

        return true;
    };

    const pickCardImage = (product) => {
        const images = Array.isArray(product?.images) ? product.images : [];
        const imageByView = new Map(
            images.map((img) => [String(img?.view_type || "").toLowerCase().trim(), String(img?.image_path || "").trim()])
        );

        // Prefer FULL jersey images in the catalog grid.
        const preferred = ["full", "front", "back", "lower"];
        for (const view of preferred) {
            const path = imageByView.get(view);
            if (path) return resolveImageUrl(path);
        }

        // Fallback to the mapped field name from fetchProducts() (`imagePath`).
        return resolveImageUrl(product?.imagePath || product?.image_path || null);
    };

    let allProducts = [];

    const fetchProducts = async () => {
        const res = await fetch(getApiBaseUrl() + "/api/products", {
            method: "GET",
            headers: { Accept: "application/json" },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(typeof data.error === "string" ? data.error : "Failed to load products");
        }

        const rows = Array.isArray(data?.products) ? data.products : [];
        allProducts = rows.map((p) => ({
            id: Number(p?.product_id || 0),
            name: String(p?.product_name || "").trim(),
            apparelType: String(p?.apparel_type || "").trim(),
            collection: normalizeCollectionKey(p?.collection) || null,
            basePrice: Number(p?.base_price || 0),
            imagePath: p?.image_path || null,
            images: Array.isArray(p?.images) ? p.images : [],
            createdAt: String(p?.created_at || ""),
        }));
    };

    const getVisibleProducts = () => {
        const showCount = Number(showSelect?.value || 8) || 8;
        const sort = String(sortSelect?.value || "Price, Low to High").toLowerCase();

        const list = allProducts.filter(matchesTypeFilters).filter(matchesCollectionFilter);

        if (sort.includes("high")) {
            list.sort((a, b) => b.basePrice - a.basePrice);
        } else if (sort.includes("new")) {
            list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        } else {
            list.sort((a, b) => a.basePrice - b.basePrice);
        }

        return list.slice(0, Math.max(1, showCount));
    };

    const render = () => {
        if (!grid) return;

        const products = getVisibleProducts();
        if (products.length === 0) {
            grid.innerHTML = '<div class="catalog-empty">No products available yet.</div>';
            return;
        }

        grid.innerHTML = products
            .map((p) => {
                const imageUrl = pickCardImage(p);
                const imageHtml = imageUrl
                    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(p.name)}" loading="lazy" />`
                    : "";

                return `
                    <div class="product-card">
                        <div class="product-image">${imageHtml}</div>
                        <div class="product-name">${escapeHtml(p.name || "Product")}</div>
                        <div class="product-price">${escapeHtml(formatMoney(p.basePrice))}</div>
                        <a class="order-btn" href="product-order-individual.html?product_id=${encodeURIComponent(String(p.id))}">Order Now</a>
                    </div>
                `;
            })
            .join("");

            syncMobileSortLabel();
    };

    const init = async () => {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = normalizeCollectionKey(params.get("collection"));
        if (fromUrl) {
            activeCollection = fromUrl;
        }

        syncCollectionButtons();

        try {
            await fetchProducts();
            render();
        } catch {
            if (grid) {
                grid.innerHTML = '<div class="catalog-empty">Failed to fetch</div>';
            }
        }
    };

    showSelect?.addEventListener("change", render);
    sortSelect?.addEventListener("change", () => {
        syncMobileSortRadios();
        render();
    });
    shirtTypeSelect?.addEventListener("change", render);
    checkRows.forEach((row) => {
        const input = row.querySelector("input[type='checkbox']");
        input?.addEventListener("change", render);
    });

    mobileFilterTrigger?.addEventListener("click", () => {
        syncMobileFilterChecks();
        pendingMobileCollection = activeCollection;
        syncCollectionButtons();
        openSheet(mobileFilterSheet);
    });

    mobileSortTrigger?.addEventListener("click", () => {
        syncMobileSortRadios();
        openSheet(mobileSortSheet);
    });

    mobileFilterApply?.addEventListener("click", () => {
        const selected = new Set(
            mobileTypeChecks
                .filter((check) => check.checked)
                .map((check) => normalizeTypeLabel(check.value))
        );

        checkRows.forEach((row) => {
            const input = row.querySelector("input[type='checkbox']");
            if (!input) return;

            const key = normalizeTypeLabel(String(row.textContent || ""));
            input.checked = selected.has(key);
        });

        activeCollection = pendingMobileCollection;
        writeCollectionToUrl(activeCollection);
        pendingMobileCollection = null;
        syncCollectionButtons();

        closeSheet(mobileFilterSheet);
        render();
    });

    mobileSortApply?.addEventListener("click", () => {
        const selected = mobileSortRadios.find((radio) => radio.checked);
        if (selected && sortSelect) {
            sortSelect.value = selected.value;
        }

        closeSheet(mobileSortSheet);
        render();
    });

    document.querySelectorAll("[data-close-sheet]").forEach((button) => {
        button.addEventListener("click", () => {
            const id = button.getAttribute("data-close-sheet");
            if (!id) return;
            closeSheet(document.getElementById(id));
        });
    });

    [mobileFilterSheet, mobileSortSheet].forEach((sheet) => {
        if (!sheet) return;
        sheet.addEventListener("click", (event) => {
            if (event.target === sheet) {
                closeSheet(sheet);
            }
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSheet(mobileFilterSheet);
            closeSheet(mobileSortSheet);
        }
    });

    desktopCollectionButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = normalizeCollectionKey(btn.getAttribute("data-collection"));
            if (key && key === activeCollection) {
                setCollectionFilter(null);
                return;
            }
            setCollectionFilter(key);
        });
    });

    mobileCollectionButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = normalizeCollectionKey(btn.getAttribute("data-collection"));
            if (key && key === pendingMobileCollection) {
                pendingMobileCollection = null;
            } else {
                pendingMobileCollection = key;
            }
            syncCollectionButtons();
        });
    });

    init();
})();


(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);

    const productForm = qs("#productForm");
    const productIdInput = qs("#productId");
    const productNameInput = qs("#productName");
    const productCategoryInput = qs("#productCategory");
    const productPriceInput = qs("#productPrice");
    const productImageInput = qs("#productImage");
    const productImageDataUrlInput = qs("#productImageDataUrl");
    const imagePreview = qs("#imagePreview");
    const resetButton = qs("#resetProductBtn");
    const searchInput = qs("#productSearch");

    const tbody = qs("#productsTbody");

    const formatDateTime = (iso) => {
        if (!iso) return "-";
        const dt = new Date(iso);
        if (Number.isNaN(dt.getTime())) return "-";
        return dt.toLocaleString("en-PH", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    };

    const formatMoney = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`;

    const renderImagePreview = (dataUrl) => {
        if (!imagePreview) return;
        imagePreview.innerHTML = "";
        if (!dataUrl) return;

        const img = document.createElement("img");
        img.src = dataUrl;
        img.alt = "Product image preview";
        img.loading = "lazy";
        imagePreview.appendChild(img);
    };

    const setForm = (product) => {
        productIdInput.value = product?.id || "";
        productNameInput.value = product?.name || "";
        productCategoryInput.value = product?.category || "";
        productPriceInput.value = String(product?.price ?? "");
        productImageDataUrlInput.value = product?.imageDataUrl || "";
        renderImagePreview(product?.imageDataUrl || null);
        if (productImageInput) productImageInput.value = "";
    };

    const resetForm = () => setForm(null);

    const readFileAsDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const getFilteredProducts = () => {
        const products = window.AdminStore.getProducts();
        const q = String(searchInput?.value || "").trim().toLowerCase();
        if (!q) return products;
        return products.filter((p) =>
            [p.name, p.category, p.id].some((v) => String(v || "").toLowerCase().includes(q))
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

    productImageInput?.addEventListener("change", async () => {
        const file = productImageInput.files?.[0];
        if (!file) return;
        const dataUrl = await readFileAsDataUrl(file);
        productImageDataUrlInput.value = dataUrl;
        renderImagePreview(dataUrl);
    });

    searchInput?.addEventListener("input", () => {
        renderTable();
    });

    resetButton?.addEventListener("click", () => {
        resetForm();
    });

    productForm?.addEventListener("submit", (e) => {
        e.preventDefault();

        const product = {
            id: productIdInput.value || undefined,
            name: productNameInput.value,
            category: productCategoryInput.value,
            price: Number(productPriceInput.value || 0),
            imageDataUrl: productImageDataUrlInput.value || null,
        };

        const saved = window.AdminStore.upsertProduct(product);
        setForm(saved);
        renderTable();
    });

    tbody?.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute("data-action");
        const id = target.getAttribute("data-id");
        if (!action || !id) return;

        if (action === "edit") {
            const products = window.AdminStore.getProducts();
            const product = products.find((p) => String(p.id) === String(id));
            setForm(product || null);
            return;
        }

        if (action === "delete") {
            const ok = window.confirm("Delete this product?");
            if (!ok) return;
            window.AdminStore.deleteProduct(id);
            if (productIdInput.value === id) resetForm();
            renderTable();
        }
    });

    // Page init
    resetForm();
    renderTable();
})();

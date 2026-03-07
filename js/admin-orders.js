(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);
    const tbody = qs("#ordersTbody");
    const searchInput = qs("#orderSearch");
    const statusFilter = qs("#statusFilter");
    const typeFilter = qs("#typeFilter");

    const escapeHtml = (s) =>
        String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const formatDate = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
    };

    const formatMoney = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`;

    const initFromQuery = () => {
        if (!window.AdminStore) return;

        const q = window.AdminStore.getQueryParam("q");
        const status = window.AdminStore.getQueryParam("status");
        const type = window.AdminStore.getQueryParam("type");

        if (searchInput && q != null) searchInput.value = String(q);

        const setIfOptionExists = (selectEl, value) => {
            if (!selectEl || value == null) return;
            const v = String(value);
            const has = Array.from(selectEl.options || []).some((opt) => opt.value === v);
            if (has) selectEl.value = v;
        };

        setIfOptionExists(statusFilter, status);
        setIfOptionExists(typeFilter, type);
    };

    const maybeSeedDemoOrders = () => {
        if (!window.AdminStore) return false;
        const seed = window.AdminStore.getQueryParam("seed");
        if (seed !== "1") return false;

        const ok = window.confirm("Seed demo orders for all workflow phases? This will ADD demo orders (DEMO-*) to your current orders.");
        if (ok) {
            window.AdminStore.seedDemoOrders();
        }

        const url = new URL(window.location.href);
        url.searchParams.delete("seed");
        window.location.replace(url.toString());
        return true;
    };

    const getFilteredOrders = () => {
        const orders = window.AdminStore.getOrders();
        const q = String(searchInput?.value || "").trim().toLowerCase();
        const status = String(statusFilter?.value || "").trim();
        const type = String(typeFilter?.value || "").trim();

        return orders.filter((o) => {
            const workflow = String(o.admin?.workflowStatus || "Pending");
            const orderType = String(o.admin?.orderType || "fixed");
            const matchesQuery = !q || String(o.id).toLowerCase().includes(q);
            const matchesStatus = !status || workflow === status;
            const matchesType = !type || orderType === type;
            return matchesQuery && matchesStatus && matchesType;
        });
    };

    const render = () => {
        if (!tbody) return;

        const orders = getFilteredOrders();
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">No orders found.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = orders
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .map((o) => {
                const workflow = String(o.admin?.workflowStatus || "Pending");
                const type = String(o.admin?.orderType || "fixed");
                return `
                    <tr>
                        <td>${escapeHtml(formatDate(o.date))}</td>
                        <td><strong>${escapeHtml(o.id)}</strong></td>
                        <td>${escapeHtml(type === "custom" ? "Custom" : "Fixed")}</td>
                        <td><span class="status-pill">${escapeHtml(workflow)}</span></td>
                        <td><strong>${escapeHtml(formatMoney(o.total))}</strong></td>
                        <td>
                            <a class="table-btn" href="admin-order-details.html?id=${encodeURIComponent(String(o.id))}">Open</a>
                        </td>
                    </tr>
                `;
            })
            .join("");
    };

    searchInput?.addEventListener("input", render);
    statusFilter?.addEventListener("change", render);
    typeFilter?.addEventListener("change", render);

    window.addEventListener("storage", (e) => {
        if (e.key === "orders") render();
    });

    if (!maybeSeedDemoOrders()) {
        initFromQuery();
        render();
    }
})();

(function () {
    "use strict";

    if (!window.AdminStore) return;

    const qs = (sel) => document.querySelector(sel);

    const setText = (sel, value) => {
        const el = qs(sel);
        if (el) el.textContent = String(value);
    };

    const formatDate = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
    };

    const getWorkflowCounts = (orders) => {
        const counts = {
            Pending: 0,
            "Request for Revision": 0,
            "On Transit": 0,
            "Completed Orders": 0,
        };

        orders.forEach((o) => {
            const w = String(o.admin?.workflowStatus || "Pending");
            if (w === "Pending") counts.Pending += 1;
            if (w === "Revision Requested") counts["Request for Revision"] += 1;
            if (w === "On Transit") counts["On Transit"] += 1;
            if (w === "Completed") counts["Completed Orders"] += 1;
        });

        return counts;
    };

    const renderStats = (orders) => {
        const counts = getWorkflowCounts(orders);
        setText(".stats-grid .stat-card:nth-child(1) .stat-value", counts.Pending);
        setText(".stats-grid .stat-card:nth-child(2) .stat-value", counts["Request for Revision"]);
        setText(".stats-grid .stat-card:nth-child(3) .stat-value", counts["On Transit"]);
        setText(".stats-grid .stat-card:nth-child(4) .stat-value", counts["Completed Orders"]);
    };

    const renderRecent = (orders) => {
        const tbody = qs(".data-table tbody");
        if (!tbody) return;

        const recent = [...orders]
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 5);

        if (recent.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">No orders yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = recent
            .map((o, idx) => {
                const status = String(o.admin?.workflowStatus || "Pending");
                return `
                    <tr>
                        <td>${idx + 1}</td>
                        <td><strong>${escapeHtml(o.id)}</strong></td>
                        <td>${escapeHtml(getCustomerLabel(o))}</td>
                        <td>${escapeHtml(formatDate(o.date))}</td>
                        <td><span class="status-pill">${escapeHtml(status)}</span></td>
                        <td><a class="table-btn" href="admin-order-details.html?id=${encodeURIComponent(String(o.id))}">Open</a></td>
                    </tr>
                `;
            })
            .join("");
    };

    const getCustomerLabel = (order) => {
        // Customer identity isn't stored yet in the current project.
        // If you add it later (e.g. order.customer.name), this can display it.
        const details = order.details || {};
        const name = details.customerName || details.groupName || order.customRequest?.designName || "-";
        return name;
    };

    const escapeHtml = (s) =>
        String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const renderAll = () => {
        const orders = window.AdminStore.getOrders();
        renderStats(orders);
        renderRecent(orders);
    };

    window.addEventListener("storage", (e) => {
        if (e.key === "orders") renderAll();
    });

    renderAll();
})();

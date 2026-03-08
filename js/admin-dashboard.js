(function () {
    "use strict";

    if (!window.AdminStore) return;

    const qs = (sel) => document.querySelector(sel);

    const getApiBaseUrl = () => window.ALIX_API_BASE_URL || "http://localhost:8000";

    const setText = (sel, value) => {
        const el = qs(sel);
        if (el) el.textContent = String(value);
    };

    const formatDate = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
    };

    const formatDateTime = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
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
                        <td><a class="table-btn" href="admin-order-details.html?id=${encodeURIComponent(String(o.id))}">View</a></td>
                    </tr>
                `;
            })
            .join("");
    };

    const getCustomerLabel = (order) => {
        const details = order.details || {};
        const legacyCustomer = order.customer && typeof order.customer === "object" ? order.customer : {};

        const name =
            details.customerName ||
            details.customer_fullname ||
            details.customer ||
            order.customerName ||
            order.customer_fullname ||
            order.customer ||
            legacyCustomer.name ||
            legacyCustomer.fullName ||
            legacyCustomer.fullname ||
            details.groupName ||
            (Array.isArray(details.roster) && details.roster.length > 0
                ? String(details.roster[0]?.name || "").trim() || "Group Order"
                : "") ||
            order.customRequest?.designName ||
            (order.customRequest ? "Custom Request" : "") ||
            "-";

        return String(name).trim() || "-";
    };

    const escapeHtml = (s) =>
        String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const renderRecentActivity = (logs) => {
        const list = qs(".activity-list");
        if (!list) return;

        const items = Array.isArray(logs) ? logs : [];
        if (items.length === 0) {
            list.innerHTML = `
                <li class="activity-item">
                    <span class="activity-dot" aria-hidden="true"></span>
                    <span>No recent activity yet.</span>
                </li>
            `;
            return;
        }

        list.innerHTML = items
            .slice(0, 5)
            .map((l) => {
                const when = formatDateTime(l.created_at);
                const action = String(l.action || "activity");
                const desc = String(l.description || action);
                const who = l.actor_role ? `(${String(l.actor_role)})` : "";
                return `
                    <li class="activity-item">
                        <span class="activity-dot" aria-hidden="true"></span>
                        <span><strong>${escapeHtml(when)}</strong> ${escapeHtml(who)} ${escapeHtml(desc)}</span>
                    </li>
                `;
            })
            .join("");
    };

    const loadRecentActivity = async () => {
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/admin/activity-logs?limit=5&offset=0`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data || data.ok !== true) {
                renderRecentActivity([]);
                return;
            }

            renderRecentActivity(Array.isArray(data.logs) ? data.logs : []);
        } catch {
            renderRecentActivity([]);
        }
    };

    const renderAll = () => {
        const orders = window.AdminStore.getOrders();
        renderStats(orders);
        renderRecent(orders);
    };

    window.addEventListener("storage", (e) => {
        if (e.key === "orders") renderAll();
    });

    renderAll();
    loadRecentActivity();
})();

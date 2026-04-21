(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);

    const getApiBaseUrl = () => {
        if (window.AlixAuth && typeof window.AlixAuth.apiBaseUrl === "function") {
            return window.AlixAuth.apiBaseUrl();
        }

        if (window.ALIX_API_BASE_URL) return window.ALIX_API_BASE_URL;
        const origin = window.location && window.location.origin ? window.location.origin : "";
        if (origin && origin !== "null") return origin;
        return "";
    };

    const getAdminApiKey = () => {
        const key = localStorage.getItem("alix_admin_api_key");
        return key && String(key).trim() ? String(key).trim() : null;
    };

    const fetchJson = async (path) => {
        const headers = { Accept: "application/json" };
        const key = getAdminApiKey();
        if (key) headers["X-Admin-Api-Key"] = key;

        const res = await fetch(getApiBaseUrl() + path, { method: "GET", headers });
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

    const dbStatusToWorkflow = (status) => {
        const s = String(status || "pending").toLowerCase();
        if (s === "completed") return "Completed";
        if (s === "cancelled") return "Completed";
        if (s === "shipped") return "On Transit";
        if (s === "ready_to_ship") return "Ready to Ship";
        if (s === "proofing") return "Proofing";
        if (s === "processing") return "In Progress";
        if (s === "paid") return "Awaiting Payment";
        return "Pending";
    };

    const normalizeDbOrders = (apiOrders) => {
        const list = Array.isArray(apiOrders) ? apiOrders : [];
        return list.map((row) => {
            const o = row?.order || {};
            const user = row?.user || null;
            const idNum = o.order_id;
            const name = user ? `${String(user.firstname || "").trim()} ${String(user.lastname || "").trim()}`.trim() : "";
            const meta = o.meta && typeof o.meta === "object" ? o.meta : {};
            const fallbackCustomer = String(meta?.customerName || meta?.customer_fullname || "").trim();

            return {
                id: idNum != null ? `ORD-${idNum}` : "ORD-?",
                rawId: idNum,
                date: o.created_at || new Date().toISOString(),
                status: String(o.status || "pending"),
                details: {
                    customerName: name || user?.email || fallbackCustomer || "-",
                },
                admin: {
                    workflowStatus: dbStatusToWorkflow(o.status),
                },
                meta,
            };
        });
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
                        <td><a class="table-btn" href="admin-order-details.html?id=${encodeURIComponent(String(o.rawId ?? ""))}&db=1">View</a></td>
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

    const loadOrders = async () => {
        const res = await fetchJson("/api/admin/orders?limit=50&offset=0");
        return normalizeDbOrders(res?.orders);
    };

    const start = async () => {
        try {
            const orders = await loadOrders();
            renderStats(orders);
            renderRecent(orders);
        } catch {
            renderStats([]);
            renderRecent([]);
        }

        loadRecentActivity();
    };

    start();
})();


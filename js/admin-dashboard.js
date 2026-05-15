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

    const getAdminToken = () => {
        if (window.AlixAdminAuth && typeof window.AlixAdminAuth.getToken === "function") {
            return window.AlixAdminAuth.getToken();
        }
        const token = localStorage.getItem("alix_admin_auth_token");
        return token && String(token).trim() ? String(token).trim() : null;
    };

    const fetchJson = async (path) => {
        const headers = { Accept: "application/json" };
        const token = getAdminToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

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
        if (s === "cancelled") return "Cancelled";
        if (s === "shipped") return "On Transit";
        if (s === "ready_to_ship") return "Ready to Ship";
        if (s === "awaiting_final_payment") return "Awaiting Final Payment";
        if (s === "proofing") return "Proofing";
        if (s === "processing") return "In Progress";
        if (s === "paid") return "Awaiting Payment";
        return "Pending";
    };

    const isCustomerCancelledOrder = (order) => {
        const rawStatus = String(order?.status || "").trim().toLowerCase();
        if (rawStatus === "cancelled" || rawStatus === "canceled") return true;

        const workflow = String(order?.admin?.workflowStatus || "").trim().toLowerCase();
        return workflow === "cancelled" || workflow === "canceled";
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

        const statusKeyOf = (status) => {
            const s = String(status || "").trim().toLowerCase();
            if (!s) return "default";
            if (s.includes("pending")) return "pending";
            if (s.includes("rejected")) return "rejected";
            if (s.includes("cancel")) return "cancelled";
            if (s.includes("ready") && s.includes("ship")) return "ready";
            if (s.includes("transit") || s.includes("shipped") || s.includes("shipping")) return "transit";
            if (s.includes("complete") || s.includes("done")) return "completed";
            if (s.includes("revision") || s.includes("reject") || s.includes("cancel")) return "revision";
            if (s.includes("proof")) return "proofing";
            if (s.includes("progress") || s.includes("process")) return "progress";
            if (s.includes("final") && s.includes("payment")) return "final-payment";
            if (s.includes("awaiting") && s.includes("payment")) return "payment";
            if (s.includes("payment") || s.includes("pay")) return "payment";
            return s.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "default";
        };

        tbody.innerHTML = recent
            .map((o, idx) => {
                const status = String(o.admin?.workflowStatus || "Pending");
                const statusKey = statusKeyOf(status);
                return `
                    <tr>
                        <td>${idx + 1}</td>
                        <td><strong>${escapeHtml(o.id)}</strong></td>
                        <td>${escapeHtml(getCustomerLabel(o))}</td>
                        <td>${escapeHtml(formatDate(o.date))}</td>
                        <td><span class="status-pill status-pill--${escapeHtml(statusKey)}">${escapeHtml(status)}</span></td>
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

    const loadOrders = async () => {
        const res = await fetchJson("/api/admin/orders?limit=50&offset=0");
        return normalizeDbOrders(res?.orders);
    };

    const start = async () => {
        try {
            const orders = await loadOrders();
            const visibleOrders = orders.filter((o) => !isCustomerCancelledOrder(o));
            renderStats(visibleOrders);
            renderRecent(visibleOrders);
        } catch {
            renderStats([]);
            renderRecent([]);
        }
    };

    start();
})();


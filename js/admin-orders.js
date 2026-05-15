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
            const items = Array.isArray(row?.items) ? row.items : [];
            const idNum = o.order_id;
            const typeRaw = String(o.order_type || "").toLowerCase();

            const orderMeta = (() => {
                const raw = o?.meta;
                if (!raw) return {};
                if (typeof raw === "object") return raw;
                if (typeof raw === "string") {
                    try {
                        const parsed = JSON.parse(raw);
                        return parsed && typeof parsed === "object" ? parsed : {};
                    } catch {
                        return {};
                    }
                }
                return {};
            })();

            const isCustomDesign = (() => {
                if (typeRaw === "custom") return true;
                const src = String(orderMeta?.source || "").toLowerCase();
                if (src === "custom_design") return true;

                for (const it of items) {
                    const meta = it?.meta;
                    if (meta && typeof meta === "object" && meta.custom_design) return true;
                    if (typeof meta === "string") {
                        try {
                            const parsed = JSON.parse(meta);
                            if (parsed && typeof parsed === "object" && parsed.custom_design) return true;
                        } catch {
                            // ignore
                        }
                    }
                }

                return false;
            })();

            const orderType = isCustomDesign ? "custom" : "fixed";
            const name = user ? `${String(user.firstname || "").trim()} ${String(user.lastname || "").trim()}`.trim() : "";
            const fallbackCustomer = String(orderMeta?.customerName || orderMeta?.customer_fullname || "").trim();

            const base = Number(o.base_price || 0);
            const shipping = Number(o.shipping_fee || 0);
            const qtyFromItems = Array.isArray(items)
                ? items.reduce((sum, it) => sum + Math.max(0, Number(it?.quantity ?? 0)), 0)
                : 0;
            const roster = orderMeta?.roster;
            const qtyFromRoster = Array.isArray(roster) ? roster.length : 0;
            const effectiveQty = Math.max(1, qtyFromItems || qtyFromRoster || 0);
            const subtotal = isCustomDesign ? base * effectiveQty : base;
            return {
                id: idNum != null ? `ORD-${idNum}` : "ORD-?",
                rawId: idNum,
                date: o.created_at || new Date().toISOString(),
                total: subtotal + shipping,
                details: {
                    customerName: name || user?.email || fallbackCustomer || "-",
                },
                admin: {
                    orderType,
                    workflowStatus: dbStatusToWorkflow(o.status),
                },
                meta: orderMeta,
                status: String(o.status || "pending"),
                order_type: String(o.order_type || ""),
            };
        });
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

    const maybeSeedDemoOrders = async () => {
        if (!window.AdminStore) return false;
        const seed = window.AdminStore.getQueryParam("seed");
        if (seed !== "1") return false;

        const ok = window.AVDialog?.confirm
            ? await window.AVDialog.confirm(
                  "Seed demo orders for all workflow phases? This will ADD demo orders (DEMO-*) to your current orders.",
                                    { title: "Confirm", tone: "danger", okText: "Seed", cancelText: "Cancel" }
              )
            : window.confirm("Seed demo orders for all workflow phases? This will ADD demo orders (DEMO-*) to your current orders.");
        if (ok) {
            window.AdminStore.seedDemoOrders();
        }

        const url = new URL(window.location.href);
        url.searchParams.delete("seed");
        window.location.replace(url.toString());
        return true;
    };

    let ordersCache = [];

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

    const getFilteredOrders = () => {
        const orders = ordersCache;
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

    const loadOrders = async () => {
        // Prefer DB-backed API; fallback to demo AdminStore if unavailable.
        try {
            const res = await fetchJson("/api/admin/orders?limit=200&offset=0");
            ordersCache = normalizeDbOrders(res?.orders);
            return;
        } catch {
            // Fallback demo mode
            if (window.location && window.location.origin === "null") {
                window.AVDialog?.alert(
                    "Admin API is unavailable because this page is opened via file://. Open the site via the PHP router/web server so /api/admin/orders can load. Showing local orders only.",
                    { title: "Admin", tone: "warning" }
                );
            } else {
                window.AVDialog?.alert(
                    "Failed to load orders from the server API (/api/admin/orders). Showing local orders only.",
                    { title: "Admin", tone: "warning" }
                );
            }
            ordersCache = window.AdminStore ? window.AdminStore.getOrders() : [];
        }
    };

    const render = () => {
        if (!tbody) return;

        const orders = getFilteredOrders();
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">No orders found.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = orders
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .map((o) => {
                const workflow = String(o.admin?.workflowStatus || "Pending");
                const workflowKey = statusKeyOf(workflow);
                const type = String(o.admin?.orderType || "fixed");
                const isDb = o.rawId != null && String(o.id || "").startsWith("ORD-");
                const detailId = isDb ? String(o.rawId) : String(o.id);
                const dbFlag = isDb ? "&db=1" : "";
                return `
                    <tr>
                        <td>${escapeHtml(formatDate(o.date))}</td>
                        <td><strong>${escapeHtml(o.id)}</strong></td>
                        <td>${escapeHtml(getCustomerLabel(o))}</td>
                        <td>${escapeHtml(type === "custom" ? "Custom" : "Fixed")}</td>
                        <td><span class="status-pill status-pill--${escapeHtml(workflowKey)}">${escapeHtml(workflow)}</span></td>
                        <td><strong>${escapeHtml(formatMoney(o.total))}</strong></td>
                        <td>
                            <a class="table-btn" href="admin-order-details.html?id=${encodeURIComponent(detailId)}${dbFlag}">View</a>
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

    const start = async () => {
        const seeded = await maybeSeedDemoOrders();
        if (seeded) return;
        initFromQuery();
        await loadOrders();
        render();
    };

    start();
})();


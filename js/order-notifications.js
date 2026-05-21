(function () {
    "use strict";

    if (window.AlixOrderNotifications) return;

    const STATUS_MAP_KEY = "alix_order_status_map_v1";
    const NOTIFICATIONS_KEY = "alix_order_notifications_v1";
    const NOTIFICATIONS_LIMIT = 120;

    const safeJsonParse = (value, fallback) => {
        try {
            const parsed = JSON.parse(value);
            return parsed == null ? fallback : parsed;
        } catch {
            return fallback;
        }
    };

    const loadStatusMap = () => {
        try {
            const raw = localStorage.getItem(STATUS_MAP_KEY);
            const parsed = safeJsonParse(raw, null);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    };

    const saveStatusMap = (map) => {
        try {
            localStorage.setItem(STATUS_MAP_KEY, JSON.stringify(map || {}));
        } catch {
            // ignore
        }
    };

    const loadNotifications = () => {
        try {
            const raw = localStorage.getItem(NOTIFICATIONS_KEY);
            const parsed = safeJsonParse(raw, []);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const saveNotifications = (list) => {
        try {
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
        } catch {
            // ignore
        }
    };

    const getWorkflowDisplay = (status) => {
        const s = String(status || "").trim().toLowerCase();
        if (s === "completed") return "Completed";
        if (s === "cancelled" || s === "canceled") return "Cancelled";
        if (s === "shipped") return "On Transit";
        if (s === "ready_to_ship") return "Ready to Ship";
        if (s === "awaiting_final_payment") return "Awaiting Final Payment";
        if (s === "proofing") return "Proofing";
        if (s === "processing") return "In Progress";
        if (s === "paid") return "Awaiting Payment";
        if (s === "draft") return "Draft";
        return "Pending Review";
    };

    const normalizeOrderId = (rawOrderId) => {
        if (rawOrderId === null || rawOrderId === undefined || rawOrderId === "") return null;
        const n = Number(rawOrderId);
        if (Number.isFinite(n) && n > 0) return String(Math.trunc(n));
        const s = String(rawOrderId);
        return s.trim() ? s.trim() : null;
    };

    const toneFor = (toStatus) => {
        const s = String(toStatus || "").toLowerCase();
        if (s === "completed") return "success";
        if (s === "cancelled" || s === "canceled") return "danger";
        return "info";
    };

    const makeNotification = ({ orderId, fromStatus, toStatus, atIso }) => {
        const at = atIso || new Date().toISOString();
        const from = String(fromStatus || "");
        const to = String(toStatus || "");
        const id = `${orderId}:${from}->${to}:${at}`;

        return {
            id,
            order_id: orderId,
            from_status: from,
            to_status: to,
            from_workflow: getWorkflowDisplay(from),
            to_workflow: getWorkflowDisplay(to),
            at,
        };
    };

    const recordFromOrders = (orders) => {
        const list = Array.isArray(orders) ? orders : [];
        const prevMap = loadStatusMap();
        const hadAnyPrev = Object.keys(prevMap).length > 0;
        const nextMap = { ...prevMap };

        const newItems = [];

        for (const order of list) {
            const orderId = normalizeOrderId(order?.rawId ?? order?.order_id ?? order?.id);
            if (!orderId) continue;

            const status = String(order?.status || "").trim().toLowerCase() || "pending";
            if (status === "draft") {
                // Cart draft order should not generate workflow notifications.
                nextMap[orderId] = status;
                continue;
            }

            const prev = typeof prevMap[orderId] === "string" ? String(prevMap[orderId]) : "";
            nextMap[orderId] = status;

            if (!hadAnyPrev) {
                continue; // first run: establish baseline without emitting notifications
            }

            if (!prev) {
                continue;
            }

            if (String(prev).toLowerCase() !== status) {
                newItems.push(makeNotification({ orderId, fromStatus: prev, toStatus: status }));
            }
        }

        saveStatusMap(nextMap);

        if (newItems.length) {
            const existing = loadNotifications();
            const merged = [...newItems, ...existing].slice(0, NOTIFICATIONS_LIMIT);
            saveNotifications(merged);
        }

        return newItems;
    };

    const showPopups = async (notifications) => {
        const list = Array.isArray(notifications) ? notifications : [];
        if (list.length === 0) return;

        for (const n of list) {
            const orderLabel = n?.order_id ? `ORD-${n.order_id}` : "Your order";
            const fromWf = String(n?.from_workflow || "").trim() || getWorkflowDisplay(n?.from_status);
            const toWf = String(n?.to_workflow || "").trim() || getWorkflowDisplay(n?.to_status);
            const message = `${orderLabel} status updated: ${fromWf} → ${toWf}.`;
            const tone = toneFor(n?.to_status);

            if (window.AVDialog?.alert) {
                await window.AVDialog.alert(message, { title: "Order Update", tone });
            } else {
                alert(message);
            }
        }
    };

    const formatWhen = (iso) => {
        const d = new Date(String(iso || ""));
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString("en-PH", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    };

    window.AlixOrderNotifications = {
        recordFromOrders,
        showPopups,
        getAll: loadNotifications,
        formatWhen,
        getWorkflowDisplay,
    };
})();

(function () {
    "use strict";

    if (window.AlixOrderNotifications) return;

    const STATUS_MAP_KEY = "alix_order_status_map_v1";
    const NOTIFICATIONS_KEY = "alix_order_notifications_v1";
    const NOTIFICATIONS_LIMIT = 120;
    const UPDATED_EVENT = "alix:order-notifications-updated";

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
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter((n) => n && typeof n === "object")
                .map((n) => ({
                    ...n,
                    id: String(n.id || "").trim(),
                    order_id: n.order_id != null ? String(n.order_id) : null,
                    from_status: String(n.from_status || ""),
                    to_status: String(n.to_status || ""),
                    from_workflow: String(n.from_workflow || ""),
                    to_workflow: String(n.to_workflow || ""),
                    at: String(n.at || ""),
                    read: Boolean(n.read),
                }))
                .filter((n) => n.id && n.order_id);
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

    const emitUpdated = () => {
        try {
            window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
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

    const summarizeItems = (order) => {
        const items = Array.isArray(order?.items) ? order.items : [];
        if (items.length === 0) return { qty: null, label: "" };
        const qty = items.reduce((sum, it) => sum + (Number(it?.quantity || 0) || 0), 0);
        const name = String(items[0]?.name || "").trim();
        const label = name ? name : "";
        return { qty: Number.isFinite(qty) && qty > 0 ? qty : null, label };
    };

    const makeNotification = ({ orderId, fromStatus, toStatus, atIso, order }) => {
        const at = atIso || new Date().toISOString();
        const from = String(fromStatus || "");
        const to = String(toStatus || "");
        const id = `${orderId}:${from}->${to}:${at}`;

        const summary = summarizeItems(order);

        return {
            id,
            order_id: orderId,
            from_status: from,
            to_status: to,
            from_workflow: getWorkflowDisplay(from),
            to_workflow: getWorkflowDisplay(to),
            at,
            read: false,
            summary_qty: summary.qty,
            summary_label: summary.label,
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
                newItems.push(makeNotification({ orderId, fromStatus: prev, toStatus: status, order }));
            }
        }

        saveStatusMap(nextMap);

        if (newItems.length) {
            const existing = loadNotifications();
            const existingById = new Map(existing.map((n) => [String(n.id), n]));
            const dedupedNew = newItems.filter((n) => !existingById.has(String(n.id)));

            const merged = [...dedupedNew, ...existing].slice(0, NOTIFICATIONS_LIMIT);
            saveNotifications(merged);
            emitUpdated();
        }

        return newItems;
    };

    const getUnreadCount = () => {
        const list = loadNotifications();
        return list.reduce((sum, n) => sum + (n.read ? 0 : 1), 0);
    };

    const markAllRead = () => {
        const list = loadNotifications();
        let changed = false;
        const next = list.map((n) => {
            if (n.read) return n;
            changed = true;
            return { ...n, read: true };
        });
        if (!changed) return;
        saveNotifications(next);
        emitUpdated();
    };

    const markOrderRead = (orderId) => {
        const oid = normalizeOrderId(orderId);
        if (!oid) return;

        const list = loadNotifications();
        let changed = false;
        const next = list.map((n) => {
            if (String(n.order_id) !== String(oid)) return n;
            if (n.read) return n;
            changed = true;
            return { ...n, read: true };
        });

        if (!changed) return;
        saveNotifications(next);
        emitUpdated();
    };

    const markRead = (id) => {
        const target = String(id || "").trim();
        if (!target) return;
        const list = loadNotifications();
        let changed = false;
        const next = list.map((n) => {
            if (String(n.id) !== target) return n;
            if (n.read) return n;
            changed = true;
            return { ...n, read: true };
        });
        if (!changed) return;
        saveNotifications(next);
        emitUpdated();
    };

    const showPopups = async (notifications) => {
        const list = Array.isArray(notifications) ? notifications : [];
        if (list.length === 0) return;

        for (const n of list) {
            const orderLabel = n?.order_id ? `Order #AV-${n.order_id}` : "Your order";
            const toWf = String(n?.to_workflow || "").trim() || getWorkflowDisplay(n?.to_status);

            let message = `${orderLabel} status updated: ${toWf}.`;
            if (toWf === "Pending Review") message = `${orderLabel} has been accepted. It is now being reviewed.`;
            if (toWf === "Awaiting Payment") message = `${orderLabel} is awaiting payment. Please upload your payment receipt.`;
            if (toWf === "Awaiting Final Payment") message = `${orderLabel} is awaiting final payment. Please upload your payment receipt.`;
            if (toWf === "Proofing") message = `${orderLabel} is in proofing. Please review the proof when available.`;
            if (toWf === "In Progress") message = `${orderLabel} is now in production.`;
            if (toWf === "Ready to Ship") message = `${orderLabel} is ready to ship.`;
            if (toWf === "On Transit") message = `${orderLabel} has been shipped and is on transit.`;
            if (toWf === "Completed") message = `${orderLabel} has been completed.`;
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
        getUnreadCount,
        markAllRead,
        markOrderRead,
        markRead,
        UPDATED_EVENT,
        formatWhen,
        getWorkflowDisplay,
    };
})();

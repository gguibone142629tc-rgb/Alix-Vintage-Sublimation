(function () {
    "use strict";

    if (window.AlixOrderNotifications) return;

    const STATUS_MAP_KEY = "alix_order_status_map_v1";
    const STATE_MAP_KEY = "alix_order_state_map_v1";
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

    const loadStateMap = () => {
        try {
            const raw = localStorage.getItem(STATE_MAP_KEY);
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

    const saveStateMap = (map) => {
        try {
            localStorage.setItem(STATE_MAP_KEY, JSON.stringify(map || {}));
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
                    event_type: String(n.event_type || n.type || ""),
                    message: typeof n.message === "string" ? n.message : "",
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

    const getPaymentMeta = (order) => {
        const meta = order?.meta && typeof order.meta === "object" ? order.meta : {};
        const payment = meta.payment && typeof meta.payment === "object" ? meta.payment : {};
        return payment;
    };

    const normalizeText = (v) => {
        const s = String(v ?? "").trim();
        return s ? s : "";
    };

    const normalizeLower = (v) => normalizeText(v).toLowerCase();

    const getTrackingNumber = (order) => {
        const raw = order?.tracking_number ?? order?.meta?.tracking_number ?? order?.meta?.trackingNumber;
        return normalizeText(raw);
    };

    const getProofMockupKey = (order) => {
        const items = Array.isArray(order?.items) ? order.items : [];
        const keys = [];
        for (const it of items) {
            const dp = it?.design_proof && typeof it.design_proof === "object" ? it.design_proof : null;
            const status = normalizeText(dp?.status);
            const url = normalizeText(dp?.mockup_data_url);
            if (url) {
                const itemId = it?.id != null ? String(it.id) : "?";
                keys.push(`${itemId}:${status}:${url}`);
            }
        }

        const metaProof = order?.meta?.proof && typeof order.meta.proof === "object" ? order.meta.proof : null;
        const metaUrl = normalizeText(metaProof?.mockup_data_url);
        const metaStatus = normalizeText(metaProof?.status);
        if (metaUrl) keys.push(`meta:${metaStatus}:${metaUrl}`);

        keys.sort();
        return keys.join("|");
    };

    const hasAnyMockup = (order) => Boolean(getProofMockupKey(order));

    const extractSignals = (order) => {
        const payment = getPaymentMeta(order);
        const receiptStatus = normalizeLower(payment.receipt_status || payment.receiptStatus);
        const finalReceiptStatus = normalizeLower(payment.final_receipt_status || payment.finalReceiptStatus);

        const receiptUrl = normalizeText(payment.receipt_data_url || payment.receiptDataUrl);
        const finalReceiptUrl = normalizeText(payment.final_receipt_data_url || payment.finalReceiptDataUrl);

        const receiptUploadedAt = normalizeText(payment.receipt_uploaded_at || payment.receiptUploadedAt);
        const finalReceiptUploadedAt = normalizeText(payment.final_receipt_uploaded_at || payment.finalReceiptUploadedAt);

        const receiptRejectionReason = normalizeText(payment.receipt_rejection_reason || payment.receiptRejectionReason);
        const finalReceiptRejectionReason = normalizeText(payment.final_receipt_rejection_reason || payment.finalReceiptRejectionReason);

        const receiptVerified = payment.verified === true || receiptStatus === "verified";
        const finalReceiptVerified = payment.final_verified === true || finalReceiptStatus === "verified";

        return {
            status: normalizeLower(order?.status || "pending"),
            tracking_number: getTrackingNumber(order),
            receipt_status: receiptStatus,
            final_receipt_status: finalReceiptStatus,
            receipt_url: receiptUrl,
            final_receipt_url: finalReceiptUrl,
            receipt_uploaded_at: receiptUploadedAt,
            final_receipt_uploaded_at: finalReceiptUploadedAt,
            receipt_rejection_reason: receiptRejectionReason,
            final_receipt_rejection_reason: finalReceiptRejectionReason,
            receipt_verified: receiptVerified ? "1" : "0",
            final_receipt_verified: finalReceiptVerified ? "1" : "0",
            proof_mockup_key: getProofMockupKey(order),
        };
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
            event_type: "status_change",
            summary_qty: summary.qty,
            summary_label: summary.label,
        };
    };

    const makeEventNotification = ({ orderId, atIso, order, eventType, message, toStatus }) => {
        const at = atIso || new Date().toISOString();
        const id = `${orderId}:${String(eventType || "event")}:${at}`;
        const summary = summarizeItems(order);
        const status = String(toStatus || order?.status || "");
        return {
            id,
            order_id: orderId,
            from_status: "",
            to_status: status,
            from_workflow: "",
            to_workflow: getWorkflowDisplay(status),
            at,
            read: false,
            event_type: String(eventType || "event"),
            message: String(message || ""),
            summary_qty: summary.qty,
            summary_label: summary.label,
        };
    };

    const recordFromOrders = (orders) => {
        const list = Array.isArray(orders) ? orders : [];
        const prevMap = loadStatusMap();
        const prevStateMap = loadStateMap();
        const hadAnyPrev = Object.keys(prevMap).length > 0;
        const nextMap = { ...prevMap };
        const nextStateMap = { ...prevStateMap };

        const newItems = [];

        for (const order of list) {
            const orderId = normalizeOrderId(order?.rawId ?? order?.order_id ?? order?.id);
            if (!orderId) continue;

            const status = String(order?.status || "").trim().toLowerCase() || "pending";
            if (status === "draft") {
                // Cart draft order should not generate workflow notifications.
                nextMap[orderId] = status;
                nextStateMap[orderId] = extractSignals(order);
                continue;
            }

            const prev = typeof prevMap[orderId] === "string" ? String(prevMap[orderId]) : "";
            nextMap[orderId] = status;

            const prevSignals = prevStateMap[orderId] && typeof prevStateMap[orderId] === "object" ? prevStateMap[orderId] : null;
            const nextSignals = extractSignals(order);
            nextStateMap[orderId] = nextSignals;

            if (!hadAnyPrev) {
                // First run: establish baseline, but still emit critical "current state" notifications
                // so users are informed even if they open Notifications late.
                if (nextSignals.receipt_status === "rejected") {
                    const reason = normalizeText(nextSignals.receipt_rejection_reason);
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "receipt_rejected",
                            message: `Admin requested a new downpayment receipt. Please upload a new receipt screenshot.${reason ? ` Reason: ${reason}` : ""}`,
                            toStatus: order?.status,
                        }),
                    );
                }
                if (nextSignals.final_receipt_status === "rejected") {
                    const reason = normalizeText(nextSignals.final_receipt_rejection_reason);
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "final_receipt_rejected",
                            message: `Admin requested a new final payment receipt. Please upload a new receipt screenshot.${reason ? ` Reason: ${reason}` : ""}`,
                            toStatus: order?.status,
                        }),
                    );
                }
                if (String(nextSignals.proof_mockup_key || "")) {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "mockup_sent",
                            message: "Admin sent a design mockup. Please review it on the order tracking page.",
                            toStatus: order?.status,
                        }),
                    );
                }
                if (nextSignals.tracking_number) {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "tracking_updated",
                            message: `Tracking number available: ${nextSignals.tracking_number}.`,
                            toStatus: order?.status,
                        }),
                    );
                }
                continue;
            }

            if (!prev) {
                continue;
            }

            if (String(prev).toLowerCase() !== status) {
                const n = makeNotification({ orderId, fromStatus: prev, toStatus: status, order });
                // Improve Proofing message: if no mockup yet, tell user to wait.
                const toWf = getWorkflowDisplay(status);
                if (toWf === "Proofing") {
                    n.message = hasAnyMockup(order)
                        ? "Admin sent a design mockup. Please review it on the order tracking page."
                        : "Your payment was verified. Your order is now in proofing. Please wait for admin to upload the mockup.";
                }
                newItems.push(n);
            }

            // Extra event notifications (admin actions + non-status signals).
            if (prevSignals) {
                const prevReceipt = normalizeLower(prevSignals.receipt_status);
                const nextReceipt = normalizeLower(nextSignals.receipt_status);
                const prevFinalReceipt = normalizeLower(prevSignals.final_receipt_status);
                const nextFinalReceipt = normalizeLower(nextSignals.final_receipt_status);

                const prevReceiptVerified = String(prevSignals.receipt_verified || "0");
                const nextReceiptVerified = String(nextSignals.receipt_verified || "0");
                const prevFinalReceiptVerified = String(prevSignals.final_receipt_verified || "0");
                const nextFinalReceiptVerified = String(nextSignals.final_receipt_verified || "0");

                // Receipt uploaded (customer action) — useful because status may not change.
                if (!prevSignals.receipt_url && nextSignals.receipt_url) {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            atIso: nextSignals.receipt_uploaded_at || null,
                            order,
                            eventType: "receipt_uploaded",
                            message: "Receipt uploaded. Awaiting admin verification.",
                            toStatus: order?.status,
                        }),
                    );
                }
                if (!prevSignals.final_receipt_url && nextSignals.final_receipt_url) {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            atIso: nextSignals.final_receipt_uploaded_at || null,
                            order,
                            eventType: "final_receipt_uploaded",
                            message: "Final payment receipt uploaded. Awaiting admin verification.",
                            toStatus: order?.status,
                        }),
                    );
                }

                // Admin requests another receipt (Rejected).
                if (prevReceipt !== nextReceipt && nextReceipt === "rejected") {
                    const reason = normalizeText(nextSignals.receipt_rejection_reason);
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "receipt_rejected",
                            message: `Admin requested a new downpayment receipt. Please upload a new receipt screenshot.${reason ? ` Reason: ${reason}` : ""}`,
                            toStatus: order?.status,
                        }),
                    );
                }
                if (prevFinalReceipt !== nextFinalReceipt && nextFinalReceipt === "rejected") {
                    const reason = normalizeText(nextSignals.final_receipt_rejection_reason);
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "final_receipt_rejected",
                            message: `Admin requested a new final payment receipt. Please upload a new receipt screenshot.${reason ? ` Reason: ${reason}` : ""}`,
                            toStatus: order?.status,
                        }),
                    );
                }

                // Receipt verified (admin action).
                if (prevReceiptVerified !== nextReceiptVerified && nextReceiptVerified === "1") {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "receipt_verified",
                            message: "Your downpayment receipt was verified.",
                            toStatus: order?.status,
                        }),
                    );
                }
                if (prevFinalReceiptVerified !== nextFinalReceiptVerified && nextFinalReceiptVerified === "1") {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "final_receipt_verified",
                            message: "Your final payment receipt was verified.",
                            toStatus: order?.status,
                        }),
                    );
                }

                // Mockup/proof sent (admin action).
                if (!String(prevSignals.proof_mockup_key || "") && String(nextSignals.proof_mockup_key || "")) {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "mockup_sent",
                            message: "Admin sent a design mockup. Please review it on the order tracking page.",
                            toStatus: order?.status,
                        }),
                    );
                }

                // Tracking number set/updated.
                if (normalizeText(prevSignals.tracking_number) !== normalizeText(nextSignals.tracking_number) && nextSignals.tracking_number) {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "tracking_updated",
                            message: `Tracking number updated: ${nextSignals.tracking_number}.`,
                            toStatus: order?.status,
                        }),
                    );
                }
            }
        }

        saveStatusMap(nextMap);
        saveStateMap(nextStateMap);

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

            let message = typeof n?.message === "string" && n.message.trim()
                ? n.message.trim()
                : `${orderLabel} status updated: ${toWf}.`;
            if (!message || message === `${orderLabel} status updated: ${toWf}.`) {
                if (toWf === "Pending Review") message = `${orderLabel} has been accepted. It is now being reviewed.`;
                if (toWf === "Awaiting Payment") message = `${orderLabel} is awaiting payment. Please upload your payment receipt.`;
                if (toWf === "Awaiting Final Payment") message = `${orderLabel} is awaiting final payment. Please upload your payment receipt.`;
                if (toWf === "Proofing") message = `${orderLabel} is in proofing. Please review the proof when available.`;
                if (toWf === "In Progress") message = `${orderLabel} is now in production.`;
                if (toWf === "Ready to Ship") message = `${orderLabel} is ready to ship.`;
                if (toWf === "On Transit") message = `${orderLabel} has been shipped and is on transit.`;
                if (toWf === "Completed") message = `${orderLabel} has been completed.`;
            }
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

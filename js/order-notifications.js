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
                    shown: Boolean(n.shown ?? n.popup_shown ?? n.popupShown),
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

    const hasPaymentMeta = (order) => {
        const meta = order?.meta && typeof order.meta === "object" ? order.meta : null;
        const payment = meta?.payment && typeof meta.payment === "object" ? meta.payment : null;
        return Boolean(payment && Object.keys(payment).length);
    };

    const hasTrackingMeta = (order) => {
        if (order?.tracking_number != null && String(order.tracking_number).trim()) return true;
        const meta = order?.meta && typeof order.meta === "object" ? order.meta : null;
        const t1 = meta?.tracking_number != null ? String(meta.tracking_number).trim() : "";
        const t2 = meta?.trackingNumber != null ? String(meta.trackingNumber).trim() : "";
        return Boolean(t1 || t2);
    };

    const hasProofMeta = (order) => {
        const meta = order?.meta && typeof order.meta === "object" ? order.meta : null;
        const metaProofUrl = String(meta?.proof?.mockup_data_url || "").trim();
        if (metaProofUrl) return true;

        const items = Array.isArray(order?.items) ? order.items : [];
        return items.some((it) => {
            const dp = it?.design_proof && typeof it.design_proof === "object" ? it.design_proof : null;
            const url = String(dp?.mockup_data_url || "").trim();
            return Boolean(url);
        });
    };

    const mergeSignals = (prevSignals, nextSignals, order) => {
        const prev = prevSignals && typeof prevSignals === "object" ? prevSignals : null;
        if (!prev) return nextSignals;

        const merged = { ...prev, ...nextSignals };

        const keepPrevIfEmpty = (key) => {
            const nextVal = normalizeText(merged[key]);
            const prevVal = normalizeText(prev[key]);
            if (!nextVal && prevVal) merged[key] = prev[key];
        };

        // Guard against APIs that omit fields or send empty strings.
        keepPrevIfEmpty("tracking_number");
        keepPrevIfEmpty("proof_mockup_key");
        keepPrevIfEmpty("proof_file_key");
        keepPrevIfEmpty("receipt_status");
        keepPrevIfEmpty("final_receipt_status");
        keepPrevIfEmpty("receipt_url");
        keepPrevIfEmpty("final_receipt_url");
        keepPrevIfEmpty("receipt_uploaded_at");
        keepPrevIfEmpty("final_receipt_uploaded_at");
        keepPrevIfEmpty("receipt_rejection_reason");
        keepPrevIfEmpty("final_receipt_rejection_reason");

        if (!hasPaymentMeta(order)) {
            merged.receipt_status = prev.receipt_status;
            merged.final_receipt_status = prev.final_receipt_status;
            merged.receipt_url = prev.receipt_url;
            merged.final_receipt_url = prev.final_receipt_url;
            merged.receipt_uploaded_at = prev.receipt_uploaded_at;
            merged.final_receipt_uploaded_at = prev.final_receipt_uploaded_at;
            merged.receipt_rejection_reason = prev.receipt_rejection_reason;
            merged.final_receipt_rejection_reason = prev.final_receipt_rejection_reason;
            merged.receipt_verified = prev.receipt_verified;
            merged.final_receipt_verified = prev.final_receipt_verified;
        }

        if (!hasTrackingMeta(order)) {
            merged.tracking_number = prev.tracking_number;
        }

        if (!hasProofMeta(order)) {
            merged.proof_mockup_key = prev.proof_mockup_key;
            merged.proof_file_key = prev.proof_file_key;
        }

        return merged;
    };

    const normalizeText = (v) => {
        const s = String(v ?? "").trim();
        return s ? s : "";
    };

    const normalizeLower = (v) => normalizeText(v).toLowerCase();

    const hashText = (value) => {
        const s = normalizeText(value);
        let h = 5381;
        for (let i = 0; i < s.length; i += 1) {
            h = ((h << 5) + h) ^ s.charCodeAt(i);
        }
        return (h >>> 0).toString(36);
    };

    const normalizeProofFileKeyPart = (value) => {
        const raw = normalizeText(value);
        if (!raw) return "";

        if (/^data:/i.test(raw) || /^blob:/i.test(raw)) return raw;

        try {
            const url = new URL(raw, window.location.origin);
            return `${url.origin}${url.pathname}`;
        } catch {
            return raw.split("#")[0].split("?")[0];
        }
    };

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

    const getProofFileKey = (order) => {
        const items = Array.isArray(order?.items) ? order.items : [];
        const keys = [];
        for (const it of items) {
            const dp = it?.design_proof && typeof it.design_proof === "object" ? it.design_proof : null;
            const url = normalizeProofFileKeyPart(dp?.mockup_data_url);
            if (url) {
                const itemId = it?.id != null ? String(it.id) : "?";
                const version = normalizeText(dp?.version_number);
                keys.push(`${itemId}:${version}:${url}`);
            }
        }

        const metaProof = order?.meta?.proof && typeof order.meta.proof === "object" ? order.meta.proof : null;
        const metaUrl = normalizeProofFileKeyPart(metaProof?.mockup_data_url);
        if (metaUrl) {
            const version = normalizeText(metaProof?.version_number);
            keys.push(`meta:${version}:${metaUrl}`);
        }

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
            proof_file_key: getProofFileKey(order),
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
            shown: false,
            event_type: "status_change",
            summary_qty: summary.qty,
            summary_label: summary.label,
        };
    };

    const makeEventNotification = ({ orderId, atIso, order, eventType, message, toStatus, signalKey }) => {
        const at = atIso || new Date().toISOString();
        const eventName = String(eventType || "event");
        const stableSignal = normalizeText(signalKey);
        const id = stableSignal ? `${orderId}:${eventName}:${hashText(stableSignal)}` : `${orderId}:${eventName}:${at}`;
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
            shown: false,
            event_type: eventName,
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
            const mergedSignals = mergeSignals(prevSignals, nextSignals, order);
            nextStateMap[orderId] = mergedSignals;

            if (!hadAnyPrev) {
                // First run: establish baseline, but still emit critical "current state" notifications
                // so users are informed even if they open Notifications late.
                if (mergedSignals.receipt_status === "rejected") {
                    const reason = normalizeText(nextSignals.receipt_rejection_reason);
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "receipt_rejected",
                            message: `Admin requested a new downpayment receipt. Please upload a new receipt screenshot.${reason ? ` Reason: ${reason}` : ""}`,
                            toStatus: order?.status,
                            signalKey: `receipt:${mergedSignals.receipt_status}:${reason}`,
                        }),
                    );
                }
                if (mergedSignals.final_receipt_status === "rejected") {
                    const reason = normalizeText(nextSignals.final_receipt_rejection_reason);
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "final_receipt_rejected",
                            message: `Admin requested a new final payment receipt. Please upload a new receipt screenshot.${reason ? ` Reason: ${reason}` : ""}`,
                            toStatus: order?.status,
                            signalKey: `final-receipt:${mergedSignals.final_receipt_status}:${reason}`,
                        }),
                    );
                }
                if (String(mergedSignals.proof_mockup_key || "")) {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "mockup_sent",
                            message: "Admin sent a design mockup. Please review it on the order tracking page.",
                            toStatus: order?.status,
                            signalKey: mergedSignals.proof_file_key || mergedSignals.proof_mockup_key,
                        }),
                    );
                }
                if (mergedSignals.tracking_number) {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "tracking_updated",
                            message: `Tracking number available: ${mergedSignals.tracking_number}.`,
                            toStatus: order?.status,
                            signalKey: mergedSignals.tracking_number,
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
                const fromWf = getWorkflowDisplay(prev);
                if (toWf === "Proofing") {
                    n.message = hasAnyMockup(order)
                        ? "Admin sent a design mockup. Please review it on the order tracking page."
                        : "Your payment was verified. Your order is now in proofing. Please wait for admin to upload the mockup.";
                } else if (fromWf === "Proofing" && toWf === "In Progress") {
                    n.message = `Order #${orderId} proofing is complete. Your order is now in production.`;
                }
                newItems.push(n);
            }

            // Extra event notifications (admin actions + non-status signals).
            if (prevSignals) {
                const prevReceipt = normalizeLower(prevSignals.receipt_status);
                const nextReceipt = normalizeLower(mergedSignals.receipt_status);
                const prevFinalReceipt = normalizeLower(prevSignals.final_receipt_status);
                const nextFinalReceipt = normalizeLower(mergedSignals.final_receipt_status);

                const prevReceiptVerified = String(prevSignals.receipt_verified || "0");
                const nextReceiptVerified = String(mergedSignals.receipt_verified || "0");
                const prevFinalReceiptVerified = String(prevSignals.final_receipt_verified || "0");
                const nextFinalReceiptVerified = String(mergedSignals.final_receipt_verified || "0");
                const prevProofFileKey = normalizeText(prevSignals.proof_file_key);
                const nextProofFileKey = normalizeText(mergedSignals.proof_file_key);

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
                            signalKey: nextSignals.receipt_url,
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
                            signalKey: nextSignals.final_receipt_url,
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
                            signalKey: `receipt:${nextReceipt}:${reason}`,
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
                            signalKey: `final-receipt:${nextFinalReceipt}:${reason}`,
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
                            signalKey: `receipt:${nextReceiptVerified}:${mergedSignals.receipt_url}`,
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
                            signalKey: `final-receipt:${nextFinalReceiptVerified}:${mergedSignals.final_receipt_url}`,
                        }),
                    );
                }

                // Mockup/proof sent (admin action).
                if (!String(prevSignals.proof_mockup_key || "") && String(mergedSignals.proof_mockup_key || "")) {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "mockup_sent",
                            message: "Admin sent a design mockup. Please review it on the order tracking page.",
                            toStatus: order?.status,
                            signalKey: mergedSignals.proof_file_key || mergedSignals.proof_mockup_key,
                        }),
                    );
                }
                if (prevProofFileKey && nextProofFileKey && prevProofFileKey !== nextProofFileKey) {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "mockup_updated",
                            message: "Admin sent an updated design mockup. Please review the new proof on the order tracking page.",
                            toStatus: order?.status,
                            signalKey: nextProofFileKey,
                        }),
                    );
                }

                // Tracking number set/updated.
                if (normalizeText(prevSignals.tracking_number) !== normalizeText(mergedSignals.tracking_number) && mergedSignals.tracking_number) {
                    newItems.push(
                        makeEventNotification({
                            orderId,
                            order,
                            eventType: "tracking_updated",
                            message: `Tracking number updated: ${mergedSignals.tracking_number}.`,
                            toStatus: order?.status,
                            signalKey: mergedSignals.tracking_number,
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

    const markShown = (id) => {
        const target = String(id || "").trim();
        if (!target) return;
        const list = loadNotifications();
        let changed = false;
        const next = list.map((n) => {
            if (String(n.id) !== target) return n;
            if (n.shown) return n;
            changed = true;
            return { ...n, shown: true };
        });
        if (!changed) return;
        saveNotifications(next);
        emitUpdated();
    };

    const clearAll = () => {
        saveNotifications([]);
        emitUpdated();
    };

    // Fallback for environments where ui-dialog.js isn't available (or fails to load).
    // Avoid using browser alert() so we don't show the native "<site> says" popup.
    let fallbackCleanup = null;
    const fallbackAlert = (message, opts = {}) => {
        try {
            if (typeof fallbackCleanup === "function") fallbackCleanup();
        } catch {
            // ignore
        }

        const safeTitle = String(opts.title || "Notice").trim() || "Notice";
        const safeTone = String(opts.tone || "info").trim() || "info"; // info | success | warning | danger
        const safeMessage = String(message || "").trim();

        const backdrop = document.createElement("div");
        backdrop.className = "av-dialog-backdrop";

        const dialog = document.createElement("div");
        dialog.className = `av-dialog av-dialog--${safeTone}`;
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "av-dialog-close";
        closeBtn.setAttribute("aria-label", "Close");
        closeBtn.textContent = "×";

        const icon = document.createElement("div");
        icon.className = "av-dialog-icon";
        icon.setAttribute("aria-hidden", "true");
        // simple info icon (matches theme styling)
        icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path></svg>';

        const titleEl = document.createElement("div");
        titleEl.className = "av-dialog-title";
        titleEl.textContent = safeTitle;

        const descEl = document.createElement("div");
        descEl.className = "av-dialog-desc";
        descEl.textContent = safeMessage;

        const actions = document.createElement("div");
        actions.className = "av-dialog-actions av-dialog-actions--alert";

        const okBtn = document.createElement("button");
        okBtn.type = "button";
        okBtn.className = "av-dialog-btn av-dialog-btn--primary";
        okBtn.textContent = "OK";

        actions.appendChild(okBtn);
        dialog.appendChild(closeBtn);
        dialog.appendChild(icon);
        dialog.appendChild(titleEl);
        dialog.appendChild(descEl);
        dialog.appendChild(actions);
        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);

        let resolver = null;
        const p = new Promise((resolve) => {
            resolver = resolve;
        });

        const cleanup = () => {
            window.removeEventListener("keydown", onKeyDown, true);
            backdrop.removeEventListener("click", onBackdropClick);
            okBtn.removeEventListener("click", onOk);
            closeBtn.removeEventListener("click", onOk);
            backdrop.remove();
        };

        const close = () => {
            cleanup();
            if (fallbackCleanup === cleanup) fallbackCleanup = null;
            try {
                resolver?.(true);
            } catch {
                // ignore
            }
        };

        const onOk = () => close();
        const onBackdropClick = (e) => {
            if (e.target !== backdrop) return;
            close();
        };
        const onKeyDown = (e) => {
            if (e.key === "Escape" || e.key === "Enter") {
                close();
            }
        };

        fallbackCleanup = cleanup;
        okBtn.addEventListener("click", onOk);
        closeBtn.addEventListener("click", onOk);
        backdrop.addEventListener("click", onBackdropClick);
        window.addEventListener("keydown", onKeyDown, true);
        setTimeout(() => okBtn.focus(), 0);

        return p;
    };

    const showPopups = async (notifications) => {
        const list = Array.isArray(notifications) ? notifications : [];
        if (list.length === 0) return;

        // Only show each notification once.
        const stored = loadNotifications();
        const storedById = new Map(stored.map((n) => [String(n.id), n]));
        const toShow = list.filter((n) => !storedById.get(String(n?.id || ""))?.shown);
        if (toShow.length === 0) return;

        for (const n of toShow) {
            const orderLabel = n?.order_id ? `Order #${n.order_id}` : "Your order";
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
                await fallbackAlert(message, { title: "Order Update", tone });
            }

            markShown(n?.id);
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
        clearAll,
        UPDATED_EVENT,
        formatWhen,
        getWorkflowDisplay,
    };
})();

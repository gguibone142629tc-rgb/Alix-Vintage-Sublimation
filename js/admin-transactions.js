(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);
    const bodyEl = qs("#transactionsBody");

    const escapeHtml = (s) =>
        String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const formatMoney = (value) => `P${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getApiBaseUrl = () => {
        if (window.AlixAuth && typeof window.AlixAuth.apiBaseUrl === "function") {
            return window.AlixAuth.apiBaseUrl();
        }
        const origin = window.location && window.location.origin ? window.location.origin : "";
        if (origin && origin !== "null") return origin;
        return "http://localhost:8000";
    };

    const getAdminApiKey = () => {
        const key = localStorage.getItem("alix_admin_api_key");
        return key && String(key).trim() ? String(key).trim() : null;
    };

    const fetchTransactions = async () => {
        const headers = { Accept: "application/json" };
        const key = getAdminApiKey();
        if (key) headers["X-Admin-Api-Key"] = key;

        const res = await fetch(getApiBaseUrl() + "/api/admin/transactions?limit=200&offset=0", {
            method: "GET",
            headers,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = typeof data.error === "string" ? data.error : "Failed to load transactions";
            throw new Error(msg);
        }

        return Array.isArray(data.transactions) ? data.transactions : [];
    };

    const render = (rows) => {
        if (!bodyEl) return;

        if (!Array.isArray(rows) || rows.length === 0) {
            bodyEl.innerHTML = '<tr><td colspan="8">No transactions yet.</td></tr>';
            return;
        }

        bodyEl.innerHTML = rows
            .map((t) => {
                const paymentId = t.payment_id != null ? String(t.payment_id) : "-";
                const orderId = t.order_id != null ? `ORD-${t.order_id}` : "-";
                const customer = String(t.customer_name || t.customer_email || "-");
                const method = String(t.payment_method || "-").replaceAll("_", " ");
                const type = String(t.payment_type || "-");
                const amount = formatMoney(t.amount_paid || 0);
                const verified = t.is_verified === true ? "Verified" : "Pending";
                const receiptPath = typeof t.receipt_path === "string" ? String(t.receipt_path).trim() : "";
                const receiptCell = receiptPath
                    ? `<a href="${escapeHtml(receiptPath)}" target="_blank" rel="noopener noreferrer">View</a>`
                    : "-";

                return `
                    <tr>
                        <td>${escapeHtml(paymentId)}</td>
                        <td>${escapeHtml(orderId)}</td>
                        <td>${escapeHtml(customer)}</td>
                        <td>${escapeHtml(method)}</td>
                        <td>${escapeHtml(type)}</td>
                        <td>${escapeHtml(amount)}</td>
                        <td>${escapeHtml(verified)}</td>
                        <td>${receiptCell}</td>
                    </tr>
                `;
            })
            .join("");
    };

    const renderError = (message) => {
        if (!bodyEl) return;
        bodyEl.innerHTML = `<tr><td colspan="8">${escapeHtml(message || "Failed to load transactions.")}</td></tr>`;
    };

    const start = async () => {
        try {
            const rows = await fetchTransactions();
            render(rows);
        } catch (e) {
            renderError(e?.message || "Failed to load transactions.");
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            start();
        });
    } else {
        start();
    }
})();

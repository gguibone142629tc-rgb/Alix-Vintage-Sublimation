(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);

    const state = {
        inquiriesById: new Map(),
        openId: null,
    };

    const getApiBaseUrl = () => {
        if (window.AlixAuth && typeof window.AlixAuth.apiBaseUrl === "function") {
            return window.AlixAuth.apiBaseUrl();
        }

        if (window.ALIX_API_BASE_URL) return window.ALIX_API_BASE_URL;
        const origin = window.location && window.location.origin ? window.location.origin : "";
        if (origin && origin !== "null") return origin;
        return "http://localhost:8000";
    };

    const getAdminApiKey = () => {
        const key = localStorage.getItem("alix_admin_api_key");
        return key && String(key).trim() ? String(key).trim() : null;
    };

    const escapeHtml = (s) =>
        String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const cssEscape = (s) => {
        if (window.CSS && typeof window.CSS.escape === "function") {
            return window.CSS.escape(String(s));
        }
        return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
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

    const requestJson = async (method, path, body) => {
        const headers = { Accept: "application/json" };
        const key = getAdminApiKey();
        if (key) headers["X-Admin-Api-Key"] = key;
        if (method !== "GET") headers["Content-Type"] = "application/json";

        const res = await fetch(getApiBaseUrl() + path, {
            method,
            headers,
            body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
        });

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

    const render = (inquiries) => {
        const tbody = qs("#messagesTable tbody");
        if (!tbody) return;

        const list = Array.isArray(inquiries) ? inquiries : [];
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7">No messages yet.</td></tr>`;
            return;
        }

        state.inquiriesById.clear();
        list.forEach((m) => {
            const id = m && m.inquiry_id != null ? String(m.inquiry_id) : null;
            if (!id) return;
            state.inquiriesById.set(id, m);
        });

        tbody.innerHTML = list
            .map((m) => {
                const rowId = m && m.inquiry_id != null ? String(m.inquiry_id) : "";
                const phone = m.phone == null ? "-" : String(m.phone).trim() || "-";
                const msg = String(m.message || "").trim();

                return `
                    <tr data-row-id="${escapeHtml(rowId)}">
                        <td>${escapeHtml(formatDateTime(m.created_at))}</td>
                        <td>${escapeHtml(m.name || "-")}</td>
                        <td>${escapeHtml(m.email || "-")}</td>
                        <td>${escapeHtml(phone)}</td>
                        <td>${escapeHtml(m.topic || "-")}</td>
                        <td>${escapeHtml(msg || "-")}</td>
                        <td><button type="button" class="table-btn" data-view-id="${escapeHtml(rowId)}">View</button></td>
                    </tr>
                `;
            })
            .join("");
    };

    const closeOpenDetails = () => {
        const tbody = qs("#messagesTable tbody");
        if (!tbody) return;

        const openRow = tbody.querySelector("tr.message-details-row");
        if (openRow) openRow.remove();
        state.openId = null;
    };

    const toggleDetails = (clickedRow, id) => {
        const tbody = qs("#messagesTable tbody");
        if (!tbody || !clickedRow) return;

        if (!id) return;

        if (state.openId && state.openId === id) {
            closeOpenDetails();
            return;
        }

        closeOpenDetails();

        const inquiry = state.inquiriesById.get(id);
        const fullMessage = String(inquiry?.message || "").trim() || "-";
        const email = String(inquiry?.email || "").trim();
        const topic = String(inquiry?.topic || "").trim();
        const topicHtml = topic ? ` • Topic: <span class="message-reply-topic">${escapeHtml(topic)}</span>` : "";

        const detailsRow = document.createElement("tr");
        detailsRow.className = "message-details-row";
        detailsRow.setAttribute("data-details-id", id);
        detailsRow.innerHTML = `
            <td colspan="7">
                <div class="message-details-box">
                    <div class="message-details-title">Full message</div>
                    <div class="message-details-text">${escapeHtml(fullMessage)}</div>

                    <div class="message-reply">
                        <div class="message-details-title">Reply</div>
                        <div class="message-reply-meta">To: <span class="message-reply-email">${escapeHtml(email || "-")}</span>${topicHtml}</div>
                        <textarea class="message-reply-input" rows="4" placeholder="Type your reply..."></textarea>
                        <div class="message-reply-actions">
                            <button type="button" class="table-btn" data-reply-send-id="${escapeHtml(id)}" ${email ? "" : "disabled"}>Send Reply</button>
                            <div class="message-reply-status" aria-live="polite"></div>
                        </div>
                    </div>
                </div>
            </td>
        `;

        clickedRow.insertAdjacentElement("afterend", detailsRow);
        state.openId = id;
    };

    const wireRowActions = () => {
        const tbody = qs("#messagesTable tbody");
        if (!tbody) return;

        tbody.addEventListener("click", async (e) => {
            const viewBtn = e.target && e.target.closest ? e.target.closest("[data-view-id]") : null;
            if (viewBtn) {
                const id = String(viewBtn.getAttribute("data-view-id") || "").trim();
                const row = viewBtn.closest("tr");
                if (!row) return;
                toggleDetails(row, id);
                return;
            }

            const replyBtn = e.target && e.target.closest ? e.target.closest("[data-reply-send-id]") : null;
            if (!replyBtn) return;

            const id = String(replyBtn.getAttribute("data-reply-send-id") || "").trim();
            if (!id) return;

            const detailsRow = tbody.querySelector('tr.message-details-row[data-details-id="' + cssEscape(id) + '"]');
            if (!detailsRow) return;

            const input = detailsRow.querySelector(".message-reply-input");
            const status = detailsRow.querySelector(".message-reply-status");
            const message = String(input && input.value ? input.value : "").trim();

            if (!message) {
                if (status) {
                    status.classList.add("message-reply-status--error");
                    status.textContent = "Type a reply message first.";
                }
                return;
            }

            replyBtn.disabled = true;
            if (status) {
                status.classList.remove("message-reply-status--error");
                status.textContent = "Sending...";
            }

            try {
                const res = await requestJson("POST", "/api/admin/contact-inquiries/reply", {
                    inquiry_id: Number(id),
                    reply_message: message,
                });

                if (status) {
                    status.classList.remove("message-reply-status--error");
                    if (res && res.sent === false) {
                        status.textContent = `Reply saved (email not sent): ${String(res.warning || "")}`.trim();
                    } else {
                        status.textContent = "Reply sent.";
                    }
                }

                if (input) input.value = "";
            } catch (err) {
                if (status) {
                    status.classList.add("message-reply-status--error");
                    status.textContent = err && err.message ? String(err.message) : "Failed to send reply.";
                }
            } finally {
                replyBtn.disabled = false;
            }
        });
    };

    const start = async () => {
        wireRowActions();
        try {
            const data = await fetchJson("/api/admin/contact-inquiries?limit=100&offset=0");
            render(data?.inquiries);
        } catch {
            render([]);
        }
    };

    start();
})();

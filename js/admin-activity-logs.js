(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);

    const state = {
        limit: 50,
        offset: 0,
        isLoading: false,
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

    const render = (payload) => {
        const tbody = qs("#activityLogsBody");
        const meta = qs("#activityLogsMeta");
        if (!tbody) return;

        const list = Array.isArray(payload?.logs) ? payload.logs : [];

        if (meta) {
            const limit = Number(payload?.limit ?? state.limit);
            const offset = Number(payload?.offset ?? state.offset);
            meta.textContent = `Showing ${list.length} logs (offset ${offset}, limit ${limit})`;
        }

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">No activity logs yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = list
            .map((l) => {
                const createdAt = formatDateTime(l?.created_at);
                const role = escapeHtml(l?.actor_role ?? "-");
                const actor = l?.actor_user_id != null ? `#${escapeHtml(l.actor_user_id)}` : "-";
                const action = escapeHtml(l?.action ?? "");
                const description = escapeHtml(l?.description ?? "");
                const ip = escapeHtml(l?.ip_address ?? "-");

                return `
                    <tr>
                        <td>${createdAt}</td>
                        <td>${role}</td>
                        <td>${actor}</td>
                        <td>${action}</td>
                        <td>${description}</td>
                        <td>${ip}</td>
                    </tr>
                `;
            })
            .join("");
    };

    const setLoading = (isLoading) => {
        state.isLoading = isLoading;
        const refreshBtn = qs("#refreshLogsBtn");
        const prevBtn = qs("#prevLogsBtn");
        const nextBtn = qs("#nextLogsBtn");

        if (refreshBtn) refreshBtn.disabled = isLoading;
        if (prevBtn) prevBtn.disabled = isLoading || state.offset <= 0;
        if (nextBtn) nextBtn.disabled = isLoading;
    };

    const load = async () => {
        if (state.isLoading) return;

        setLoading(true);
        try {
            const payload = await fetchJson(`/api/admin/activity-logs?limit=${state.limit}&offset=${state.offset}`);
            render(payload);
        } catch (err) {
            const tbody = qs("#activityLogsBody");
            if (tbody) {
                const msg = err && err.message ? String(err.message) : "Request failed";
                tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(msg)}</td></tr>`;
            }
        } finally {
            setLoading(false);
        }
    };

    const bind = () => {
        const refreshBtn = qs("#refreshLogsBtn");
        const prevBtn = qs("#prevLogsBtn");
        const nextBtn = qs("#nextLogsBtn");

        if (refreshBtn) {
            refreshBtn.addEventListener("click", () => load());
        }

        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                state.offset = Math.max(0, state.offset - state.limit);
                load();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                state.offset = state.offset + state.limit;
                load();
            });
        }
    };

    bind();
    load();
})();

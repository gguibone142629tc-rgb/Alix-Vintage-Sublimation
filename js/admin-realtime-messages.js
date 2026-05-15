(function () {
    "use strict";

    const STORAGE_LAST_SEEN_ID = "alix_admin_messages_last_seen_id";
    const STORAGE_LAST_COUNT = "alix_admin_messages_last_seen_count";

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

    const isMessagesPage = () => /\/admin-messages\.html$/i.test(window.location.pathname);

    const getLastSeenId = () => {
        const raw = Number(localStorage.getItem(STORAGE_LAST_SEEN_ID) || 0);
        return Number.isFinite(raw) && raw > 0 ? raw : 0;
    };

    const resetLastSeen = () => {
        try {
            localStorage.removeItem(STORAGE_LAST_SEEN_ID);
            localStorage.removeItem(STORAGE_LAST_COUNT);
        } catch {
            // ignore
        }
    };

    const setLastSeenId = (id) => {
        if (!Number.isFinite(id) || id <= 0) return;
        localStorage.setItem(STORAGE_LAST_SEEN_ID, String(Math.floor(id)));
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

    const ensureBadgeEl = () => {
        const btn = document.querySelector('.topbar-right .icon-btn[aria-label="Messages"]');
        if (!btn) return null;

        // Reuse any existing badge (some pages previously hard-coded a number).
        let badge = btn.querySelector('.badge[data-role="messages-badge"]') || btn.querySelector('.badge');
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "badge";
            badge.setAttribute("aria-label", "0 messages");
            badge.textContent = "";
            btn.appendChild(badge);
        }

        badge.setAttribute("data-role", "messages-badge");

        return badge;
    };

    const setBadgeCount = (count) => {
        const badge = ensureBadgeEl();
        if (!badge) return;

        const n = Number(count || 0);
        if (!Number.isFinite(n) || n <= 0) {
            badge.style.display = "none";
            badge.textContent = "";
            badge.setAttribute("aria-label", "0 messages");
            return;
        }

        badge.style.display = "grid";
        badge.textContent = n > 99 ? "99+" : String(n);
        badge.setAttribute("aria-label", `${n} new messages`);
    };

    const computeNewCount = (inquiries, lastSeenId) => {
        const list = Array.isArray(inquiries) ? inquiries : [];
        let count = 0;
        let maxId = lastSeenId;

        for (const item of list) {
            const id = Number(item?.inquiry_id || 0);
            if (Number.isFinite(id) && id > maxId) {
                maxId = id;
            }
            if (Number.isFinite(id) && id > lastSeenId) {
                count += 1;
            }
        }

        return { count, maxId };
    };

    const refresh = async () => {
        // Pull latest inquiries (max 200 as enforced by API).
        const data = await fetchJson("/api/admin/contact-inquiries?limit=200&offset=0");
        const inquiries = data?.inquiries;

        // If browser has an old last-seen id from the previous storage
        // (when inquiries lived in a different table), ids may have reset.
        // In that case, clear cached values so the badge can work again.
        const storedLastSeenId = getLastSeenId();
        const { maxId: currentMaxId } = computeNewCount(inquiries, 0);
        let lastSeenId = storedLastSeenId;
        if (currentMaxId > 0 && storedLastSeenId > currentMaxId) {
            resetLastSeen();
            lastSeenId = 0;
        }

        const { count, maxId } = computeNewCount(inquiries, lastSeenId);

        if (isMessagesPage()) {
            // Visiting the messages page is considered "reading".
            if (Number.isFinite(maxId) && maxId > 0) {
                setLastSeenId(maxId);
            }
            setBadgeCount(0);

            try {
                if (window.AlixAdminMessages && typeof window.AlixAdminMessages.refresh === "function") {
                    window.AlixAdminMessages.refresh(inquiries);
                }
            } catch {
                // ignore
            }

            return;
        }

        setBadgeCount(count);
        localStorage.setItem(STORAGE_LAST_COUNT, String(count));
    };

    const start = () => {
        // Hide badge quickly based on cached count until first network call.
        const cachedCount = Number(localStorage.getItem(STORAGE_LAST_COUNT) || 0);
        if (!isMessagesPage() && Number.isFinite(cachedCount) && cachedCount > 0) {
            setBadgeCount(cachedCount);
        } else {
            setBadgeCount(0);
        }

        let stopped = false;

        const tick = async () => {
            if (stopped) return;
            try {
                await refresh();
            } catch {
                // ignore transient errors
            }
        };

        tick();

        const intervalMs = 8000;
        const intervalId = window.setInterval(tick, intervalMs);

        const messagesBtn = document.querySelector('.topbar-right .icon-btn[aria-label="Messages"]');
        if (messagesBtn) {
            messagesBtn.addEventListener('click', () => {
                // Prevent stale badge from sticking between navigations.
                localStorage.setItem(STORAGE_LAST_COUNT, '0');
                setBadgeCount(0);
            });
        }

        window.addEventListener("beforeunload", () => {
            stopped = true;
            window.clearInterval(intervalId);
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();


(function () {
    const STORAGE_TOKEN_KEY = "alix_auth_token";
    const STORAGE_USER_KEY = "alix_auth_user";

    function getApiBaseUrl() {
        if (window.ALIX_API_BASE_URL) {
            return window.ALIX_API_BASE_URL;
        }

        // If served via the PHP router (or any web server), prefer same-origin so
        // /api/* can be proxied by router.php. When opened via file://, origin is "null".
        const origin = window.location && window.location.origin ? window.location.origin : "";
        if (origin && origin !== "null") {
            return origin;
        }

        return "http://localhost:8000";
    }

    function safeJsonParse(value) {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }

    function base64UrlDecode(value) {
        const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
        const decoded = atob(padded);
        return decodeURIComponent(
            decoded
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
    }

    function decodeJwtPayload(token) {
        if (!token || typeof token !== "string") {
            return null;
        }

        const parts = token.split(".");
        if (parts.length !== 3) {
            return null;
        }

        try {
            return safeJsonParse(base64UrlDecode(parts[1]));
        } catch {
            return null;
        }
    }

    function isTokenValid(token) {
        const payload = decodeJwtPayload(token);
        if (!payload || typeof payload.exp !== "number") {
            return Boolean(token);
        }

        return Date.now() < payload.exp * 1000;
    }

    function getToken() {
        return localStorage.getItem(STORAGE_TOKEN_KEY);
    }

    function getUser() {
        const raw = localStorage.getItem(STORAGE_USER_KEY);
        if (!raw) {
            return null;
        }
        return safeJsonParse(raw);
    }

    function setSession(token, user) {
        if (token) {
            localStorage.setItem(STORAGE_TOKEN_KEY, token);
        }
        if (user) {
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
        }

        // Backward compatibility with older nav logic.
        localStorage.setItem("alix_is_logged_in", "true");
        localStorage.setItem("alix_logged_in_at", String(Date.now()));
    }

    function clearSession() {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
        localStorage.removeItem("alix_is_logged_in");
        localStorage.removeItem("alix_logged_in_at");
    }

    async function postJson(path, body) {
        const response = await fetch(getApiBaseUrl() + path, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMessage = typeof data.error === "string" ? data.error : "Request failed";
            const error = new Error(errorMessage);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    window.AlixAuth = {
        apiBaseUrl: getApiBaseUrl,
        postJson,
        setSession,
        clearSession,
        getToken,
        getUser,
        isTokenValid,
        decodeJwtPayload,
    };
})();

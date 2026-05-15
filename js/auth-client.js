(function () {
    const STORAGE_TOKEN_KEY = "alix_auth_token";
    const STORAGE_USER_KEY = "alix_auth_user";
    const STORAGE_LOGIN_KEY = "alix_is_logged_in";
    const STORAGE_LOGIN_AT_KEY = "alix_logged_in_at";

    function safeGet(storage, key) {
        try {
            return storage.getItem(key);
        } catch {
            return null;
        }
    }

    function safeSet(storage, key, value) {
        try {
            storage.setItem(key, value);
        } catch {
            // ignore
        }
    }

    function safeRemove(storage, key) {
        try {
            storage.removeItem(key);
        } catch {
            // ignore
        }
    }

    function getFromAnyStorage(key) {
        const sessionValue = safeGet(sessionStorage, key);
        if (sessionValue != null) {
            return sessionValue;
        }
        return safeGet(localStorage, key);
    }

    function removeFromAllStorages(key) {
        safeRemove(sessionStorage, key);
        safeRemove(localStorage, key);
    }

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

        // Deployment-safe fallback: rely on relative /api paths.
        return "";
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
        return getFromAnyStorage(STORAGE_TOKEN_KEY);
    }

    function getUser() {
        const raw = getFromAnyStorage(STORAGE_USER_KEY);
        if (!raw) {
            return null;
        }
        return safeJsonParse(raw);
    }

    function setSession(token, user, options) {
        let targetStorage = localStorage;
        const otherStorage = sessionStorage;

        if (token) {
            safeSet(targetStorage, STORAGE_TOKEN_KEY, token);
            safeRemove(otherStorage, STORAGE_TOKEN_KEY);
        }
        if (user) {
            safeSet(targetStorage, STORAGE_USER_KEY, JSON.stringify(user));
            safeRemove(otherStorage, STORAGE_USER_KEY);
        }

        // Backward compatibility with older nav logic.
        if (token) {
            safeSet(targetStorage, STORAGE_LOGIN_KEY, "true");
            safeSet(targetStorage, STORAGE_LOGIN_AT_KEY, String(Date.now()));
            safeRemove(otherStorage, STORAGE_LOGIN_KEY);
            safeRemove(otherStorage, STORAGE_LOGIN_AT_KEY);
        }
    }

    function clearSession() {
        removeFromAllStorages(STORAGE_TOKEN_KEY);
        removeFromAllStorages(STORAGE_USER_KEY);
        removeFromAllStorages(STORAGE_LOGIN_KEY);
        removeFromAllStorages(STORAGE_LOGIN_AT_KEY);
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

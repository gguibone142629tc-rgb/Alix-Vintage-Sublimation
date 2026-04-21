(function () {
    "use strict";

    function getApiBaseUrl() {
        if (window.AlixAuth && typeof window.AlixAuth.apiBaseUrl === "function") {
            return window.AlixAuth.apiBaseUrl();
        }

        const origin = window.location && window.location.origin ? window.location.origin : "";
        if (origin && origin !== "null") {
            return origin;
        }

        return "";
    }

    function getToken() {
        if (window.AlixAuth && typeof window.AlixAuth.getToken === "function") {
            return window.AlixAuth.getToken();
        }
        return localStorage.getItem("alix_auth_token");
    }

    async function requestJson(path, options) {
        const token = getToken();
        if (!token) {
            const err = new Error("Login required");
            err.status = 401;
            throw err;
        }

        const method = (options && options.method) || "GET";
        const body = options && "body" in options ? options.body : undefined;

        const response = await fetch(getApiBaseUrl() + path, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const debugMessage = data && data.details && typeof data.details.message === "string" ? data.details.message : null;
            const message = debugMessage || (typeof data.error === "string" ? data.error : "Request failed");
            const error = new Error(message);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    const getCart = () => requestJson("/api/cart", { method: "GET" });

    const addItem = (payload) => requestJson("/api/cart/items", { method: "POST", body: payload || {} });

    const removeItem = (cartItemId) =>
        requestJson("/api/cart/items", { method: "DELETE", body: { cart_item_id: cartItemId } });

    const updateItemQuantity = (cartItemId, quantity) =>
        requestJson("/api/cart/items", { method: "PATCH", body: { cart_item_id: cartItemId, quantity } });

    const clearCart = () => requestJson("/api/cart", { method: "DELETE" });

    const checkout = (payload) => requestJson("/api/cart/checkout", { method: "POST", body: payload || {} });

    const listOrders = (params) => {
        const limit = params && params.limit ? Number(params.limit) : 50;
        const offset = params && params.offset ? Number(params.offset) : 0;
        const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) }).toString();
        return requestJson(`/api/orders?${qs}`, { method: "GET" });
    };

    const uploadOrderReceipt = (payload) =>
        requestJson("/api/orders/receipt", { method: "POST", body: payload || {} });

    const respondOrderProof = (payload) =>
        requestJson("/api/orders/proof/respond", { method: "PATCH", body: payload || {} });

    const addOrderComment = (payload) =>
        requestJson("/api/orders/comments", { method: "POST", body: payload || {} });

    window.AlixCart = {
        getCart,
        addItem,
        removeItem,
        updateItemQuantity,
        clearCart,
        checkout,
        listOrders,
        uploadOrderReceipt,
        respondOrderProof,
        addOrderComment,
    };
})();

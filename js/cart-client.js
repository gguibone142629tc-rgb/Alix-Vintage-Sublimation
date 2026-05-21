(function () {
    "use strict";

    const CART_HAS_ITEMS_KEY = "alix_cart_has_items_v1";
    const CART_HAS_ITEMS_AT_KEY = "alix_cart_has_items_at_v1";
    const CART_UPDATED_EVENT = "alix:cart-updated";

    const setCartHasItemsCache = (hasItems) => {
        try {
            localStorage.setItem(CART_HAS_ITEMS_KEY, hasItems ? "1" : "0");
            localStorage.setItem(CART_HAS_ITEMS_AT_KEY, String(Date.now()));
        } catch {
            // ignore
        }
    };

    const emitCartUpdated = (hasItems) => {
        try {
            window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: { hasItems: Boolean(hasItems) } }));
        } catch {
            // ignore
        }
    };

    const extractHasItems = (cartEnvelope) => {
        const cart = cartEnvelope?.cart && typeof cartEnvelope.cart === "object" ? cartEnvelope.cart : cartEnvelope;
        const items = Array.isArray(cart?.items) ? cart.items : [];
        return items.length > 0;
    };

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
        try {
            return sessionStorage.getItem("alix_auth_token") || localStorage.getItem("alix_auth_token");
        } catch {
            return localStorage.getItem("alix_auth_token");
        }
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

    const getCartRaw = () => requestJson("/api/cart", { method: "GET" });

    const addItemRaw = (payload) => requestJson("/api/cart/items", { method: "POST", body: payload || {} });

    const removeItemRaw = (cartItemId) =>
        requestJson("/api/cart/items", { method: "DELETE", body: { cart_item_id: cartItemId } });

    const updateItemQuantityRaw = (cartItemId, quantity) =>
        requestJson("/api/cart/items", { method: "PATCH", body: { cart_item_id: cartItemId, quantity } });

    const clearCartRaw = () => requestJson("/api/cart", { method: "DELETE" });

    const checkoutRaw = (payload) => requestJson("/api/cart/checkout", { method: "POST", body: payload || {} });

    const getCart = async () => {
        const data = await getCartRaw();
        const hasItems = extractHasItems(data);
        setCartHasItemsCache(hasItems);
        emitCartUpdated(hasItems);
        return data;
    };

    const addItem = async (payload) => {
        const data = await addItemRaw(payload);
        setCartHasItemsCache(true);
        emitCartUpdated(true);
        return data;
    };

    const removeItem = async (cartItemId) => {
        const data = await removeItemRaw(cartItemId);
        try {
            await getCart();
        } catch {
            // ignore
        }
        return data;
    };

    const updateItemQuantity = async (cartItemId, quantity) => {
        const data = await updateItemQuantityRaw(cartItemId, quantity);
        try {
            await getCart();
        } catch {
            // ignore
        }
        return data;
    };

    const clearCart = async () => {
        const data = await clearCartRaw();
        setCartHasItemsCache(false);
        emitCartUpdated(false);
        return data;
    };

    const checkout = async (payload) => {
        const data = await checkoutRaw(payload);
        setCartHasItemsCache(false);
        emitCartUpdated(false);
        return data;
    };

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

    const cancelOrder = (orderId) =>
        requestJson("/api/orders/cancel", { method: "PATCH", body: { order_id: orderId } });

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
        cancelOrder,
        CART_UPDATED_EVENT,
    };
})();

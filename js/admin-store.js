(function () {
    "use strict";

    const ORDERS_KEY = "orders";
    const PRODUCTS_KEY = "alix_products";

    const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const safeJsonParse = (value, fallback) => {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    };

    const normalizeOrder = (order) => {
        const normalized = { ...order };

        // Customer-side pages currently use these fields.
        normalized.id = String(normalized.id || generateId("ORD"));
        normalized.date = normalized.date || new Date().toISOString();
        normalized.items = Array.isArray(normalized.items) ? normalized.items : [];
        normalized.status = normalized.status || "active"; // used by order-history.html
        normalized.total = Number.isFinite(Number(normalized.total)) ? Number(normalized.total) : 0;

        const admin = typeof normalized.admin === "object" && normalized.admin ? { ...normalized.admin } : {};
        admin.workflowStatus = admin.workflowStatus || "Pending";
        admin.stockConfirmed = Boolean(admin.stockConfirmed);
        admin.accepted = Boolean(admin.accepted);

        admin.orderType = admin.orderType || (normalized.customRequest ? "custom" : "fixed");

        const quote = typeof admin.quote === "object" && admin.quote ? { ...admin.quote } : {};
        quote.basePrice = Number.isFinite(Number(quote.basePrice)) ? Number(quote.basePrice) : null;
        quote.shippingFee = Number.isFinite(Number(quote.shippingFee)) ? Number(quote.shippingFee) : null;
        admin.quote = quote;

        const proof = typeof admin.proof === "object" && admin.proof ? { ...admin.proof } : {};
        proof.status = proof.status || "Not Sent"; // Not Sent | Sent | Approved | Revision Requested
        proof.mockupDataUrl = proof.mockupDataUrl || null;
        admin.proof = proof;

        // Customer approves the proof; once approved, production starts.
        if (admin.workflowStatus === "Proofing" && proof.status === "Approved") {
            admin.workflowStatus = "In Progress";
        }

        const payment = typeof admin.payment === "object" && admin.payment ? { ...admin.payment } : {};
        payment.method = payment.method || "GCash"; // GCash | COD
        payment.receiptDataUrl = payment.receiptDataUrl || null;
        const receiptMeta = typeof payment.receiptMeta === "object" && payment.receiptMeta ? { ...payment.receiptMeta } : {};
        receiptMeta.fileName = receiptMeta.fileName || null;
        receiptMeta.uploadedAt = receiptMeta.uploadedAt || null;
        payment.receiptMeta = receiptMeta;
        payment.verifiedType = payment.verifiedType || null; // full | downpayment
        payment.verified = Boolean(payment.verified);
        admin.payment = payment;

        admin.trackingNumber = admin.trackingNumber || "";

        admin.comments = Array.isArray(admin.comments) ? admin.comments : [];

        normalized.admin = admin;
        return normalized;
    };

    const getOrders = () => {
        const raw = safeJsonParse(localStorage.getItem(ORDERS_KEY), []);
        const list = Array.isArray(raw) ? raw : [];
        const normalized = list.map(normalizeOrder);

        // Persist normalization (backwards compatible) so admin fields exist.
        localStorage.setItem(ORDERS_KEY, JSON.stringify(normalized));
        return normalized;
    };

    const saveOrders = (orders) => {
        const normalized = (Array.isArray(orders) ? orders : []).map(normalizeOrder);
        localStorage.setItem(ORDERS_KEY, JSON.stringify(normalized));
        return normalized;
    };

    const getOrderById = (orderId) => getOrders().find((o) => String(o.id) === String(orderId)) || null;

    const updateOrder = (orderId, updater) => {
        const orders = getOrders();
        const index = orders.findIndex((o) => String(o.id) === String(orderId));
        if (index === -1) return null;

        const current = orders[index];
        const next = typeof updater === "function" ? updater({ ...current }) : { ...current, ...(updater || {}) };
        orders[index] = normalizeOrder(next);
        saveOrders(orders);
        return orders[index];
    };

    const getProducts = () => {
        const raw = safeJsonParse(localStorage.getItem(PRODUCTS_KEY), []);
        return Array.isArray(raw) ? raw : [];
    };

    const saveProducts = (products) => {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(Array.isArray(products) ? products : []));
    };

    const upsertProduct = (product) => {
        const products = getProducts();
        const next = { ...product };
        next.id = next.id || generateId("PROD");
        next.name = String(next.name || "").trim();
        next.category = String(next.category || "").trim();
        next.price = Number(next.price || 0);
        next.imageDataUrl = next.imageDataUrl || null;
        next.updatedAt = new Date().toISOString();
        if (!next.createdAt) next.createdAt = next.updatedAt;

        const index = products.findIndex((p) => String(p.id) === String(next.id));
        if (index >= 0) {
            products[index] = next;
        } else {
            products.unshift(next);
        }
        saveProducts(products);
        return next;
    };

    const deleteProduct = (productId) => {
        const products = getProducts().filter((p) => String(p.id) !== String(productId));
        saveProducts(products);
        return products;
    };

    const getQueryParam = (key) => {
        const url = new URL(window.location.href);
        return url.searchParams.get(key);
    };

    const makeSvgDataUrl = (title, subtitle) => {
        const t = String(title || "").slice(0, 40);
        const s = String(subtitle || "").slice(0, 60);
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
                <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stop-color="#111827"/>
                        <stop offset="1" stop-color="#374151"/>
                    </linearGradient>
                </defs>
                <rect width="900" height="520" fill="url(#g)"/>
                <rect x="32" y="32" width="836" height="456" rx="24" fill="#0b1220" opacity="0.55"/>
                <text x="60" y="140" fill="#ffffff" font-size="48" font-family="Arial, sans-serif" font-weight="700">${t}</text>
                <text x="60" y="200" fill="#d1d5db" font-size="24" font-family="Arial, sans-serif">${s}</text>
                <text x="60" y="460" fill="#9ca3af" font-size="18" font-family="Arial, sans-serif">Demo image (local only)</text>
            </svg>
        `.trim();

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };

    const seedDemoOrders = () => {
        const keep = getOrders().filter((o) => !String(o.id || "").startsWith("DEMO-"));
        const now = Date.now();
        const daysAgo = (n) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

        const demo = [
            {
                id: "DEMO-001",
                date: daysAgo(6),
                items: [{ name: "Jersey (Fixed)" }],
                total: 1800,
                status: "active",
                details: { customerName: "Juan Dela Cruz", customerMobile: "0917-000-0001", customerNumber: "10" },
                admin: {
                    orderType: "fixed",
                    workflowStatus: "Pending",
                    stockConfirmed: false,
                    accepted: false,
                    payment: { method: "GCash" },
                },
            },
            {
                id: "DEMO-002",
                date: daysAgo(5),
                items: [{ name: "Custom Sublimation (Custom)" }],
                total: 0,
                status: "active",
                customRequest: { designName: "Team Phoenix", productType: "Jersey", designType: "custom", notes: "Black/Gold theme" },
                details: { groupName: "Phoenix", customerMobile: "0917-000-0002" },
                admin: {
                    orderType: "custom",
                    workflowStatus: "Revision Requested",
                    stockConfirmed: true,
                    accepted: false,
                    quote: { basePrice: 2200, shippingFee: 150 },
                    payment: { method: "GCash" },
                    comments: [{ author: "Admin", message: "Please clarify sizes/logo placement.", at: daysAgo(5) }],
                },
            },
            {
                id: "DEMO-003",
                date: daysAgo(4),
                items: [{ name: "Jersey (Fixed)" }],
                total: 1800,
                status: "active",
                details: { customerName: "Maria Santos", customerMobile: "0917-000-0003", customerNumber: "7" },
                admin: {
                    orderType: "fixed",
                    workflowStatus: "Awaiting Payment",
                    stockConfirmed: true,
                    accepted: true,
                    payment: { method: "GCash", receiptDataUrl: null, verified: false, verifiedType: null },
                },
            },
            {
                id: "DEMO-004",
                date: daysAgo(3),
                items: [{ name: "Custom Sublimation (Custom)" }],
                total: 2350,
                status: "active",
                customRequest: { designName: "Blue Sharks", productType: "Jersey", designType: "custom" },
                details: { groupName: "Blue Sharks", customerMobile: "0917-000-0004" },
                admin: {
                    orderType: "custom",
                    workflowStatus: "Awaiting Payment",
                    stockConfirmed: true,
                    accepted: true,
                    quote: { basePrice: 2200, shippingFee: 150 },
                    payment: {
                        method: "GCash",
                        receiptDataUrl: makeSvgDataUrl("PAYMENT RECEIPT", "DEMO-004 • GCash • Pending verification"),
                        receiptMeta: { fileName: "receipt-demo-004.png", uploadedAt: daysAgo(3) },
                        verified: false,
                        verifiedType: null,
                    },
                },
            },
            {
                id: "DEMO-005",
                date: daysAgo(2),
                items: [{ name: "Jersey (Fixed)" }],
                total: 1800,
                status: "active",
                details: { customerName: "Carlo Reyes", customerMobile: "0917-000-0005", customerNumber: "23" },
                admin: {
                    orderType: "fixed",
                    workflowStatus: "Proofing",
                    stockConfirmed: true,
                    accepted: true,
                    payment: {
                        method: "COD",
                        receiptDataUrl: makeSvgDataUrl("DOWNPAYMENT RECEIPT", "DEMO-005 • COD • 50% verified"),
                        receiptMeta: { fileName: "receipt-demo-005.png", uploadedAt: daysAgo(2) },
                        verified: true,
                        verifiedType: "downpayment",
                    },
                    proof: { status: "Not Sent", mockupDataUrl: null },
                },
            },
            {
                id: "DEMO-006",
                date: daysAgo(2),
                items: [{ name: "Custom Sublimation (Custom)" }],
                total: 2350,
                status: "active",
                customRequest: { designName: "Red Falcons", productType: "Jersey", designType: "custom" },
                details: { groupName: "Red Falcons", customerMobile: "0917-000-0006" },
                admin: {
                    orderType: "custom",
                    workflowStatus: "Proofing",
                    stockConfirmed: true,
                    accepted: true,
                    quote: { basePrice: 2200, shippingFee: 150 },
                    payment: {
                        method: "GCash",
                        receiptDataUrl: makeSvgDataUrl("PAYMENT RECEIPT", "DEMO-006 • GCash • Full verified"),
                        receiptMeta: { fileName: "receipt-demo-006.png", uploadedAt: daysAgo(2) },
                        verified: true,
                        verifiedType: "full",
                    },
                    proof: { status: "Sent", mockupDataUrl: makeSvgDataUrl("DESIGN PROOF", "DEMO-006 • Version 1 sent") },
                },
            },
            {
                id: "DEMO-007",
                date: daysAgo(1),
                items: [{ name: "Jersey (Fixed)" }],
                total: 1800,
                status: "active",
                details: { customerName: "Ana Lim", customerMobile: "0917-000-0007", customerNumber: "3" },
                admin: {
                    orderType: "fixed",
                    workflowStatus: "Proofing",
                    stockConfirmed: true,
                    accepted: true,
                    payment: {
                        method: "GCash",
                        receiptDataUrl: makeSvgDataUrl("PAYMENT RECEIPT", "DEMO-007 • GCash • Downpayment verified"),
                        receiptMeta: { fileName: "receipt-demo-007.png", uploadedAt: daysAgo(1) },
                        verified: true,
                        verifiedType: "downpayment",
                    },
                    proof: { status: "Revision Requested", mockupDataUrl: makeSvgDataUrl("DESIGN PROOF", "DEMO-007 • Version 2 (revise)") },
                    comments: [{ author: "Customer", message: "Please make the name bigger.", at: daysAgo(1) }],
                },
            },
            {
                id: "DEMO-008",
                date: daysAgo(1),
                items: [{ name: "Custom Sublimation (Custom)" }],
                total: 2350,
                status: "active",
                customRequest: { designName: "Green Wolves", productType: "Jersey" },
                details: { groupName: "Green Wolves", customerMobile: "0917-000-0008" },
                admin: {
                    orderType: "custom",
                    workflowStatus: "In Progress",
                    stockConfirmed: true,
                    accepted: true,
                    quote: { basePrice: 2200, shippingFee: 150 },
                    payment: { method: "GCash", verified: true, verifiedType: "full" },
                    proof: { status: "Approved", mockupDataUrl: makeSvgDataUrl("DESIGN PROOF", "DEMO-008 • Approved") },
                },
            },
            {
                id: "DEMO-009",
                date: daysAgo(0.7),
                items: [{ name: "Jersey (Fixed)" }],
                total: 1800,
                status: "active",
                details: { customerName: "Leo Cruz", customerMobile: "0917-000-0009", customerNumber: "11" },
                admin: {
                    orderType: "fixed",
                    workflowStatus: "Ready to Ship",
                    stockConfirmed: true,
                    accepted: true,
                    payment: { method: "COD", verified: true, verifiedType: "downpayment" },
                    proof: { status: "Approved", mockupDataUrl: makeSvgDataUrl("DESIGN PROOF", "DEMO-009 • Approved") },
                },
            },
            {
                id: "DEMO-010",
                date: daysAgo(0.4),
                items: [{ name: "Jersey (Fixed)" }],
                total: 1800,
                status: "active",
                details: { customerName: "Kim Santos", customerMobile: "0917-000-0010", customerNumber: "5" },
                admin: {
                    orderType: "fixed",
                    workflowStatus: "On Transit",
                    stockConfirmed: true,
                    accepted: true,
                    payment: { method: "GCash", verified: true, verifiedType: "full" },
                    proof: { status: "Approved", mockupDataUrl: makeSvgDataUrl("DESIGN PROOF", "DEMO-010 • Approved") },
                    trackingNumber: "JT-DEMO-123456789",
                },
            },
            {
                id: "DEMO-011",
                date: daysAgo(0.2),
                items: [{ name: "Custom Sublimation (Custom)" }],
                total: 2350,
                status: "completed",
                customRequest: { designName: "Silver Tigers", productType: "Jersey" },
                details: { groupName: "Silver Tigers", customerMobile: "0917-000-0011" },
                admin: {
                    orderType: "custom",
                    workflowStatus: "Completed",
                    stockConfirmed: true,
                    accepted: true,
                    quote: { basePrice: 2200, shippingFee: 150 },
                    payment: { method: "GCash", verified: true, verifiedType: "full" },
                    proof: { status: "Approved", mockupDataUrl: makeSvgDataUrl("DESIGN PROOF", "DEMO-011 • Approved") },
                    trackingNumber: "JT-DEMO-987654321",
                },
            },
            {
                id: "DEMO-012",
                date: daysAgo(2.5),
                items: [{ name: "Jersey (Fixed)" }],
                total: 1800,
                status: "cancelled",
                details: { customerName: "Demo Rejected", customerMobile: "0917-000-0012" },
                admin: {
                    orderType: "fixed",
                    workflowStatus: "Rejected",
                    stockConfirmed: false,
                    accepted: false,
                    payment: { method: "GCash" },
                },
            },
        ];

        saveOrders([...demo, ...keep]);
        return demo.length;
    };

    window.AdminStore = {
        generateId,
        getOrders,
        saveOrders,
        getOrderById,
        updateOrder,
        seedDemoOrders,
        getProducts,
        upsertProduct,
        deleteProduct,
        getQueryParam,
    };
})();

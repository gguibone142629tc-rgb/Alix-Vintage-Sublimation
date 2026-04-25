(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);

    const uiAlert = (message, opts = {}) => {
        const tone = String(opts.tone || "info").trim() || "info";
        const title = tone === "success" ? "Success" : tone === "danger" ? "Error" : "Notice";
        if (window.AVDialog?.alert) {
            window.AVDialog.alert(message, { ...opts, title });
            return;
        }
        window.alert(message);
    };

    const uiConfirm = async (message, opts = {}) => {
        if (window.AVDialog?.confirm) {
            return await window.AVDialog.confirm(message, { ...opts, title: "Confirm" });
        }
        return window.confirm(message);
    };

    const orderIdEl = qs("#orderId");
    const customerNameEl = qs("#customerName");
    const customerMobileEl = qs("#customerMobile");
    const customerAddressEl = qs("#customerAddress");
    const orderDateEl = qs("#orderDate");
    const workflowPill = qs("#workflowPill");

    const designDetails = qs("#designDetails");
    const orderContents = qs("#orderContents");
    const orderContentsNotice = qs("#orderContentsNotice");

    const stockConfirmedInput = qs("#stockConfirmed");
    const stockWrap = qs("#stockWrap");
    const basePriceInput = qs("#basePrice");
    const shippingFeeInput = qs("#shippingFee");
    const pricingHint = qs("#pricingHint");
    const pricingBox = qs("#pricingBox");

    const balanceTotalInput = qs("#balanceTotal");
    const balancePaidInput = qs("#balancePaid");
    const balanceRemainingInput = qs("#balanceRemaining");
    const balanceHint = qs("#balanceHint");

    const stageUploads = qs("#stageUploads");
    const stageButtons = qs("#stageButtons");
    const stageHint = qs("#stageHint");

    const commentsList = qs("#commentsList");
    const commentInput = qs("#commentInput");
    const sendCommentBtn = qs("#sendCommentBtn");

    const escapeHtml = (s) =>
        String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const safeJsonParse = (value, fallback) => {
        try {
            const parsed = JSON.parse(value);
            return parsed == null ? fallback : parsed;
        } catch {
            return fallback;
        }
    };

    const getLoggedInUserSummary = () => {
        const raw = localStorage.getItem("alix_auth_user");
        const user = safeJsonParse(raw || "null", null);
        if (!user || typeof user !== "object") return { name: null, mobile: null };

        const firstname = String(user.firstname || "").trim();
        const lastname = String(user.lastname || "").trim();
        const email = String(user.email || "").trim();
        const phone = String(user.phone_number || user.phone || user.mobile || "").trim();

        const full = `${firstname} ${lastname}`.trim();
        return {
            name: full || email || null,
            mobile: phone || null,
        };
    };

    const normalizeDeliveryAddress = (details) => {
        const d = details && typeof details === "object" ? details : {};
        const raw = d.delivery_address || d.deliveryAddress || d.shipping_address || d.shippingAddress || null;
        if (!raw || typeof raw !== "object") return null;

        const country = String(raw.country || "").trim();
        const province = String(raw.province || "").trim();
        const city = String(raw.city || "").trim();
        const street = String(raw.street || "").trim();
        const postalCode = String(raw.postal_code || raw.postalCode || "").trim();

        if (!country && !province && !city && !street && !postalCode) return null;

        return { country, province, city, street, postalCode };
    };

    const renderDeliveryAddress = (order) => {
        if (!customerAddressEl) return;

        const addressCardEl = customerAddressEl.closest(".order-header-item");

        const addr = normalizeDeliveryAddress(order?.details);
        if (!addr) {
            customerAddressEl.textContent = "-";
            customerAddressEl.removeAttribute("title");
            addressCardEl?.removeAttribute("title");
            return;
        }

        const parts = [addr.street, addr.city, addr.province, addr.country, addr.postalCode]
            .map((v) => String(v || "").trim())
            .filter(Boolean);

        const text = parts.join(", ");
        customerAddressEl.textContent = text || "-";

        if (text) {
            customerAddressEl.setAttribute("title", text);
            addressCardEl?.setAttribute("title", text);
        } else {
            customerAddressEl.removeAttribute("title");
            addressCardEl?.removeAttribute("title");
        }
    };

    const formatDate = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString("en-PH", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    };

    const formatMoney = (value) => `\u20B1${Number(value || 0).toLocaleString("en-PH")}`;

    const cleanNote = (value) => {
        const s = String(value ?? "").trim();
        if (!s) return "";
        const idx = s.toLowerCase().lastIndexOf("| notes:");
        if (idx >= 0) {
            return s.slice(idx + "| notes:".length).trim();
        }
        return s;
    };

    const getApiBaseUrl = () => {
        if (window.AlixAuth && typeof window.AlixAuth.apiBaseUrl === "function") {
            return window.AlixAuth.apiBaseUrl();
        }

        const origin = window.location && window.location.origin ? window.location.origin : "";
        if (origin && origin !== "null") return origin;
        return "";
    };

    const resolveAssetUrl = (path) => {
        const raw = String(path || "").trim();
        if (!raw) return null;
        if (/^(data:|blob:|https?:\/\/)/i.test(raw)) return raw;
        const base = getApiBaseUrl().replace(/\/$/, "");
        return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
    };

    let productsIndexLoaded = false;
    let productsIndexPromise = null;
    let productsById = new Map();

    const ensureProductsIndex = async () => {
        if (productsIndexPromise) return productsIndexPromise;

        productsIndexPromise = (async () => {
            try {
                const res = await fetch(getApiBaseUrl() + "/api/products", {
                    method: "GET",
                    headers: { Accept: "application/json" },
                });
                const data = await res.json().catch(() => ({}));
                const rows = Array.isArray(data?.products) ? data.products : [];
                const next = new Map();

                rows.forEach((p) => {
                    const id = Number(p?.product_id || p?.id || 0);
                    if (!Number.isFinite(id) || id <= 0) return;
                    next.set(id, {
                        id,
                        name: String(p?.product_name || p?.name || "").trim() || null,
                        imagePath: p?.image_path || null,
                        images: Array.isArray(p?.images) ? p.images : [],
                    });
                });

                productsById = next;
            } catch {
                // Non-blocking: design reference panel can fall back.
            } finally {
                productsIndexLoaded = true;
            }
        })();

        return productsIndexPromise;
    };

    const pickReferenceImageFromProduct = (product) => {
        if (!product || typeof product !== "object") return null;
        const images = Array.isArray(product?.images) ? product.images : [];
        const imageByView = new Map(
            images.map((img) => [String(img?.view_type || "").trim().toLowerCase(), String(img?.image_path || "").trim()])
        );

        const preferred = ["full", "front", "back", "lower"];
        for (const view of preferred) {
            const path = imageByView.get(view);
            const url = resolveAssetUrl(path);
            if (url) return url;
        }

        return resolveAssetUrl(product?.imagePath || product?.image_path || null);
    };

    const getReferenceGalleryFromProduct = (product) => {
        if (!product || typeof product !== "object") return [];

        const images = Array.isArray(product?.images) ? product.images : [];
        const imageByView = new Map(
            images.map((img) => [String(img?.view_type || "").trim().toLowerCase(), String(img?.image_path || "").trim()])
        );

        const preferred = ["full", "front", "back", "lower"];
        const out = [];
        for (const view of preferred) {
            const url = resolveAssetUrl(imageByView.get(view));
            if (url) out.push({ view, url });
        }

        // If there are no per-view images, fall back to the main product image.
        if (out.length === 0) {
            const fallback = resolveAssetUrl(product?.imagePath || product?.image_path || null);
            if (fallback) out.push({ view: "full", url: fallback });
        }

        return out;
    };

    const getAdminApiKey = () => {
        const key = localStorage.getItem("alix_admin_api_key");
        return key && String(key).trim() ? String(key).trim() : null;
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

    const fetchJson = (path) => requestJson("GET", path);

    const readFileAsDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const renderPreview = (container, dataUrl, alt) => {
        if (!container) return;
        container.innerHTML = "";
        if (!dataUrl) return;
        const img = document.createElement("img");
        img.src = dataUrl;
        img.alt = alt;
        img.loading = "lazy";
        container.appendChild(img);
    };

    const tryParseJsonObject = (value) => {
        if (!value) return null;
        if (typeof value === "object") return value;
        if (typeof value !== "string") return null;
        const s = value.trim();
        if (!s || (s[0] !== "{" && s[0] !== "[")) return null;
        try {
            const parsed = JSON.parse(s);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch {
            return null;
        }
    };

    const appendReceiptPanel = ({ title, dataUrl, uploadedAt, viewBtnId, emptyTitle, emptySub } = {}) => {
        if (!stageUploads) return;
        const safeTitle = String(title || "Receipt");
        const safeBtnId = String(viewBtnId || "viewReceiptBtn");
        const url = typeof dataUrl === "string" ? String(dataUrl).trim() : "";
        const whenIso = typeof uploadedAt === "string" ? uploadedAt : null;
        const whenText = whenIso ? formatDate(whenIso) : "-";

        if (!url) {
            if (!emptyTitle && !emptySub) return;
            stageUploads.insertAdjacentHTML(
                "beforeend",
                `
                    <div class="receipt-panel">
                        <div class="receipt-head">
                            <div class="receipt-title">${escapeHtml(safeTitle)}</div>
                        </div>
                        <div class="receipt-wait">
                            <div class="receipt-wait-title">${escapeHtml(String(emptyTitle || "Waiting for receipt"))}</div>
                            <div class="receipt-wait-sub">${escapeHtml(String(emptySub || ""))}</div>
                        </div>
                    </div>
                `
            );
            return;
        }

        stageUploads.insertAdjacentHTML(
            "beforeend",
            `
                <div class="receipt-panel">
                    <div class="receipt-head">
                        <div class="receipt-title">${escapeHtml(safeTitle)}</div>
                        <div><button class="table-btn" type="button" id="${escapeHtml(safeBtnId)}">View</button></div>
                    </div>
                    <div class="receipt-meta">Uploaded: ${escapeHtml(whenText)}</div>
                    <div class="receipt-preview"><img src="${escapeHtml(url)}" alt="${escapeHtml(safeTitle)}" loading="lazy"></div>
                </div>
            `
        );

        const btn = qs(`#${safeBtnId}`);
        btn?.addEventListener("click", () => openReceiptUrl(url));
    };

    const dataUrlToObjectUrl = (dataUrl) => {
        const raw = typeof dataUrl === "string" ? dataUrl : "";
        if (!raw.startsWith("data:")) return null;
        const commaIdx = raw.indexOf(",");
        if (commaIdx < 0) return null;
        const header = raw.slice(5, commaIdx); // after 'data:'
        const payload = raw.slice(commaIdx + 1);
        const isBase64 = /;base64/i.test(header);
        const mime = header.split(";")[0] || "application/octet-stream";

        try {
            let bytes;
            if (isBase64) {
                const bin = atob(payload);
                bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            } else {
                const text = decodeURIComponent(payload);
                bytes = new TextEncoder().encode(text);
            }
            const blob = new Blob([bytes], { type: mime });
            return URL.createObjectURL(blob);
        } catch {
            return null;
        }
    };

    const openReceiptUrl = (url) => {
        const raw = typeof url === "string" ? url.trim() : "";
        if (!raw) return;

        // Prefer blob URLs for large data URLs (avoids Chrome about:blank issues).
        const objectUrl = raw.startsWith("data:") ? dataUrlToObjectUrl(raw) : null;
        const href = objectUrl || raw;

        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();

        if (objectUrl) {
            // Revoke after the new tab has a moment to load.
            setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
        }
    };

    const getQueryParam = (key) => {
        if (window.AdminStore && typeof window.AdminStore.getQueryParam === "function") {
            return window.AdminStore.getQueryParam(key);
        }
        const url = new URL(window.location.href);
        return url.searchParams.get(key);
    };

    const getOrderIdFromQuery = () => getQueryParam("id");

    // DB orders use numeric ids (or "ORD-<id>"). Demo/local orders use string ids (e.g., "DEMO-001").

    const extractNumericOrderId = (id) => {
        const raw = String(id || "").trim();
        if (/^\d+$/.test(raw)) return Number(raw);
        const m = raw.match(/^ORD-(\d+)$/i);
        if (m) return Number(m[1]);
        return null;
    };

    const dbStatusToWorkflow = (status) => {
        const s = String(status || "pending").toLowerCase();
        if (s === "completed") return "Completed";
        if (s === "cancelled") return "Rejected";
        if (s === "shipped") return "On Transit";
        if (s === "ready_to_ship") return "Ready to Ship";
        if (s === "awaiting_final_payment") return "Awaiting Final Payment";
        if (s === "proofing") return "Proofing";
        if (s === "processing") return "In Progress";
        if (s === "paid") return "Awaiting Payment";
        return "Pending";
    };

    const computeOrderTotal = (order) => {
        const items = Array.isArray(order?.items) ? order.items : [];
        const itemsTotal = items.reduce((sum, it) => sum + Number(it?.totalAmount ?? it?.total_amount ?? 0), 0);
        const base = Number(order?.admin?.quote?.basePrice ?? 0);
        const shipping = Number(order?.admin?.quote?.shippingFee ?? 0);

        // Match backend computed total: prefer explicit item totals when present,
        // otherwise fall back to the base price.
        const subtotal = itemsTotal > 0 ? itemsTotal : base;
        const total = Math.round((subtotal + shipping) * 100) / 100;
        return total >= 0 ? total : 0;
    };

    const computePaymentAmounts = (order) => {
        const total = computeOrderTotal(order);
        const payment = order?.admin?.payment || {};

        const verifiedType = payment?.verifiedType != null ? String(payment.verifiedType).toLowerCase() : null;
        const isFinalVerified = payment?.finalVerified === true;

        let amountPaid = Number(payment?.amountPaid ?? 0);
        if (!Number.isFinite(amountPaid) || amountPaid < 0) amountPaid = 0;

        if (amountPaid === 0) {
            if (verifiedType === "full") amountPaid = total;
            if (verifiedType === "downpayment") amountPaid = Math.round(total * 0.5 * 100) / 100;
        }

        if (isFinalVerified) amountPaid = total;

        const remaining = Math.max(0, Math.round((total - amountPaid) * 100) / 100);
        return { total, amountPaid, remaining };
    };

    const renderRemainingBalance = (order) => {
        if (!balanceTotalInput || !balancePaidInput || !balanceRemainingInput) return;
        const amounts = computePaymentAmounts(order);
        balanceTotalInput.value = formatMoney(amounts.total);
        balancePaidInput.value = formatMoney(amounts.amountPaid);
        balanceRemainingInput.value = formatMoney(amounts.remaining);
        if (balanceHint) balanceHint.textContent = amounts.remaining <= 0.009 ? "Fully paid." : "Remaining balance must be paid before shipping.";
    };

    const normalizeDbOrderForPage = (row) => {
        const o = row?.order || {};
        const user = row?.user || null;
        const items = Array.isArray(row?.items) ? row.items : [];
        const designProof = row?.design_proof && typeof row.design_proof === "object" ? row.design_proof : null;
        const idNum = o.order_id;

        const firstname = String(user?.firstname || "").trim();
        const lastname = String(user?.lastname || "").trim();
        const fullName = `${firstname} ${lastname}`.trim();
        const customerName = fullName || String(user?.email || "").trim() || "-";
        const customerMobile = user?.phone_number != null ? String(user.phone_number) : "-";

        const mappedItems = items.map((it) => {
            const parsedMeta = tryParseJsonObject(it?.meta);
            const meta = parsedMeta && typeof parsedMeta === "object" ? parsedMeta : (it?.meta && typeof it.meta === "object" ? it.meta : {});
            const title =
                String(meta.productName || meta.name || meta.product_title || "").trim() ||
                (it?.productId != null ? `Product #${it.productId}` : "Order Item");
            return {
                id: it?.order_item_id ?? it?.orderItemId ?? it?.id ?? null,
                productId: it?.productId ?? it?.product_id ?? meta?.productId ?? meta?.product_id ?? null,
                name: title,
                meta,
                quantity: it?.quantity,
                totalAmount: it?.total_amount ?? it?.totalAmount,
            };
        });

        const parsedOrderMeta = tryParseJsonObject(o.meta);
        const metaFromOrder = parsedOrderMeta && typeof parsedOrderMeta === "object" ? parsedOrderMeta : (o.meta && typeof o.meta === "object" ? o.meta : {});

        const isCustomRequest = (() => {
            if (String(metaFromOrder?.source || "").toLowerCase() === "custom_design") return true;
            return mappedItems.some((it) => it?.meta && typeof it.meta === "object" && it.meta.custom_design);
        })();

        const proofMeta = metaFromOrder?.proof && typeof metaFromOrder.proof === "object" ? metaFromOrder.proof : {};

        const dpStatusRaw = designProof ? String(designProof.proof_status || "") : "";
        const dpPath = designProof ? String(designProof.proof_file_path || "") : "";
        const dpRevisionNote = designProof && designProof.revision_note != null ? String(designProof.revision_note) : null;
        const dpVersionNumber = designProof && designProof.version_number != null ? Number(designProof.version_number) : null;

        const mapDesignProofStatus = (s) => {
            const v = String(s || "").toLowerCase();
            if (v === "approved") return "Approved";
            if (v === "rejected") return "Revision Requested";
            if (v === "submitted" || v === "reviewing") return "Sent";
            return "Not Sent";
        };

        const proofStatus = designProof ? mapDesignProofStatus(dpStatusRaw) : (String(proofMeta.status || "Not Sent") || "Not Sent");
        const proofMockup = (designProof ? dpPath : String(proofMeta.mockup_data_url || proofMeta.mockupDataUrl || "")).trim() || null;

        const trackingFromDb = o.tracking_number != null ? String(o.tracking_number) : "";
        const trackingFromMeta = String(metaFromOrder?.tracking_number || metaFromOrder?.trackingNumber || "");
        const trackingNumber = String(trackingFromDb || trackingFromMeta || "").trim() || null;

        const paymentMeta = metaFromOrder?.payment && typeof metaFromOrder.payment === "object" ? metaFromOrder.payment : {};
        const receiptDataUrl =
            typeof paymentMeta.receipt_data_url === "string"
                ? paymentMeta.receipt_data_url
                : (typeof paymentMeta.receiptDataUrl === "string" ? paymentMeta.receiptDataUrl : null);
        const receiptUploadedAt =
            typeof paymentMeta.receipt_uploaded_at === "string"
                ? paymentMeta.receipt_uploaded_at
                : (typeof paymentMeta.receiptUploadedAt === "string" ? paymentMeta.receiptUploadedAt : null);
        const receiptMime =
            typeof paymentMeta.receipt_mime === "string"
                ? paymentMeta.receipt_mime
                : (typeof paymentMeta.receiptMime === "string" ? paymentMeta.receiptMime : null);
        const receiptSize =
            typeof paymentMeta.receipt_size === "number"
                ? paymentMeta.receipt_size
                : (typeof paymentMeta.receiptSize === "number" ? paymentMeta.receiptSize : null);

        const verified = paymentMeta.verified === true || String(paymentMeta.receipt_status || paymentMeta.receiptStatus || "").toLowerCase() === "verified";
        const verifiedType =
            typeof paymentMeta.verified_type === "string"
                ? paymentMeta.verified_type
                : (typeof paymentMeta.verifiedType === "string" ? paymentMeta.verifiedType : null);
        const amountPaid =
            typeof paymentMeta.amount_paid === "number"
                ? paymentMeta.amount_paid
                : (typeof paymentMeta.amountPaid === "number" ? paymentMeta.amountPaid : null);

        const finalReceiptDataUrl =
            typeof paymentMeta.final_receipt_data_url === "string"
                ? paymentMeta.final_receipt_data_url
                : (typeof paymentMeta.finalReceiptDataUrl === "string" ? paymentMeta.finalReceiptDataUrl : null);
        const finalReceiptUploadedAt =
            typeof paymentMeta.final_receipt_uploaded_at === "string"
                ? paymentMeta.final_receipt_uploaded_at
                : (typeof paymentMeta.finalReceiptUploadedAt === "string" ? paymentMeta.finalReceiptUploadedAt : null);
        const finalReceiptSize =
            typeof paymentMeta.final_receipt_size === "number"
                ? paymentMeta.final_receipt_size
                : (typeof paymentMeta.finalReceiptSize === "number" ? paymentMeta.finalReceiptSize : null);
        const finalVerified = paymentMeta.final_verified === true || String(paymentMeta.final_receipt_status || paymentMeta.finalReceiptStatus || "").toLowerCase() === "verified";

        const rawComments = metaFromOrder?.comments;
        const mappedComments = Array.isArray(rawComments)
            ? rawComments
                  .filter((c) => c && typeof c === "object")
                  .map((c) => ({
                      author: String(c.author || "Customer"),
                      message: cleanNote(String(c.message || "")),
                      at: typeof c.at === "string" ? c.at : null,
                  }))
                  .filter((c) => String(c.message || "").trim() !== "")
            : [];

        // Fallback: show item note as a comment when no stored comments exist yet.
        if (mappedComments.length === 0) {
            const note = mappedItems
                .map((it) => (it && typeof it.meta === "object" && it.meta ? it.meta : {}))
                .map((m) => cleanNote(String(m.note ?? m.notes ?? "").trim()))
                .find((v) => v);
            if (note) {
                mappedComments.push({ author: "Customer", message: note, at: o.created_at || null });
            }
        }

        return {
            id: idNum != null ? `ORD-${idNum}` : "ORD-?",
            date: o.created_at || new Date().toISOString(),
            status: String(o.status || "pending"),
            items: mappedItems,
            details: {
                ...metaFromOrder,
                customerName,
                customerMobile,
            },
            admin: {
                orderType: isCustomRequest || String(o.order_type || "").toLowerCase() === "custom" ? "custom" : "fixed",
                workflowStatus: dbStatusToWorkflow(o.status),
                // Keep the rest present so the renderer doesn't crash.
                stockConfirmed: false,
                accepted: true,
                quote: {
                    basePrice: o.base_price != null ? Number(o.base_price) : null,
                    shippingFee: o.shipping_fee != null ? Number(o.shipping_fee) : null,
                },
                payment: {
                    method: "GCash",
                    verified,
                    verifiedType,
                    amountPaid,
                    receiptDataUrl,
                    receiptMeta: {
                        uploadedAt: receiptUploadedAt,
                        fileName: null,
                        size: receiptSize,
                    },
                    finalReceiptDataUrl,
                    finalReceiptMeta: {
                        uploadedAt: finalReceiptUploadedAt,
                        fileName: null,
                        size: finalReceiptSize,
                    },
                    finalVerified,
                },
                proof: { status: proofStatus, mockupDataUrl: proofMockup, versionNumber: dpVersionNumber, revisionNote: dpRevisionNote },
                trackingNumber,
                comments: mappedComments,
            },
        };

    };

    let activeDbOrderId = null;

    const renderOrderContentsNotice = (order, proofHistory = null) => {
        if (!orderContentsNotice) return;

        const status = String(order?.admin?.proof?.status || "Not Sent");
        const isRevision = status === "Revision Requested";
        const isSent = status === "Sent";

        // Banner is an alert only; do not print raw revision note here.
        const show = isRevision || isSent;
        orderContentsNotice.style.display = show ? "block" : "none";
        if (!show) {
            orderContentsNotice.innerHTML = "";
            orderContentsNotice.classList.remove("is-danger", "is-info");
            return;
        }

        orderContentsNotice.classList.toggle("is-danger", isRevision);
        orderContentsNotice.classList.toggle("is-info", isSent);

        const title = isRevision ? "Revision Requested" : "Waiting for Approval";
        const body = isRevision
            ? "Customer requested changes. Upload updated mockup and resend proof."
            : "Proof sent. Waiting for customer to approve or request revisions.";

        orderContentsNotice.innerHTML = `
            <div class="order-contents-notice-title">${escapeHtml(title)}</div>
            <div class="order-contents-notice-body">${escapeHtml(body)}</div>
        `;
    };

    const fetchDbProofHistory = async (numericId) => {
        const res = await fetchJson(`/api/admin/orders/proofs?order_id=${encodeURIComponent(String(numericId))}`);
        return Array.isArray(res?.proofs) ? res.proofs : [];
    };

    const loadAndRenderDbProofHistory = async (numericId, order) => {
        try {
            const proofs = await fetchDbProofHistory(numericId);
            if (activeDbOrderId !== numericId) return;
            order.admin = order.admin || {};
            order.admin.proof = order.admin.proof || {};
            order.admin.proof.history = proofs;
            renderOrderContentsNotice(order, proofs);
            // Re-render so proof cards can use the loaded history.
            renderOrderContents(order);
            // Refresh stage actions so per-item proof statuses are reflected.
            renderReadOnly(numericId, order, true);
        } catch {
            // Non-blocking: notice can still show revision text from latest proof.
        }
    };

    const loadDbOrderById = async (numericId) => {
        const res = await fetchJson("/api/admin/orders?limit=200&offset=0");
        const orders = Array.isArray(res?.orders) ? res.orders : [];
        const found = orders.find((r) => Number(r?.order?.order_id) === Number(numericId));
        return found ? normalizeDbOrderForPage(found) : null;
    };

    const approveDbOrder = async (numericId) => {
        // Approve = allow customer to pay (Awaiting Payment)
        await requestJson("PATCH", "/api/admin/orders/status", { order_id: numericId, status: "paid" });
    };

    const updateDbPricing = async (numericId, basePrice, shippingFee) => {
        await requestJson("PATCH", "/api/admin/orders/pricing", {
            order_id: numericId,
            base_price: basePrice,
            shipping_fee: shippingFee,
        });
    };

    const verifyDbPayment = async (numericId, verifyType) => {
        await requestJson("PATCH", "/api/admin/orders/payment/verify", {
            order_id: numericId,
            verify_type: verifyType,
        });
    };

    const markDbReadyToShip = async (numericId) => {
        await requestJson("PATCH", "/api/admin/orders/status", { order_id: numericId, status: "ready_to_ship" });
    };

    const setDbOnTransit = async (numericId, trackingNumber) => {
        await requestJson("PATCH", "/api/admin/orders/shipping", {
            order_id: numericId,
            tracking_number: trackingNumber,
        });
    };

    const sendDbProof = async (numericId, mockupDataUrl, orderItemId) => {
        await requestJson("PATCH", "/api/admin/orders/proof", {
            order_id: numericId,
            mockup_data_url: mockupDataUrl,
            ...(Number.isFinite(Number(orderItemId)) && Number(orderItemId) > 0 ? { order_item_id: Number(orderItemId) } : {}),
        });
    };

    const markDbCompleted = async (numericId) => {
        await requestJson("PATCH", "/api/admin/orders/status", { order_id: numericId, status: "completed" });
    };

    const setReadOnlyUi = () => {
        if (stockConfirmedInput) stockConfirmedInput.disabled = true;
        if (basePriceInput) basePriceInput.disabled = true;
        if (shippingFeeInput) shippingFeeInput.disabled = true;
        if (commentInput) commentInput.disabled = true;
        if (sendCommentBtn) sendCommentBtn.disabled = true;
        if (stockWrap) stockWrap.style.display = "none";
        if (pricingBox) pricingBox.style.display = "none";
        if (pricingHint) pricingHint.textContent = "";
        clearStageArea();
        if (stageHint) stageHint.textContent = "-";
    };

    const wireDbPricing = (numericId, order) => {
        const isCustom = order?.admin?.orderType === "custom";
        const status = String(order?.status || "").toLowerCase();

        if (pricingBox) pricingBox.style.display = isCustom ? "block" : "none";
        if (!isCustom) return;

        const editable = status === "pending";
        if (basePriceInput) basePriceInput.disabled = !editable;
        if (shippingFeeInput) shippingFeeInput.disabled = !editable;

        if (pricingHint) {
            pricingHint.textContent = editable
                ? "Set Base Price and Shipping Fee for this custom request before approving."
                : "Pricing details are locked after approval.";
        }

        const syncQuoteFromInputs = () => {
            if (!order?.admin?.quote) order.admin.quote = { basePrice: null, shippingFee: null };
            const base = basePriceInput?.value === "" ? NaN : Number(basePriceInput?.value);
            const ship = shippingFeeInput?.value === "" ? NaN : Number(shippingFeeInput?.value);
            order.admin.quote.basePrice = Number.isFinite(base) ? base : 0;
            order.admin.quote.shippingFee = Number.isFinite(ship) ? ship : 0;
        };

        const updateApproveEnabled = () => {
            const approveBtn = qs("#approveDbBtn");
            if (!approveBtn) return;
            const baseOk = Number.isFinite(Number(order?.admin?.quote?.basePrice)) && Number(order.admin.quote.basePrice) > 0;
            const shipOk = Number.isFinite(Number(order?.admin?.quote?.shippingFee)) && Number(order.admin.quote.shippingFee) >= 0;
            approveBtn.disabled = !(baseOk && shipOk);
        };

        const onInput = () => {
            syncQuoteFromInputs();
            renderRemainingBalance(order);
            updateApproveEnabled();
        };

        if (basePriceInput) basePriceInput.oninput = onInput;
        if (shippingFeeInput) shippingFeeInput.oninput = onInput;

        onInput();
    };

    const renderReadOnly = (numericId, order, skipProofHistoryLoad = false) => {
        activeDbOrderId = numericId;
        if (orderIdEl) orderIdEl.textContent = order.id;
        if (orderDateEl) orderDateEl.textContent = formatDate(order.date);
        if (workflowPill) workflowPill.textContent = getWorkflowDisplay(order.admin.workflowStatus);

        const cust = getCustomerSummary(order);
        if (customerNameEl) customerNameEl.textContent = cust.customerName;
        if (customerMobileEl) customerMobileEl.textContent = cust.mobile;

        renderStepper(order);
        renderRemainingBalance(order);
        if (designDetails) designDetails.textContent = "";
        renderDeliveryAddress(order);
        renderOrderContentsNotice(order);
        renderOrderContents(order);
        ensureProductsIndex().then(() => {
            if (activeDbOrderId !== numericId) return;
            renderOrderContents(order);
        });
        renderComments(order);
        if (!skipProofHistoryLoad) {
            loadAndRenderDbProofHistory(numericId, order);
        }

        // Minimal admin action for DB orders.
        clearStageArea();
        const status = String(order.status || "").toLowerCase();
        if (stageHint) stageHint.textContent = "-";
        if (stageButtons) {
            if (status === "pending") {
                stageButtons.innerHTML = `<button class="table-btn" type="button" id="approveDbBtn">Approve Order</button>`;
                if (stageHint) stageHint.textContent = "Approving moves the order to Awaiting Payment.";
                const btn = qs("#approveDbBtn");

                if (basePriceInput) basePriceInput.value = order.admin.quote.basePrice != null ? String(order.admin.quote.basePrice) : "";
                if (shippingFeeInput) shippingFeeInput.value = order.admin.quote.shippingFee != null ? String(order.admin.quote.shippingFee) : "";
                wireDbPricing(numericId, order);

                btn?.addEventListener("click", async () => {
                    if (order?.admin?.orderType === "custom") {
                        const base = basePriceInput?.value === "" ? NaN : Number(basePriceInput?.value);
                        const ship = shippingFeeInput?.value === "" ? NaN : Number(shippingFeeInput?.value);
                        const baseOk = Number.isFinite(base) && base > 0;
                        const shipOk = Number.isFinite(ship) && ship >= 0;
                        if (!baseOk || !shipOk) {
                            uiAlert("Custom request needs Base Price (>0) and Shipping Fee (>=0) before approving.", {
                                title: "Pricing",
                                tone: "info",
                            });
                            return;
                        }
                    }

                    const ok = await uiConfirm("Approve this order?", {
                        title: "Approve Order",
                        tone: "danger",
                        okText: "Approve",
                        cancelText: "Cancel",
                    });
                    if (!ok) return;
                    try {
                        if (order?.admin?.orderType === "custom") {
                            const base = Number(basePriceInput?.value);
                            const ship = Number(shippingFeeInput?.value);
                            await updateDbPricing(numericId, base, ship);
                        }
                        await approveDbOrder(numericId);
                        const refreshed = await loadDbOrderById(numericId);
                        if (refreshed) renderReadOnly(numericId, refreshed);
                    } catch (e) {
                        uiAlert(e?.message || "Failed to approve order.", { title: "Order", tone: "danger" });
                    }
                });
            } else if (status === "paid") {
                if (basePriceInput) basePriceInput.value = order.admin.quote.basePrice != null ? String(order.admin.quote.basePrice) : "";
                if (shippingFeeInput) shippingFeeInput.value = order.admin.quote.shippingFee != null ? String(order.admin.quote.shippingFee) : "";
                wireDbPricing(numericId, order);

                const hasReceipt = Boolean(order?.admin?.payment?.receiptDataUrl);
                const meta = order?.admin?.payment?.receiptMeta || {};
                const uploadedAt = meta.uploadedAt ? formatDate(meta.uploadedAt) : null;
                const receiptLine = uploadedAt ? uploadedAt : "";

                if (stageUploads) {
                    stageUploads.innerHTML = `
                        <div class="receipt-panel">
                            <div class="receipt-head">
                                <div class="receipt-title">Payment Receipt</div>
                                <div>
                                    ${hasReceipt ? '<button class="table-btn" type="button" id="viewReceiptBtn">View</button>' : ""}
                                </div>
                            </div>
                            ${hasReceipt ? `<div class="receipt-meta">Uploaded: ${escapeHtml(receiptLine || "-")}</div>` : ""}
                            ${hasReceipt ? `<div class="receipt-preview"><img src="${order.admin.payment.receiptDataUrl}" alt="Payment receipt" loading="lazy"></div>` : `
                                <div class="receipt-wait">
                                    <div class="receipt-wait-title">Waiting for customer receipt</div>
                                    <div class="receipt-wait-sub">Customer uploads the receipt screenshot. Verify it here once available.</div>
                                </div>
                            `}
                        </div>
                    `;

                    const viewBtn = qs("#viewReceiptBtn");
                    viewBtn?.addEventListener("click", () => {
                        const url = order?.admin?.payment?.receiptDataUrl;
                        if (!url) return;
                        openReceiptUrl(url);
                    });
                }

                stageButtons.innerHTML = `
                    <button class="table-btn" type="button" id="verifyDownBtn">Verify 50% Downpayment</button>
                    <button class="table-btn" type="button" id="verifyFullBtn">Verify 100% Full Payment</button>
                `;

                if (stageHint) stageHint.textContent = hasReceipt
                    ? "Verify payment after reviewing the uploaded receipt."
                    : "Waiting for customer to upload a receipt.";

                const downBtn = qs("#verifyDownBtn");
                const fullBtn = qs("#verifyFullBtn");
                if (downBtn) downBtn.disabled = !hasReceipt;
                if (fullBtn) fullBtn.disabled = !hasReceipt;

                downBtn?.addEventListener("click", async () => {
                    const ok = await uiConfirm("Verify 50% downpayment for this order?", {
                        title: "Verify Downpayment",
                        tone: "danger",
                        okText: "Verify",
                        cancelText: "Cancel",
                    });
                    if (!ok) return;
                    try {
                        await verifyDbPayment(numericId, "downpayment");
                        const refreshed = await loadDbOrderById(numericId);
                        if (refreshed) renderReadOnly(numericId, refreshed);
                    } catch (e) {
                        uiAlert(e?.message || "Failed to verify downpayment.", { title: "Payment", tone: "danger" });
                    }
                });

                fullBtn?.addEventListener("click", async () => {
                    const ok = await uiConfirm("Verify 100% full payment for this order?", {
                        title: "Verify Full Payment",
                        tone: "danger",
                        okText: "Verify",
                        cancelText: "Cancel",
                    });
                    if (!ok) return;
                    try {
                        await verifyDbPayment(numericId, "full");
                        const refreshed = await loadDbOrderById(numericId);
                        if (refreshed) renderReadOnly(numericId, refreshed);
                    } catch (e) {
                        uiAlert(e?.message || "Failed to verify full payment.", { title: "Payment", tone: "danger" });
                    }
                });
            } else if (status === "proofing") {
                const mapProofStatusLabel = (rawStatus) => {
                    const v = String(rawStatus || "").trim().toLowerCase();
                    if (v === "approved") return "Approved";
                    if (v === "rejected" || v === "revision requested") return "Revision Requested";
                    if (v === "submitted" || v === "reviewing" || v === "sent") return "Sent";
                    return "Not Sent";
                };

                const mapProofStatusClass = (statusLabel) => {
                    const v = String(statusLabel || "").trim().toLowerCase();
                    if (v === "approved") return "proof-status-badge is-approved";
                    if (v === "revision requested") return "proof-status-badge is-revision";
                    if (v === "sent") return "proof-status-badge is-sent";
                    return "proof-status-badge is-not-sent";
                };

                const latestProofForItem = (proofs, itemId) => {
                    const list = Array.isArray(proofs) ? proofs : [];
                    const filtered = list
                        .filter((p) => Number(p?.order_item_id) === Number(itemId) && p?.proof_file_path)
                        .slice()
                        .sort((a, b) => {
                            const aV = Number(a?.version_number) || 0;
                            const bV = Number(b?.version_number) || 0;
                            if (aV !== bV) return bV - aV;
                            return (Number(b?.proof_id) || 0) - (Number(a?.proof_id) || 0);
                        });
                    return filtered[0] || null;
                };

                const proofs = Array.isArray(order?.admin?.proof?.history) ? order.admin.proof.history : [];
                const orderItems = Array.isArray(order?.items) ? order.items : [];
                const validItems = orderItems
                    .filter((it) => Number.isFinite(Number(it?.id)) && Number(it.id) > 0)
                    .map((it, idx) => {
                        const latest = latestProofForItem(proofs, Number(it.id));
                        const proofStatusLabel = latest
                            ? mapProofStatusLabel(latest?.proof_status)
                            : mapProofStatusLabel(order?.admin?.proof?.status || "Not Sent");
                        const productName = String(it?.name || "").trim();
                        const title = productName
                            ? `Order Item ${idx + 1} - ${productName}`
                            : `Order Item ${idx + 1}`;
                        return {
                            id: Number(it.id),
                            title,
                            proofStatusLabel,
                            isApproved: proofStatusLabel === "Approved",
                        };
                    });

                const selectedProofItemId = validItems[0]?.id ?? null;

                if (stageUploads && validItems.length > 1) {
                    const options = validItems
                        .map((it, idx) => `<option value="${escapeHtml(String(it.id))}" ${idx === 0 ? "selected" : ""}>${escapeHtml(`${it.title} (${it.proofStatusLabel})`)}</option>`)
                        .join("");

                    stageUploads.insertAdjacentHTML(
                        "beforeend",
                        `
                        <div class="field">
                            <label class="field-label" for="proofOrderItemSelect">Target product for this mockup</label>
                            <select class="field-input" id="proofOrderItemSelect">${options}</select>
                            <div class="mini-note" id="proofSelectedStatusWrap">Current status: <span id="proofSelectedStatusBadge" class="proof-status-badge is-not-sent">Not Sent</span></div>
                        </div>
                    `
                    );
                }

                addStageUpload("Upload layout mockup (image)", "mockupUpload", "image/*");

                // Place the action button directly under the upload.
                if (stageUploads) {
                    stageUploads.insertAdjacentHTML(
                        "beforeend",
                        `<div class="form-actions"><button class="table-btn" type="button" id="sendProofDbBtn">Send Proof</button></div>`
                    );
                }
                if (stageButtons) stageButtons.innerHTML = "";

                appendReceiptPanel({
                    title: "Downpayment Receipt",
                    dataUrl: order?.admin?.payment?.receiptDataUrl || "",
                    uploadedAt: order?.admin?.payment?.receiptMeta?.uploadedAt || null,
                    viewBtnId: "viewDownReceiptProofingBtn",
                });

                const preview = qs("#mockupUploadPreview");
                renderPreview(preview, order?.admin?.proof?.mockupDataUrl || "", "Mockup preview");

                if (stageHint) {
                    const proofStatus = String(order?.admin?.proof?.status || "Not Sent");
                    if (!order?.admin?.proof?.mockupDataUrl) {
                        stageHint.textContent = "Upload a layout mockup to start proofing.";
                    } else if (proofStatus === "Not Sent") {
                        stageHint.textContent = "Upload complete. Click Send Proof to share to customer.";
                    } else if (proofStatus === "Sent") {
                        stageHint.textContent = "Proof sent. Waiting for customer to approve or request revisions.";
                    } else if (proofStatus === "Revision Requested") {
                        stageHint.textContent = "Customer requested changes. Upload updated mockup and resend proof.";
                    } else if (proofStatus === "Approved") {
                        stageHint.textContent = "Customer approved the proof. Production can start.";
                    } else {
                        stageHint.textContent = "Proofing.";
                    }
                }

                let pendingMockup = order?.admin?.proof?.mockupDataUrl || "";
                let pendingOrderItemId = selectedProofItemId;
                const upload = qs("#mockupUpload");
                const sendProofBtn = qs("#sendProofDbBtn");
                const proofSelectedStatusBadge = qs("#proofSelectedStatusBadge");

                const getSelectedItemMeta = () => validItems.find((it) => Number(it.id) === Number(pendingOrderItemId)) || null;

                const syncProofStageUi = () => {
                    const selectedMeta = getSelectedItemMeta();
                    const selectedStatus = selectedMeta?.proofStatusLabel || "Not Sent";
                    const isApprovedItem = selectedMeta?.isApproved === true;

                    if (proofSelectedStatusBadge) {
                        proofSelectedStatusBadge.className = mapProofStatusClass(selectedStatus);
                        proofSelectedStatusBadge.textContent = selectedStatus;
                    }

                    if (stageHint) {
                        if (isApprovedItem) {
                            stageHint.textContent = `This item is already Approved. Sending a new proof is disabled for ${selectedMeta?.title || "this item"}.`;
                        } else if (selectedStatus === "Revision Requested") {
                            stageHint.textContent = `Revision requested on ${selectedMeta?.title || "this item"}. Upload updated mockup and resend proof.`;
                        } else if (selectedStatus === "Sent") {
                            stageHint.textContent = `Proof sent for ${selectedMeta?.title || "this item"}. Waiting for customer action.`;
                        }
                    }

                    if (sendProofBtn) {
                        sendProofBtn.disabled = !pendingMockup || isApprovedItem;
                    }
                };

                const proofOrderItemSelect = qs("#proofOrderItemSelect");
                if (proofOrderItemSelect) {
                    const selected = Number(proofOrderItemSelect.value || 0);
                    pendingOrderItemId = Number.isFinite(selected) && selected > 0 ? selected : selectedProofItemId;

                    proofOrderItemSelect.addEventListener("change", () => {
                        const next = Number(proofOrderItemSelect.value || 0);
                        pendingOrderItemId = Number.isFinite(next) && next > 0 ? next : selectedProofItemId;
                        syncProofStageUi();
                    });
                }

                upload?.addEventListener("change", async () => {
                    const file = upload.files?.[0];
                    if (!file) {
                        pendingMockup = "";
                        renderPreview(preview, "", "Mockup preview");
                        updateBtn();
                        return;
                    }
                    if (!String(file.type || "").startsWith("image/")) {
                        uiAlert("Mockup must be an image.", { title: "Proofing", tone: "danger" });
                        upload.value = "";
                        pendingMockup = "";
                        updateBtn();
                        return;
                    }
                    const maxBytes = 2_000_000;
                    if (typeof file.size === "number" && file.size > maxBytes) {
                        uiAlert("Image is too large (max 2MB).", { title: "Proofing", tone: "danger" });
                        upload.value = "";
                        pendingMockup = "";
                        updateBtn();
                        return;
                    }
                    try {
                        const dataUrl = await readFileAsDataUrl(file);
                        pendingMockup = dataUrl;
                        renderPreview(preview, dataUrl, "Mockup preview");
                        updateBtn();
                    } catch {
                        uiAlert("Failed to read file.", { title: "Proofing", tone: "danger" });
                        pendingMockup = "";
                        updateBtn();
                    }
                });

                const btn = qs("#sendProofDbBtn");
                const updateBtn = () => {
                    syncProofStageUi();
                };
                syncProofStageUi();
                upload?.addEventListener("change", updateBtn);

                btn?.addEventListener("click", async () => {
                    if (!pendingMockup) {
                        uiAlert("Upload a mockup first.", { title: "Proofing", tone: "info" });
                        return;
                    }

                    const selectedMeta = getSelectedItemMeta();
                    if (selectedMeta?.isApproved) {
                        uiAlert("This order item is already approved. You cannot send a new proof for it.", {
                            title: "Proofing",
                            tone: "info",
                        });
                        return;
                    }

                    const ok = await uiConfirm("Send this proof to the customer?", {
                        title: "Send Proof",
                        tone: "danger",
                        okText: "Send",
                        cancelText: "Cancel",
                    });
                    if (!ok) return;

                    try {
                        await sendDbProof(numericId, pendingMockup, pendingOrderItemId);
                        const refreshed = await loadDbOrderById(numericId);
                        if (refreshed) renderReadOnly(numericId, refreshed);
                    } catch (e) {
                        uiAlert(e?.message || "Failed to send proof.", { title: "Proofing", tone: "danger" });
                    }
                });
            } else if (status === "processing") {
                appendReceiptPanel({
                    title: "Downpayment Receipt",
                    dataUrl: order?.admin?.payment?.receiptDataUrl || "",
                    uploadedAt: order?.admin?.payment?.receiptMeta?.uploadedAt || null,
                    viewBtnId: "viewDownReceiptProcessingBtn",
                });

                const verifiedType = order?.admin?.payment?.verifiedType ? String(order.admin.payment.verifiedType).toLowerCase() : null;
                const finalVerified = order?.admin?.payment?.finalVerified === true;

                if (verifiedType === "downpayment" && !finalVerified) {
                    stageButtons.innerHTML = `<button class="table-btn" type="button" id="awaitFinalDbBtn">Set Awaiting Final Payment</button>`;
                    if (stageHint) stageHint.textContent = "Downpayment verified. Request final payment before shipping.";

                    const btn = qs("#awaitFinalDbBtn");
                    btn?.addEventListener("click", async () => {
                        const ok = await uiConfirm("Set this order to Awaiting Final Payment?", {
                            title: "Awaiting Final Payment",
                            tone: "danger",
                            okText: "Confirm",
                            cancelText: "Cancel",
                        });
                        if (!ok) return;
                        try {
                            await requestJson("PATCH", "/api/admin/orders/status", { order_id: numericId, status: "awaiting_final_payment" });
                            const refreshed = await loadDbOrderById(numericId);
                            if (refreshed) renderReadOnly(numericId, refreshed);
                        } catch (e) {
                            uiAlert(e?.message || "Failed to update status.", { title: "Order", tone: "danger" });
                        }
                    });
                } else {
                    stageButtons.innerHTML = `<button class="table-btn" type="button" id="readyToShipDbBtn">Mark Ready to Ship</button>`;
                    if (stageHint) stageHint.textContent = "Production is ongoing. Mark Ready to Ship when finished.";

                    const btn = qs("#readyToShipDbBtn");
                    btn?.addEventListener("click", async () => {
                        const ok = await uiConfirm("Mark this order as Ready to Ship?", {
                            title: "Ready to Ship",
                            tone: "danger",
                            okText: "Mark Ready",
                            cancelText: "Cancel",
                        });
                        if (!ok) return;
                        try {
                            await markDbReadyToShip(numericId);
                            const refreshed = await loadDbOrderById(numericId);
                            if (refreshed) renderReadOnly(numericId, refreshed);
                        } catch (e) {
                            uiAlert(e?.message || "Failed to update status.", { title: "Order", tone: "danger" });
                        }
                    });
                }
            } else if (status === "awaiting_final_payment") {
                if (stageUploads) stageUploads.innerHTML = "";

                appendReceiptPanel({
                    title: "Downpayment Receipt",
                    dataUrl: order?.admin?.payment?.receiptDataUrl || "",
                    uploadedAt: order?.admin?.payment?.receiptMeta?.uploadedAt || null,
                    viewBtnId: "viewDownReceiptFinalStageBtn",
                });

                appendReceiptPanel({
                    title: "Final Payment Receipt",
                    dataUrl: order?.admin?.payment?.finalReceiptDataUrl || "",
                    uploadedAt: order?.admin?.payment?.finalReceiptMeta?.uploadedAt || null,
                    viewBtnId: "viewFinalReceiptFinalStageBtn",
                    emptyTitle: "Waiting for customer final receipt",
                    emptySub: "Customer uploads the final payment receipt screenshot. Verify it here once available.",
                });

                const hasReceipt = Boolean(order?.admin?.payment?.finalReceiptDataUrl);

                stageButtons.innerHTML = `<button class="table-btn" type="button" id="verifyFinalBtn">Verify Final Payment</button>`;
                const btn = qs("#verifyFinalBtn");
                if (btn) btn.disabled = !hasReceipt;
                if (stageHint) stageHint.textContent = hasReceipt ? "Verify final payment after reviewing the uploaded receipt." : "Waiting for customer to upload the final payment receipt.";

                btn?.addEventListener("click", async () => {
                    const ok = await uiConfirm("Verify final payment for this order?", {
                        title: "Verify Final Payment",
                        tone: "danger",
                        okText: "Verify",
                        cancelText: "Cancel",
                    });
                    if (!ok) return;
                    try {
                        await verifyDbPayment(numericId, "final");
                        const refreshed = await loadDbOrderById(numericId);
                        if (refreshed) renderReadOnly(numericId, refreshed);
                    } catch (e) {
                        uiAlert(e?.message || "Failed to verify final payment.", { title: "Payment", tone: "danger" });
                    }
                });
            } else if (status === "ready_to_ship") {
                appendReceiptPanel({
                    title: "Downpayment Receipt",
                    dataUrl: order?.admin?.payment?.receiptDataUrl || "",
                    uploadedAt: order?.admin?.payment?.receiptMeta?.uploadedAt || null,
                    viewBtnId: "viewDownReceiptReadyBtn",
                });

                appendReceiptPanel({
                    title: "Final Payment Receipt",
                    dataUrl: order?.admin?.payment?.finalReceiptDataUrl || "",
                    uploadedAt: order?.admin?.payment?.finalReceiptMeta?.uploadedAt || null,
                    viewBtnId: "viewFinalReceiptReadyBtn",
                });

                // Keep tracking number right above the action button.
                addStageTextInput("J&T Tracking Number", "trackingNumber", "e.g., JT123456789");
                stageButtons.innerHTML = `<button class="table-btn" type="button" id="onTransitDbBtn">Set On Transit</button>`;
                if (stageHint) stageHint.textContent = "Enter J&T tracking number, then set On Transit.";

                const trackingInput = qs("#trackingNumber");
                if (trackingInput) trackingInput.value = order?.admin?.trackingNumber || "";

                const btn = qs("#onTransitDbBtn");
                btn?.addEventListener("click", async () => {
                    const tracking = String(trackingInput?.value || "").trim();
                    if (!tracking) {
                        uiAlert("Enter the J&T tracking number.", { title: "Shipping", tone: "info" });
                        return;
                    }
                    const ok = await uiConfirm("Set this order as On Transit?", {
                        title: "Shipping",
                        tone: "danger",
                        okText: "Set On Transit",
                        cancelText: "Cancel",
                    });
                    if (!ok) return;

                    try {
                        await setDbOnTransit(numericId, tracking);
                        const refreshed = await loadDbOrderById(numericId);
                        if (refreshed) renderReadOnly(numericId, refreshed);
                    } catch (e) {
                        uiAlert(e?.message || "Failed to set On Transit.", { title: "Shipping", tone: "danger" });
                    }
                });
            } else if (status === "shipped") {
                appendReceiptPanel({
                    title: "Downpayment Receipt",
                    dataUrl: order?.admin?.payment?.receiptDataUrl || "",
                    uploadedAt: order?.admin?.payment?.receiptMeta?.uploadedAt || null,
                    viewBtnId: "viewDownReceiptShippedBtn",
                });

                // Show final receipt when present (downpayment flow).
                if (order?.admin?.payment?.finalReceiptDataUrl) {
                    appendReceiptPanel({
                        title: "Final Payment Receipt",
                        dataUrl: order?.admin?.payment?.finalReceiptDataUrl || "",
                        uploadedAt: order?.admin?.payment?.finalReceiptMeta?.uploadedAt || null,
                        viewBtnId: "viewFinalReceiptShippedBtn",
                    });
                }

                stageButtons.innerHTML = `<button class="table-btn" type="button" id="completeDbBtn">Mark Completed</button>`;
                const tracking = order?.admin?.trackingNumber ? String(order.admin.trackingNumber) : "-";
                if (stageHint) stageHint.textContent = `Tracking: ${tracking}`;

                const btn = qs("#completeDbBtn");
                btn?.addEventListener("click", async () => {
                    const ok = await uiConfirm("Mark this order as Completed?", {
                        title: "Complete Order",
                        tone: "danger",
                        okText: "Mark Completed",
                        cancelText: "Cancel",
                    });
                    if (!ok) return;
                    try {
                        await markDbCompleted(numericId);
                        const refreshed = await loadDbOrderById(numericId);
                        if (refreshed) renderReadOnly(numericId, refreshed);
                    } catch (e) {
                        uiAlert(e?.message || "Failed to mark completed.", { title: "Order", tone: "danger" });
                    }
                });
            } else if (status === "completed") {
                appendReceiptPanel({
                    title: "Downpayment Receipt",
                    dataUrl: order?.admin?.payment?.receiptDataUrl || "",
                    uploadedAt: order?.admin?.payment?.receiptMeta?.uploadedAt || null,
                    viewBtnId: "viewDownReceiptCompletedBtn",
                });

                if (order?.admin?.payment?.finalReceiptDataUrl) {
                    appendReceiptPanel({
                        title: "Final Payment Receipt",
                        dataUrl: order?.admin?.payment?.finalReceiptDataUrl || "",
                        uploadedAt: order?.admin?.payment?.finalReceiptMeta?.uploadedAt || null,
                        viewBtnId: "viewFinalReceiptCompletedBtn",
                    });
                }

                const tracking = order?.admin?.trackingNumber ? String(order.admin.trackingNumber) : "-";
                stageButtons.innerHTML = "";
                if (stageHint) stageHint.textContent = `Completed. Tracking: ${tracking}`;
            } else {
                stageButtons.innerHTML = "";
                if (stageHint) stageHint.textContent = "-";
            }
        }
    };

    const getRosterText = (roster) => {
        if (!Array.isArray(roster) || roster.length === 0) return "-";
        const rows = roster
            .filter((r) => r && (r.name || r.number || r.size))
            .slice(0, 6)
            .map((r) => `${r.name || "-"} / #${r.number || "-"} / ${r.size || "-"}`);
        const more = roster.length > rows.length ? ` (+${roster.length - rows.length} more)` : "";
        return rows.join(" | ") + more;
    };

    const getWorkflowStepIndex = (workflowStatus) => {
        const wf = String(workflowStatus || "");
        if (wf === "Awaiting Payment") return 1;
        if (wf === "Proofing") return 2;
        if (wf === "In Progress") return 3;
        if (wf === "Awaiting Final Payment") return 4;
        if (wf === "Ready to Ship") return 5;
        if (wf === "On Transit") return 6;
        if (wf === "Completed") return 7;
        return 0; // Pending / Revision Requested / Rejected
    };

    const getWorkflowDisplay = (workflowStatus) => {
        const wf = String(workflowStatus || "Pending");
        if (wf === "Pending" || wf === "Revision Requested") return "Pending Review";
        return wf;
    };

    const computeAcceptHint = (order) => {
        const workflow = String(order.admin.workflowStatus);
        const stockConfirmed = Boolean(order.admin.stockConfirmed);
        const accepted = Boolean(order.admin.accepted);
        const type = String(order.admin.orderType);

        if (workflow === "Rejected") return "Order has been rejected.";
        if (accepted) return "Accepted. Customer payment is now allowed.";
        if (workflow !== "Pending" && workflow !== "Revision Requested") return `Current workflow: ${workflow}.`;
        if (!stockConfirmed) return "Confirm stock first.";
        if (type === "custom") {
            const baseOk = Number.isFinite(Number(order.admin.quote.basePrice)) && Number(order.admin.quote.basePrice) > 0;
            const shipOk = Number.isFinite(Number(order.admin.quote.shippingFee)) && Number(order.admin.quote.shippingFee) >= 0;
            if (!baseOk || !shipOk) return "Custom order: enter Base Price and Shipping Fee before accepting.";
        }
        return "Ready to accept.";
    };

    const canAccept = (order) => {
        if (String(order.admin.workflowStatus) === "Rejected") return false;
        if (order.admin.accepted) return false;
        const wf = String(order.admin.workflowStatus);
        if (wf !== "Pending" && wf !== "Revision Requested") return false;
        if (!order.admin.stockConfirmed) return false;
        if (String(order.admin.orderType) === "custom") {
            const baseOk = Number.isFinite(Number(order.admin.quote.basePrice)) && Number(order.admin.quote.basePrice) > 0;
            const shipOk = Number.isFinite(Number(order.admin.quote.shippingFee)) && Number(order.admin.quote.shippingFee) >= 0;
            return baseOk && shipOk;
        }
        return true;
    };

    const canMoveToProofing = (order) => {
        // After payment verification rules.
        const method = String(order.admin.payment.method);
        if (!order.admin.payment.verified) return false;
        if (method === "COD") return order.admin.payment.verifiedType === "downpayment";
        return order.admin.payment.verifiedType === "full" || order.admin.payment.verifiedType === "downpayment";
    };

    const ensureProofing = (orderId) => {
        const updated = window.AdminStore.updateOrder(orderId, (o) => {
            if (!canMoveToProofing(o)) return o;
            if (o.admin.workflowStatus === "Awaiting Payment") {
                o.admin.workflowStatus = "Proofing";
            }
            return o;
        });
        return updated;
    };

    const getCustomerSummary = (order) => {
        const details = order.details || {};
        const custom = order.customRequest || null;

        const loggedIn = getLoggedInUserSummary();

        const explicitName =
            details.customerName ||
            details.fullName ||
            details.name ||
            details.customer_fullname ||
            details.customer ||
            null;

        const customerName = explicitName || loggedIn.name || details.groupName || custom?.designName || "-";

        const mobile = details.customerMobile || details.customerPhone || loggedIn.mobile || "-";
        return { customerName, mobile };
    };

    const getRosterForOrder = (order) => {
        const details = order.details || {};
        const custom = order.customRequest || null;

        const roster = details.roster || custom?.roster || [];
        if (Array.isArray(roster) && roster.length) return roster;

        // Fallback for individual order pages
        const one = {
            name: details.customerName || "",
            number: details.customerNumber || "",
            size: "",
        };
        if (one.name || one.number) return [one];
        return [];
    };

    const renderStepper = (order) => {
        const wf = String(order?.admin?.workflowStatus || "");
        const current = getWorkflowStepIndex(wf);
        const isCompleted = wf === "Completed";
        document.querySelectorAll(".order-stepper .step").forEach((el) => {
            const step = Number(el.getAttribute("data-step"));
            const isStep = Number.isFinite(step);
            el.classList.toggle("is-done", isStep && (step < current || (isCompleted && step === current)));
            el.classList.toggle("is-active", isStep && step === current && !isCompleted);
        });
    };

    const renderComments = (order) => {
        if (!commentsList) return;
        const comments = Array.isArray(order.admin.comments) ? order.admin.comments : [];
        if (comments.length === 0) {
            commentsList.innerHTML = `<div class="mini-note">No comments yet.</div>`;
            return;
        }

        commentsList.innerHTML = comments
            .slice()
            .sort((a, b) => String(a.at).localeCompare(String(b.at)))
            .map((c) => {
                const author = c.author || "Admin";
                const at = c.at ? formatDate(c.at) : "-";
                const msg = c.message || "";
                return `
                    <div class="comment-card">
                        <div class="comment-meta">
                            <span class="comment-author">${escapeHtml(author)}</span>
                            <span>${escapeHtml(at)}</span>
                        </div>
                        <div class="comment-body">${escapeHtml(msg)}</div>
                    </div>
                `;
            })
            .join("");
    };

    const renderOrderContents = (order) => {
        if (!orderContents) return;
        const items = Array.isArray(order.items) ? order.items : [];

        const normalizeRosterRow = (r) => {
            if (!r || typeof r !== "object") return null;
            const name = String(r.name || r.player_name || "").trim();
            const number = String(r.number || r.jerseyNumber || r.jersey_number || "").trim();
            const size = String(r.size || "").trim();
            if (!name && !number && !size) return null;
            return { name, number, size };
        };

        const buildRosterFromItem = (it) => {
            const meta = it?.meta && typeof it.meta === "object" ? it.meta : {};
            if (Array.isArray(meta.roster) && meta.roster.length) {
                return meta.roster.map(normalizeRosterRow).filter(Boolean);
            }

            const one = {
                name: meta.playerName || meta.customerName || meta.name || "",
                number: meta.jerseyNumber || meta.customerNumber || meta.number || "",
                size: meta.size || "",
            };
            const normalized = normalizeRosterRow(one);
            return normalized ? [normalized] : [];
        };

        const makeRosterTable = (roster) => {
            const list = Array.isArray(roster) ? roster : [];
            const rows = list.length
                ? list
                      .map(
                          (r, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${escapeHtml(r.name || "-")}</td>
                            <td>${escapeHtml(r.size || "-")}</td>
                            <td>${escapeHtml(r.number || "-")}</td>
                        </tr>
                    `
                      )
                      .join("")
                : `<tr><td colspan="4">No roster details provided.</td></tr>`;

            return `
                <div class="table-wrap">
                    <table class="data-table" aria-label="Roster">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Name</th>
                                <th>Size</th>
                                <th>Jersey Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `;
        };

        const getUploadCard = (title, dataUrl, fallbackText) => {
            const safeUrl = resolveAssetUrl(dataUrl);
            const box = safeUrl
                ? `<img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(title)}" loading="lazy">`
                : `<div class="mini-note">${escapeHtml(fallbackText)}</div>`;
            return `
                <div class="upload-card">
                    <div class="upload-card-title">${escapeHtml(title)}</div>
                    <div class="upload-card-box">${box}</div>
                </div>
            `;
        };

        const getWideUploadCard = (title, dataUrl, fallbackText) => {
            const safeUrl = resolveAssetUrl(dataUrl);
            const box = safeUrl
                ? `<img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(title)}" loading="lazy">`
                : `<div class="mini-note">${escapeHtml(fallbackText)}</div>`;

            return `
                <div class="upload-card upload-card--wide">
                    <div class="upload-card-title">${escapeHtml(title)}</div>
                    <div class="upload-card-box">${box}</div>
                </div>
            `;
        };

        const getWideUploadCardGallery = (title, images, fallbackText) => {
            const list = Array.isArray(images) ? images : [];
            if (list.length === 0) {
                return `
                    <div class="upload-card upload-card--wide">
                        <div class="upload-card-title">${escapeHtml(title)}</div>
                        <div class="upload-card-box"><div class="mini-note">${escapeHtml(fallbackText)}</div></div>
                    </div>
                `;
            }

            const tiles = list
                .map((img) => {
                    const view = String(img?.view || "").trim().toUpperCase();
                    const url = resolveAssetUrl(img?.url);
                    if (!url) return "";
                    return `
                        <div class="reference-tile">
                            <div class="reference-tile-label">${escapeHtml(view || "VIEW")}</div>
                            <img src="${escapeHtml(url)}" alt="${escapeHtml(title)} ${escapeHtml(view)}" loading="lazy">
                        </div>
                    `;
                })
                .filter(Boolean)
                .join("");

            const body = tiles
                ? `<div class="reference-grid">${tiles}</div>`
                : `<div class="mini-note">${escapeHtml(fallbackText)}</div>`;

            return `
                <div class="upload-card upload-card--wide">
                    <div class="upload-card-title">${escapeHtml(title)}</div>
                    <div class="upload-card-box">${body}</div>
                </div>
            `;
        };

        const getItemProductId = (it) => {
            const direct = it?.productId;
            if (direct != null && String(direct).trim() !== "") return Number(direct);
            const meta = it?.meta && typeof it.meta === "object" ? it.meta : {};
            const metaId = meta.productId ?? meta.product_id ?? meta.productID ?? meta.productID;
            return metaId != null && String(metaId).trim() !== "" ? Number(metaId) : null;
        };

        const getProductNameForItem = (it) => {
            const meta = it?.meta && typeof it.meta === "object" ? it.meta : {};
            const metaName = String(
                meta.productName || meta.product_name || meta.name || meta.product_title || ""
            ).trim();
            if (metaName) return metaName;

            const productId = getItemProductId(it);
            if (!Number.isFinite(Number(productId)) || Number(productId) <= 0) return "";
            const product = productsById.get(Number(productId));
            return String(product?.name || "").trim();
        };

        const getDesignReferenceGalleryForItem = (it) => {
            const meta = it?.meta && typeof it.meta === "object" ? it.meta : {};

            // Explicit reference from meta (if backend stores it there)
            const directKeys = [
                "designReference",
                "design_reference",
                "designReferenceUrl",
                "design_reference_url",
                "designReferencePath",
                "design_reference_path",
                "referenceImage",
                "reference_image",
                "referenceImagePath",
                "reference_image_path",
                "referencePath",
                "reference_path",
            ];

            for (const k of directKeys) {
                const v = meta?.[k];
                const url = resolveAssetUrl(v);
                if (url) return [{ view: "reference", url }];
            }

            const productId = getItemProductId(it);
            if (!Number.isFinite(Number(productId)) || Number(productId) <= 0) return null;
            const product = productsById.get(Number(productId));
            return getReferenceGalleryFromProduct(product);
        };

        const buildProofVersionLinks = (proofs, itemId) => {
            const safe = Array.isArray(proofs) ? proofs : [];
            const filtered = itemId != null
                ? safe.filter((p) => Number(p?.order_item_id) === Number(itemId) && p?.proof_file_path)
                : safe.filter((p) => p?.proof_file_path);

            if (filtered.length === 0) {
                return { count: 0, linksHtml: "" };
            }

            const linksHtml = filtered
                .slice()
                .sort((a, b) => {
                    const aV = Number(a?.version_number) || 0;
                    const bV = Number(b?.version_number) || 0;
                    if (aV !== bV) return bV - aV;
                    return (Number(b?.proof_id) || 0) - (Number(a?.proof_id) || 0);
                })
                .map((p) => {
                    const v = Number(p?.version_number) || 0;
                    const href = String(p?.proof_file_path || "").trim();
                    const label = `v${v || "?"}`;
                    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
                })
                .join("");

            return { count: filtered.length, linksHtml };
        };

        const getLatestProofForItem = (proofs, itemId) => {
            const safe = Array.isArray(proofs) ? proofs : [];
            const filtered = itemId != null
                ? safe.filter((p) => Number(p?.order_item_id) === Number(itemId) && p?.proof_file_path)
                : safe.filter((p) => p?.proof_file_path);

            if (filtered.length === 0) return null;

            return filtered
                .slice()
                .sort((a, b) => {
                    const aV = Number(a?.version_number) || 0;
                    const bV = Number(b?.version_number) || 0;
                    if (aV !== bV) return bV - aV;
                    return (Number(b?.proof_id) || 0) - (Number(a?.proof_id) || 0);
                })[0] || null;
        };

        const mapProofStatusLabel = (rawStatus) => {
            const v = String(rawStatus || "").trim().toLowerCase();
            if (v === "approved") return "Approved";
            if (v === "rejected" || v === "revision requested") return "Revision Requested";
            if (v === "submitted" || v === "reviewing" || v === "sent") return "Sent";
            return "Not Sent";
        };

        const mapProofStatusClass = (statusLabel) => {
            const v = String(statusLabel || "").trim().toLowerCase();
            if (v === "approved") return "proof-status-badge is-approved";
            if (v === "revision requested") return "proof-status-badge is-revision";
            if (v === "sent") return "proof-status-badge is-sent";
            return "proof-status-badge is-not-sent";
        };

        const getDesignProofCard = (dataUrl, itemId) => {
            const proofs = Array.isArray(order?.admin?.proof?.history) ? order.admin.proof.history : [];
            const { count, linksHtml } = buildProofVersionLinks(proofs, itemId);
            const latestProof = getLatestProofForItem(proofs, itemId);
            const latestProofUrl = resolveAssetUrl(latestProof?.proof_file_path || null);
            const displayUrl = latestProofUrl || resolveAssetUrl(dataUrl);
            const hasAnyProof = Boolean(String(displayUrl || "").trim());
            const canView = count > 0 || hasAnyProof;
            const toggleLabel = count > 0 ? `View versions (${count})` : "View versions";
            const statusLabel = latestProof ? mapProofStatusLabel(latestProof?.proof_status) : "Not Sent";

            const box = displayUrl
                ? `<img src="${escapeHtml(displayUrl)}" alt="Design Proof" loading="lazy">`
                : `<div class="mini-note">No proof uploaded</div>`;

            return `
                <div class="upload-card">
                    <div class="upload-card-title">Design Proof</div>
                    <div class="mini-note" style="padding:0 0 8px">Status: <span class="${escapeHtml(mapProofStatusClass(statusLabel))}">${escapeHtml(statusLabel)}</span></div>
                    <div class="upload-card-box">${box}</div>
                    <div class="order-contents-notice-actions" style="margin-top:12px">
                        <button class="table-btn" type="button" data-act="toggle-proof-versions" data-item-id="${itemId != null ? escapeHtml(String(itemId)) : ""}" data-label="${escapeHtml(toggleLabel)}" ${canView ? "" : "disabled"}>${escapeHtml(toggleLabel)}</button>
                    </div>
                    ${linksHtml ? `<div class="order-contents-notice-links" data-proof-versions style="display:none">${linksHtml}</div>` : ""}
                </div>
            `;
        };

        const custom = order.customRequest || null;
        const orderLabel = custom ? `Custom Request - ${custom.productType || "Custom"}` : "Order";

        const showProofCard = getWorkflowStepIndex(order.admin.workflowStatus) >= 2; // Proofing and beyond

        const contentsHtml = (items.length ? items : [{ name: orderLabel, meta: {} }])
            .map((it) => {
                const resolvedProductName = getProductNameForItem(it);
                const rawTitle = it?.name || orderLabel;
                const title = resolvedProductName && (rawTitle === orderLabel || /^Product\s+#\d+/i.test(rawTitle))
                    ? resolvedProductName
                    : rawTitle;
                const meta = it?.meta && typeof it.meta === "object" ? it.meta : {};
                const roster = buildRosterFromItem(it);
                const itemId = it?.id ?? null;

                const customFiles = (() => {
                    const cd = meta?.custom_design && typeof meta.custom_design === "object" ? meta.custom_design : null;
                    const files = cd?.files && typeof cd.files === "object" ? cd.files : null;
                    return files;
                })();

                const normalizeUploadMetaArray = (value) => {
                    if (Array.isArray(value)) return value;
                    if (value && typeof value === "object") return [value];
                    return [];
                };

                const customRefs = Array.isArray(customFiles?.references) ? customFiles.references : [];
                const customRefGallery = customRefs
                    .map((r) => {
                        const p = r && typeof r === "object" ? r.path : null;
                        const url = resolveAssetUrl(p);
                        return url ? { view: "reference", url } : null;
                    })
                    .filter(Boolean);

                const customMainFiles = normalizeUploadMetaArray(customFiles?.main);
                const customLogoFiles = normalizeUploadMetaArray(customFiles?.logo);

                const customMainGallery = customMainFiles
                    .map((m, idx) => {
                        const p = m && typeof m === "object" ? m.path : null;
                        const url = resolveAssetUrl(p);
                        return url ? { view: customMainFiles.length > 1 ? `FILE ${idx + 1}` : "FILE", url } : null;
                    })
                    .filter(Boolean);

                const customLogoGallery = customLogoFiles
                    .map((m, idx) => {
                        const p = m && typeof m === "object" ? m.path : null;
                        const url = resolveAssetUrl(p);
                        return url ? { view: customLogoFiles.length > 1 ? `LOGO ${idx + 1}` : "LOGO", url } : null;
                    })
                    .filter(Boolean);

                const designReferenceGallery = customRefGallery.length ? customRefGallery : getDesignReferenceGalleryForItem(it);
                const productId = getItemProductId(it);
                const designReferenceFallback = Number.isFinite(Number(productId)) && !productsIndexLoaded
                    ? "Loading reference..."
                    : "No reference available";

                const logoDataUrl = [
                    meta.logoDataUrl,
                    meta.logo_data_url,
                    meta.logoUrl,
                    meta.logo_url,
                    meta.logo,
                ]
                    .map((v) => String(v || "").trim())
                    .find((v) => v.length > 0) || null;

                const logoGallery = customLogoGallery.length
                    ? customLogoGallery
                    : (logoDataUrl ? [{ view: "LOGO", url: logoDataUrl }] : []);

                const uploadedDesignFallback = custom?.designType === "reference" ? "Reference only" : "No file uploaded";

                const uploadCards = `
                    <div class="upload-cards">
                        ${getWideUploadCardGallery("Design Reference", designReferenceGallery, designReferenceFallback)}
                        ${getWideUploadCardGallery("Uploaded Design", customMainGallery, uploadedDesignFallback)}
                        ${getWideUploadCardGallery("Logo", logoGallery, "No logo uploaded")}
                        ${showProofCard ? getDesignProofCard(order.admin.proof.mockupDataUrl, itemId) : ""}
                    </div>
                `;

                const getMetaValue = (keys) => {
                    for (const k of keys) {
                        const v = meta?.[k];
                        if (v == null) continue;
                        const s = String(v).trim();
                        if (s) return s;
                    }
                    return "";
                };

                const metaPairs = [];
                if (resolvedProductName) metaPairs.push(["Product", resolvedProductName]);
                const group = getMetaValue(["groupName", "group", "teamName", "team_name"]);
                // Note is shown in Comments & Revisions; keep Order Item clean.

                // Keep these details minimal/clear. Player/Jersey/Size are shown in the roster table below.
                if (group) metaPairs.push(["Group Name", group]);

                const metaGrid = metaPairs.length
                    ? `<div class="order-meta-grid" aria-label="Item details">
                        ${metaPairs
                            .map(
                                ([k, v]) => `
                            <div class="order-meta-row">
                                <div class="order-meta-k">${escapeHtml(k)}</div>
                                <div class="order-meta-v">${escapeHtml(v)}</div>
                            </div>
                        `
                            )
                            .join("")}
                    </div>`
                    : "";

                return `
                    <div class="order-item-block">
                        <div class="order-item-head">
                            <div class="order-item-title">${escapeHtml(title)}</div>
                        </div>
                        ${metaGrid}
                        ${makeRosterTable(roster)}
                        ${uploadCards}
                    </div>
                `;
            })
            .join("");

        orderContents.innerHTML = contentsHtml;

        // Toggle proof versions links per proof card.
        orderContents.querySelectorAll('[data-act="toggle-proof-versions"]').forEach((btn) => {
            btn.addEventListener("click", () => {
                const card = btn.closest(".upload-card");
                const links = card ? card.querySelector('[data-proof-versions]') : null;
                if (links) {
                    const open = links.style.display !== "none";
                    links.style.display = open ? "none" : "flex";
                    const baseLabel = btn.getAttribute('data-label') || "View versions";
                    btn.textContent = open ? baseLabel : "Hide versions";
                    return;
                }

                if (!activeDbOrderId) {
                    uiAlert("No versions available.", { title: "Proofing", tone: "info" });
                    return;
                }

                const itemIdRaw = btn.getAttribute('data-item-id');
                const itemId = itemIdRaw && String(itemIdRaw).trim() ? Number(itemIdRaw) : null;

                const prevText = btn.textContent;
                btn.disabled = true;
                btn.textContent = "Loading...";

                fetchDbProofHistory(activeDbOrderId)
                    .then((proofs) => {
                        order.admin = order.admin || {};
                        order.admin.proof = order.admin.proof || {};
                        order.admin.proof.history = proofs;

                        renderOrderContents(order);

                        const selector = itemId != null
                            ? `[data-act=\"toggle-proof-versions\"][data-item-id=\"${String(itemId)}\"]`
                            : `[data-act=\"toggle-proof-versions\"]`;
                        const newBtn = orderContents.querySelector(selector);
                        newBtn?.click();
                    })
                    .catch(() => {
                        uiAlert("Failed to load versions.", { title: "Proofing", tone: "danger" });
                    })
                    .finally(() => {
                        if (document.body.contains(btn)) {
                            btn.disabled = false;
                            btn.textContent = prevText;
                        }
                    });
            });
        });
    };

    const renderDesignSummaryLine = (order) => {
        const details = order.details || {};
        const custom = order.customRequest || null;
        const items = Array.isArray(order.items) ? order.items : [];

        const rosterFromItems = (() => {
            const out = [];
            for (const it of items) {
                const meta = it?.meta && typeof it.meta === "object" ? it.meta : {};
                if (Array.isArray(meta.roster)) {
                    for (const r of meta.roster) {
                        if (!r || typeof r !== "object") continue;
                        out.push({
                            name: r.name || r.player_name || "",
                            number: r.number || r.jerseyNumber || r.jersey_number || "",
                            size: r.size || "",
                        });
                    }
                } else if (meta.playerName || meta.jerseyNumber || meta.size) {
                    out.push({ name: meta.playerName || "", number: meta.jerseyNumber || "", size: meta.size || "" });
                }
            }
            return out.filter((r) => (r.name || r.number || r.size));
        })();

        const groupNames = (() => {
            const set = new Set();
            for (const it of items) {
                const meta = it?.meta && typeof it.meta === "object" ? it.meta : {};
                const g = String(meta.groupName || "").trim();
                if (g) set.add(g);
            }
            return Array.from(set);
        })();

        const parts = [];
        if (custom) {
            parts.push(`Design: ${custom.designName || "-"}`);
            parts.push(`Product: ${custom.productType || "Custom"}`);
            if (custom.notes) parts.push(`Notes: ${custom.notes}`);
            if (rosterFromItems.length) parts.push(`Roster: ${getRosterText(rosterFromItems)}`);
        } else {
            if (groupNames.length) parts.push(`Group: ${groupNames.join(", ")}`);
            if (rosterFromItems.length) parts.push(`Roster: ${getRosterText(rosterFromItems)}`);
            // Fallback to older/demo order fields if no item meta is present.
            if (!groupNames.length && !rosterFromItems.length) {
                const roster = getRosterForOrder(order);
                if (details.groupName) parts.push(`Group: ${details.groupName}`);
                if (details.customerName) parts.push(`Name: ${details.customerName}`);
                if (details.customerNumber) parts.push(`Number: ${details.customerNumber}`);
                if (roster.length) parts.push(`Roster: ${getRosterText(roster)}`);
            }
        }

        designDetails.textContent = parts.length ? parts.join(" \u2022 ") : "-";
    };

    const syncPricingAndStockToOrder = (orderId) => {
        window.AdminStore.updateOrder(orderId, (o) => {
            o.admin.stockConfirmed = Boolean(stockConfirmedInput?.checked);
            const base = basePriceInput?.value === "" ? null : Number(basePriceInput?.value);
            const ship = shippingFeeInput?.value === "" ? null : Number(shippingFeeInput?.value);
            o.admin.quote.basePrice = Number.isFinite(base) ? base : null;
            o.admin.quote.shippingFee = Number.isFinite(ship) ? ship : null;
            return o;
        });
    };

    const clearStageArea = () => {
        if (stageUploads) stageUploads.innerHTML = "";
        if (stageButtons) stageButtons.innerHTML = "";
    };

    const addStageUpload = (label, inputId, accept) => {
        if (!stageUploads) return;
        stageUploads.insertAdjacentHTML(
            "beforeend",
            `
            <div class="field">
                <label class="field-label" for="${escapeHtml(inputId)}">${escapeHtml(label)}</label>
                <input class="field-input" id="${escapeHtml(inputId)}" type="file" accept="${escapeHtml(accept)}">
                <div class="image-preview" id="${escapeHtml(inputId)}Preview"></div>
            </div>
        `
        );
    };

    const addStageTextInput = (label, inputId, placeholder) => {
        if (!stageUploads) return;
        stageUploads.insertAdjacentHTML(
            "beforeend",
            `
            <div class="field">
                <label class="field-label" for="${escapeHtml(inputId)}">${escapeHtml(label)}</label>
                <input class="field-input" id="${escapeHtml(inputId)}" type="text" placeholder="${escapeHtml(placeholder)}">
            </div>
        `
        );
    };

    const addStageButton = (id, text, variant) => {
        if (!stageButtons) return;
        const cls = variant === "danger" ? "table-btn is-danger" : "table-btn";
        stageButtons.insertAdjacentHTML(
            "beforeend",
            `<button class="${cls}" type="button" id="${escapeHtml(id)}">${escapeHtml(text)}</button>`
        );
    };

    const renderStageActions = (orderId, order) => {
        clearStageArea();

        const wf = String(order.admin.workflowStatus);
        const isCustom = order.admin.orderType === "custom";

        // Pricing box hint
        if (pricingBox) {
            pricingBox.style.display = isCustom ? "block" : "none";
        }
        if (pricingHint) {
            if (isCustom) {
                const base = Number(order.admin.quote.basePrice || 0);
                const ship = Number(order.admin.quote.shippingFee || 0);
                const hasBase = Number.isFinite(base) && base > 0;
                const hasShip = Number.isFinite(ship) && ship >= 0;
                const expected = hasBase && hasShip ? formatMoney(base + ship) : "-";
                pricingHint.textContent = `Enter base price and shipping fee for custom requests before accepting. Expected Total: ${expected}`;
            } else {
                pricingHint.textContent = "Pricing details are used for custom requests.";
            }
        }

        // Stock checkbox only for review stage
        if (stockWrap) {
            stockWrap.style.display = wf === "Pending" || wf === "Revision Requested" ? "block" : "none";
        }

        if (stageHint) stageHint.textContent = "-";

        if (wf === "Pending" || wf === "Revision Requested") {
            addStageButton("rejectBtn", "Reject Order", "danger");
            addStageButton("acceptProceedBtn", "Accept and Proceed");
            stageHint.textContent = computeAcceptHint(order);
        } else if (wf === "Awaiting Payment") {
            // Receipt is uploaded by customer; admin can only view it here.
            if (stageUploads) {
                const meta = order.admin.payment.receiptMeta || {};
                const uploadedAt = meta.uploadedAt ? formatDate(meta.uploadedAt) : null;
                const fileName = meta.fileName || null;
                const receiptLine = fileName && uploadedAt ? `${fileName} \u00B7 ${uploadedAt}` : fileName || uploadedAt || "";
                const hasReceipt = Boolean(order.admin.payment.receiptDataUrl);

                stageUploads.insertAdjacentHTML(
                    "beforeend",
                    `
                    <div class="receipt-panel">
                        <div class="receipt-head">
                            <div class="receipt-title">Payment Receipt</div>
                            <div>
                                ${hasReceipt ? '<button class="table-btn" type="button" id="viewReceiptBtn">View</button>' : ""}
                            </div>
                        </div>
                        ${hasReceipt ? `<div class="receipt-meta">Uploaded: ${escapeHtml(receiptLine || "-")}</div>` : ""}
                        ${hasReceipt ? `<div class="receipt-preview"><img src="${order.admin.payment.receiptDataUrl}" alt="Payment receipt" loading="lazy"></div>` : `
                            <div class="receipt-wait">
                                <div class="receipt-wait-title">Waiting for customer receipt</div>
                                <div class="receipt-wait-sub">Customer uploads the receipt screenshot. Admin can only view it here.</div>
                            </div>
                        `}
                    </div>
                `
                );
            }
            addStageButton("verifyDownBtn", "Verify 50% Downpayment");
            addStageButton("verifyFullBtn", "Verify 100% Full Payment");
            stageHint.textContent = buildPaymentHint(order);
        } else if (wf === "Proofing") {
            addStageUpload("Upload layout mockup (image)", "mockupUpload", "image/*");
            // Place Send Proof directly under the upload.
            if (stageUploads) {
                stageUploads.insertAdjacentHTML(
                    "beforeend",
                    `<div class="form-actions"><button class="table-btn" type="button" id="sendProofBtn">Send Proof</button></div>`
                );
            }
            stageHint.textContent = buildProofingHint(order);
        } else if (wf === "In Progress") {
            addStageButton("readyToShipBtn", "Mark Ready to Ship");
            stageHint.textContent = buildFulfillmentHint(order);
        } else if (wf === "Ready to Ship") {
            addStageTextInput("J&T Tracking Number", "trackingNumber", "e.g., JT123456789");
            addStageButton("onTransitBtn", "Set On Transit");
            stageHint.textContent = buildFulfillmentHint(order);
        } else if (wf === "On Transit") {
            addStageButton("markCompletedBtn", "Mark Completed");
            stageHint.textContent = `Tracking: ${order.admin.trackingNumber || "-"}`;
        } else if (wf === "Completed") {
            stageHint.textContent = `Completed. Tracking: ${order.admin.trackingNumber || "-"}`;
        } else if (wf === "Rejected") {
            stageHint.textContent = "Rejected.";
        }

        wireStageHandlers(orderId);
        hydrateStageValues(order);

        // Disable buttons based on current data.
        const acceptProceedBtn = qs("#acceptProceedBtn");
        if (acceptProceedBtn) acceptProceedBtn.disabled = !canAccept(order);

        const verifyDownBtn = qs("#verifyDownBtn");
        const verifyFullBtn = qs("#verifyFullBtn");
        const hasReceipt = Boolean(order.admin.payment.receiptDataUrl);
        if (verifyDownBtn) verifyDownBtn.disabled = !hasReceipt;
        if (verifyFullBtn) verifyFullBtn.disabled = !hasReceipt || order.admin.payment.method === "COD";

        const sendProofBtn = qs("#sendProofBtn");
        if (sendProofBtn) sendProofBtn.disabled = !order.admin.proof.mockupDataUrl;
    };

    const buildPaymentHint = (order) => {
        const method = String(order.admin.payment.method);
        if (method === "COD") {
            return "COD rule: must verify 50% downpayment before moving to Proofing.";
        }
        return "GCash: verify 50% downpayment or 100% full payment to move to Proofing.";
    };

    const buildProofingHint = (order) => {
        const status = String(order.admin.proof.status || "Not Sent");
        if (!order.admin.proof.mockupDataUrl) return "Upload a layout mockup to start proofing.";
        if (status === "Not Sent") return "Upload complete. Click Send Proof to share to customer.";
        if (status === "Sent") return "Proof sent. Waiting for customer to approve or request revisions.";
        if (status === "Revision Requested") return "Customer requested changes. Upload updated mockup and resend proof.";
        if (status === "Approved") return "Approved by customer. Production can start.";
        return "Proofing.";
    };

    const buildFulfillmentHint = (order) => {
        const wf = order.admin.workflowStatus;
        if (wf === "In Progress") return "Production is ongoing. Mark Ready to Ship when finished.";
        if (wf === "Ready to Ship") return "Enter J&T tracking number, then set On Transit.";
        if (wf === "On Transit") return `Tracking: ${order.admin.trackingNumber || "-"}`;
        return "-";
    };

    const hydrateStageValues = (order) => {
        const mockupPreview = qs("#mockupUploadPreview");
        const trackingInput = qs("#trackingNumber");
        renderPreview(mockupPreview, order.admin.proof.mockupDataUrl, "Mockup preview");

        if (trackingInput) trackingInput.value = order.admin.trackingNumber || "";
    };

    const wireStageHandlers = (orderId) => {
        const rejectBtn = qs("#rejectBtn");
        const acceptProceedBtn = qs("#acceptProceedBtn");

        const verifyDownBtn = qs("#verifyDownBtn");
        const verifyFullBtn = qs("#verifyFullBtn");
        const viewReceiptBtn = qs("#viewReceiptBtn");

        const mockupUpload = qs("#mockupUpload");
        const sendProofBtn = qs("#sendProofBtn");
        const readyToShipBtn = qs("#readyToShipBtn");

        const trackingNumberInput = qs("#trackingNumber");
        const onTransitBtn = qs("#onTransitBtn");

        const markCompletedBtn = qs("#markCompletedBtn");

        rejectBtn?.addEventListener("click", async () => {
            const order = window.AdminStore.getOrderById(orderId);
            if (!order) return;
            const ok = await uiConfirm("Reject this order?", { title: "Reject Order", tone: "danger", okText: "Reject", cancelText: "Cancel" });
            if (!ok) return;
            window.AdminStore.updateOrder(orderId, (o) => {
                o.admin.workflowStatus = "Rejected";
                o.status = "cancelled";
                return o;
            });
            loadAndRender();
        });

        acceptProceedBtn?.addEventListener("click", () => {
            const order = window.AdminStore.getOrderById(orderId);
            if (!order) return;
            syncPricingAndStockToOrder(orderId);

            const refreshed = window.AdminStore.getOrderById(orderId);
            if (!refreshed) return;
            if (!canAccept(refreshed)) {
                uiAlert(computeAcceptHint(refreshed), { title: "Cannot Accept Yet", tone: "info" });
                return;
            }

            window.AdminStore.updateOrder(orderId, (o) => {
                o.admin.accepted = true;
                o.admin.workflowStatus = "Awaiting Payment";
                return o;
            });
            loadAndRender();
        });

        viewReceiptBtn?.addEventListener("click", () => {
            const order = window.AdminStore.getOrderById(orderId);
            const dataUrl = order?.admin?.payment?.receiptDataUrl;
            if (!dataUrl) return;
            openReceiptUrl(dataUrl);
        });

        const verifyPayment = (type) => {
            const order = window.AdminStore.getOrderById(orderId);
            if (!order) return;

            if (order.admin.workflowStatus !== "Awaiting Payment") {
                uiAlert("Payment verification is only available in the Awaiting Payment stage.", { title: "Payment", tone: "info" });
                return;
            }

            if (!order.admin.payment.receiptDataUrl) {
                uiAlert("No receipt uploaded yet.", { title: "Payment", tone: "info" });
                return;
            }

            if (order.admin.payment.method === "COD" && type !== "downpayment") {
                uiAlert("COD requires verifying the 50% downpayment.", { title: "COD Rule", tone: "info" });
                return;
            }

            const run = async () => {
                const label = type === "downpayment" ? "50% downpayment" : "100% full payment";
                const ok = await uiConfirm(`Confirm payment verification: ${label}?`, {
                    title: "Confirm Payment",
                    tone: "danger",
                    okText: "Confirm",
                    cancelText: "Cancel",
                });
                if (!ok) return;

                window.AdminStore.updateOrder(orderId, (o) => {
                    o.admin.payment.verified = true;
                    o.admin.payment.verifiedType = type;
                    return o;
                });

                // After payment is verified, move to Proofing (not production yet).
                ensureProofing(orderId);
                loadAndRender();
            };

            run();
        };

        verifyDownBtn?.addEventListener("click", () => verifyPayment("downpayment"));
        verifyFullBtn?.addEventListener("click", () => verifyPayment("full"));

        mockupUpload?.addEventListener("change", async () => {
            const file = mockupUpload.files?.[0];
            if (!file) return;
            const dataUrl = await readFileAsDataUrl(file);
            window.AdminStore.updateOrder(orderId, (o) => {
                o.admin.proof.mockupDataUrl = dataUrl;
                return o;
            });
            loadAndRender();
        });

        sendProofBtn?.addEventListener("click", () => {
            const order = window.AdminStore.getOrderById(orderId);
            if (!order) return;
            if (order.admin.workflowStatus !== "Proofing") {
                uiAlert("Proofing is only available after payment is verified.", { title: "Proofing", tone: "info" });
                return;
            }
            if (!order.admin.proof.mockupDataUrl) {
                uiAlert("Upload a mockup first.", { title: "Proofing", tone: "info" });
                return;
            }
            window.AdminStore.updateOrder(orderId, (o) => {
                o.admin.proof.status = "Sent";
                return o;
            });
            loadAndRender();
        });

        readyToShipBtn?.addEventListener("click", () => {
            const order = window.AdminStore.getOrderById(orderId);
            if (!order) return;
            if (order.admin.workflowStatus !== "In Progress") {
                uiAlert("Order must be In Progress first.", { title: "Fulfillment", tone: "info" });
                return;
            }
            window.AdminStore.updateOrder(orderId, (o) => {
                o.admin.workflowStatus = "Ready to Ship";
                return o;
            });
            loadAndRender();
        });

        trackingNumberInput?.addEventListener("input", () => {
            window.AdminStore.updateOrder(orderId, (o) => {
                o.admin.trackingNumber = String(trackingNumberInput.value || "").trim();
                return o;
            });
        });

        onTransitBtn?.addEventListener("click", () => {
            const order = window.AdminStore.getOrderById(orderId);
            if (!order) return;
            if (order.admin.workflowStatus !== "Ready to Ship") {
                uiAlert("Order must be Ready to Ship first.", { title: "Shipping", tone: "info" });
                return;
            }
            const tracking = String(trackingNumberInput?.value || "").trim();
            if (!tracking) {
                uiAlert("Enter the J&T tracking number.", { title: "Shipping", tone: "info" });
                return;
            }
            window.AdminStore.updateOrder(orderId, (o) => {
                o.admin.trackingNumber = tracking;
                o.admin.workflowStatus = "On Transit";
                return o;
            });
            loadAndRender();
        });

        markCompletedBtn?.addEventListener("click", () => {
            const order = window.AdminStore.getOrderById(orderId);
            if (!order) return;
            if (order.admin.workflowStatus !== "On Transit") {
                uiAlert("Order must be On Transit first.", { title: "Shipping", tone: "info" });
                return;
            }
            window.AdminStore.updateOrder(orderId, (o) => {
                o.admin.workflowStatus = "Completed";
                o.status = "completed";
                return o;
            });
            loadAndRender();
        });
    };

    const addComment = (orderId, message) => {
        const msg = String(message || "").trim();
        if (!msg) return;
        window.AdminStore.updateOrder(orderId, (o) => {
            if (!Array.isArray(o.admin.comments)) o.admin.comments = [];
            o.admin.comments.push({ author: "Admin", message: msg, at: new Date().toISOString() });
            return o;
        });
    };

    const render = (orderId, order) => {
        orderIdEl.textContent = order.id;
        orderDateEl.textContent = formatDate(order.date);
        workflowPill.textContent = getWorkflowDisplay(order.admin.workflowStatus);

        const cust = getCustomerSummary(order);
        if (customerNameEl) customerNameEl.textContent = cust.customerName;
        if (customerMobileEl) customerMobileEl.textContent = cust.mobile;

        if (stockConfirmedInput) stockConfirmedInput.checked = Boolean(order.admin.stockConfirmed);
        if (basePriceInput) basePriceInput.value = order.admin.quote.basePrice != null ? String(order.admin.quote.basePrice) : "";
        if (shippingFeeInput) shippingFeeInput.value = order.admin.quote.shippingFee != null ? String(order.admin.quote.shippingFee) : "";

        renderStepper(order);
        renderRemainingBalance(order);
        renderDesignSummaryLine(order);
        renderOrderContents(order);
        ensureProductsIndex().then(() => {
            renderOrderContents(order);
        });
        renderStageActions(orderId, order);
        renderComments(order);
    };

    const loadAndRender = () => {
        const id = getOrderIdFromQuery();
        if (!id) {
            uiAlert("Missing order id.", { title: "Order", tone: "danger" });
            window.location.replace("admin-orders.html");
            return;
        }

        const numeric = extractNumericOrderId(id);
        if (Number.isFinite(numeric)) {
            // Always treat numeric ids as DB-backed orders.
            setReadOnlyUi();
            loadDbOrderById(numeric)
                .then((order) => {
                    if (!order) {
                        uiAlert("Order not found.", { title: "Order", tone: "danger" });
                        window.location.replace("admin-orders.html");
                        return;
                    }
                    renderReadOnly(numeric, order);
                })
                .catch((e) => {
                    uiAlert(e?.message || "Failed to load order.", { title: "Order", tone: "danger" });
                    window.location.replace("admin-orders.html");
                });
            return;
        }

        const order = window.AdminStore.getOrderById(id);
        if (!order) {
            uiAlert("Order not found.", { title: "Order", tone: "danger" });
            window.location.replace("admin-orders.html");
            return;
        }

        render(id, order);
    };

    const main = () => {
        const id = getOrderIdFromQuery();
        if (!id) {
            loadAndRender();
            return;
        }

        // DB-backed orders: do not wire localStorage-based interactions.
        const numeric = extractNumericOrderId(id);
        if (Number.isFinite(numeric)) {
            loadAndRender();
            return;
        }

        stockConfirmedInput?.addEventListener("change", () => {
            syncPricingAndStockToOrder(id);
            loadAndRender();
        });

        basePriceInput?.addEventListener("input", () => {
            syncPricingAndStockToOrder(id);
            loadAndRender();
        });

        shippingFeeInput?.addEventListener("input", () => {
            syncPricingAndStockToOrder(id);
            loadAndRender();
        });

        sendCommentBtn?.addEventListener("click", () => {
            addComment(id, commentInput?.value || "");
            if (commentInput) commentInput.value = "";
            loadAndRender();
        });

        commentInput?.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                addComment(id, commentInput.value);
                commentInput.value = "";
                loadAndRender();
            }
        });

        window.addEventListener("storage", (e) => {
            if (e.key === "orders") loadAndRender();
        });

        loadAndRender();
    };

    main();
})();


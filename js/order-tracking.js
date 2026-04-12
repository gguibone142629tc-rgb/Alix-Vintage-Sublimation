(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);

    const orderTitleEl = qs("#orderTitle");
    const orderPlacedAtEl = qs("#orderPlacedAt");
    const orderPillEl = qs("#orderPill");

    const statusTitleEl = qs("#statusTitle");
    const statusBodyEl = qs("#statusBody");

    const summaryTypeEl = qs("#summaryType");
    const summaryQtyEl = qs("#summaryQty");
    const summaryPaymentEl = qs("#summaryPayment");

    const paymentPanelEl = qs("#paymentPanel");
    const paymentNoteEl = qs("#paymentNote");
    const paymentTotalEl = qs("#paymentTotal");
    const paymentDownpaymentEl = qs("#paymentDownpayment");
    const paymentReceiptUploadEl = qs("#paymentReceiptUpload");
    const paymentReceiptPreviewEl = qs("#paymentReceiptPreview");
    const uploadReceiptBtnEl = qs("#uploadReceiptBtn");
    const paymentStateEl = qs("#paymentState");
    const paymentRequiredLabelEl = qs("#paymentRequiredLabel");

    const balancePanelEl = qs("#balancePanel");
    const balanceTotalEl = qs("#balanceTotal");
    const balancePaidEl = qs("#balancePaid");
    const balanceRemainingEl = qs("#balanceRemaining");

    const proofPanelEl = qs("#proofPanel");
    const proofNoteEl = qs("#proofNote");
    const proofItemPickerEl = qs("#proofItemPicker");
    const proofItemSelectEl = qs("#proofItemSelect");
    const proofPreviewEl = qs("#proofPreview");
    const approveProofBtnEl = qs("#approveProofBtn");
    const requestRevisionBtnEl = qs("#requestRevisionBtn");
    const proofActionsEl = qs("#proofActions");

    const commentsPanelEl = qs("#commentsPanel");
    const commentsListEl = qs("#commentsList");

    const ordersListPanelEl = qs("#ordersListPanel");
    const ordersSearchInputEl = qs("#ordersSearchInput");
    const ordersWorkflowTabsEl = qs("#ordersWorkflowTabs");
    const ordersTableBodyEl = qs("#ordersTableBody");
    const orderDetailViewEl = qs("#orderDetailView");

    const orderContentsEl = qs("#orderContents");

    const shippingPanelEl = qs("#shippingPanel");
    const trackingNumberEl = qs("#trackingNumber");
    const copyBtn = qs("#copyTrackingBtn");

    const getQueryParam = (key) => {
        try {
            const url = new URL(window.location.href);
            return url.searchParams.get(key);
        } catch {
            return null;
        }
    };

    const safeJsonParse = (value, fallback) => {
        try {
            const parsed = JSON.parse(value);
            return parsed == null ? fallback : parsed;
        } catch {
            return fallback;
        }
    };

    const readFileAsDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const formatDate = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
    };

    const escapeHtml = (s) =>
        String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const cleanNote = (value) => {
        const s = String(value ?? "").trim();
        if (!s) return "";
        const idx = s.toLowerCase().lastIndexOf("| notes:");
        if (idx >= 0) {
            return s.slice(idx + "| notes:".length).trim();
        }
        return s;
    };

    const formatMoney = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`;

    const proofItemSelectionByOrder = new Map();

    const getApiBaseUrl = () => {
        if (window.AlixAuth && typeof window.AlixAuth.apiBaseUrl === "function") {
            return window.AlixAuth.apiBaseUrl();
        }

        const origin = window.location && window.location.origin ? window.location.origin : "";
        if (origin && origin !== "null") return origin;
        return "http://localhost:8000";
    };

    const resolveImageUrl = (path) => {
        const raw = String(path || "").trim();
        if (!raw) return null;
        if (/^data:/i.test(raw)) return raw;
        if (/^https?:\/\//i.test(raw)) return raw;

        const base = getApiBaseUrl().replace(/\/$/, "");
        return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw.replace(/^[.\/]+/, "")}`;
    };

    let productsCache = null;
    let productsCachePromise = null;

    const loadProductsOnce = async () => {
        if (Array.isArray(productsCache)) return productsCache;
        if (productsCachePromise) return productsCachePromise;

        productsCachePromise = fetch(getApiBaseUrl() + "/api/products", {
            method: "GET",
            headers: { Accept: "application/json" },
        })
            .then((res) =>
                res
                    .json()
                    .catch(() => ({}))
                    .then((data) => ({ res, data }))
            )
            .then(({ res, data }) => {
                if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed to load products");
                const rows = Array.isArray(data?.products) ? data.products : [];
                productsCache = rows.map((p) => ({
                    id: Number(p?.product_id || 0),
                    name: String(p?.product_name || "").trim(),
                    imagePath: p?.image_path || null,
                    images: Array.isArray(p?.images) ? p.images : [],
                }));
                return productsCache;
            })
            .catch(() => {
                productsCache = [];
                return productsCache;
            })
            .finally(() => {
                productsCachePromise = null;
            });

        return productsCachePromise;
    };

    const ensureProductsLoadedForImages = (orderRawId) => {
        if (Array.isArray(productsCache) && productsCache.length) return;
        if (productsCachePromise) return;

        void loadProductsOnce().then(() => {
            const current = getCurrentOrder();
            if (!current) return;
            if (orderRawId != null && String(current.rawId) !== String(orderRawId)) return;
            renderOrderContents(current);
        });
    };

    let activeDialogCleanup = null;

    const showThemedDialog = ({ title, message, tone } = {}) => {
        if (typeof activeDialogCleanup === "function") {
            activeDialogCleanup();
            activeDialogCleanup = null;
        }

        const safeTitle = String(title || "Notice").trim() || "Notice";
        const safeMessage = String(message || "").trim();
        const safeTone = String(tone || "info").trim() || "info"; // info | success | danger

        const backdrop = document.createElement("div");
        backdrop.className = "av-dialog-backdrop";

        const dialog = document.createElement("div");
        dialog.className = `av-dialog av-dialog--${safeTone}`;
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");

        dialog.innerHTML = `
            <div class="av-dialog-head">
                <div class="av-dialog-title">${escapeHtml(safeTitle)}</div>
            </div>
            <div class="av-dialog-body">
                <div class="av-dialog-desc">${escapeHtml(safeMessage)}</div>
            </div>
            <div class="av-dialog-actions">
                <button type="button" class="av-dialog-btn">OK</button>
            </div>
        `;

        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);

        const okBtn = dialog.querySelector(".av-dialog-btn");

        const close = () => {
            window.removeEventListener("keydown", onKeyDown, true);
            backdrop.removeEventListener("click", onBackdropClick);
            okBtn?.removeEventListener("click", close);
            backdrop.remove();
            if (activeDialogCleanup === cleanup) {
                activeDialogCleanup = null;
            }
        };

        const onBackdropClick = (e) => {
            if (e.target === backdrop) close();
        };

        const onKeyDown = (e) => {
            if (e.key === "Escape") close();
        };

        const cleanup = close;
        activeDialogCleanup = cleanup;

        backdrop.addEventListener("click", onBackdropClick);
        window.addEventListener("keydown", onKeyDown, true);
        okBtn?.addEventListener("click", close);

        setTimeout(() => okBtn?.focus(), 0);
    };

    const uiPromptRevisionNote = ({ title, message, placeholder, okText, cancelText } = {}) =>
        new Promise((resolve) => {
            const safeTitle = String(title || "Revision").trim() || "Revision";
            const safeMessage = String(message || "").trim();
            const safePlaceholder = String(placeholder || "Add instructions for revision...");
            const safeOkText = String(okText || "Request").trim() || "Request";
            const safeCancelText = String(cancelText || "Cancel").trim() || "Cancel";

            const backdrop = document.createElement("div");
            backdrop.className = "av-dialog-backdrop";

            const dialog = document.createElement("div");
            dialog.className = "av-dialog av-dialog--info";
            dialog.setAttribute("role", "dialog");
            dialog.setAttribute("aria-modal", "true");

            dialog.innerHTML = `
                <div class="av-dialog-head">
                    <div class="av-dialog-title">${escapeHtml(safeTitle)}</div>
                </div>
                <div class="av-dialog-body">
                    ${safeMessage ? `<div class="av-dialog-desc">${escapeHtml(safeMessage)}</div>` : ""}
                    <textarea class="comment-input" id="avRevisionNote" rows="4" placeholder="${escapeHtml(safePlaceholder)}"></textarea>
                </div>
                <div class="av-dialog-actions">
                    <button type="button" class="av-dialog-btn" data-act="cancel">${escapeHtml(safeCancelText)}</button>
                    <button type="button" class="av-dialog-btn" data-act="ok">${escapeHtml(safeOkText)}</button>
                </div>
            `;

            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);

            const cleanup = () => {
                backdrop.remove();
            };

            const noteEl = dialog.querySelector("#avRevisionNote");
            const cancelBtn = dialog.querySelector('[data-act="cancel"]');
            const okBtn = dialog.querySelector('[data-act="ok"]');

            const onCancel = () => {
                cleanup();
                resolve(null);
            };

            const onOk = () => {
                const value = String(noteEl?.value || "").trim();
                cleanup();
                resolve(value);
            };

            cancelBtn?.addEventListener("click", onCancel);
            okBtn?.addEventListener("click", onOk);
            backdrop.addEventListener("click", (e) => {
                if (e.target === backdrop) onCancel();
            });
            document.addEventListener(
                "keydown",
                (e) => {
                    if (e.key === "Escape") onCancel();
                },
                { once: true },
            );

            setTimeout(() => {
                if (noteEl && typeof noteEl.focus === "function") noteEl.focus();
            }, 0);
        });

    const uiAlert = (message, opts = {}) => {
        const tone = String(opts.tone || "info").trim() || "info";
        const title = tone === "success" ? "Success" : tone === "danger" ? "Error" : "Notice";
        showThemedDialog({
            title,
            message,
            tone,
        });
    };

    const uiConfirm = (messageOrOptions, opts = {}) =>
        new Promise((resolve) => {
            const options =
                typeof messageOrOptions === "string"
                    ? { ...opts, message: messageOrOptions }
                    : (messageOrOptions && typeof messageOrOptions === "object" ? messageOrOptions : {});

            const { message, tone, okText, cancelText } = options;

            const safeTitle = "Confirm";
            const safeMessage = String(message || "Are you sure?").trim() || "Are you sure?";
            const safeTone = String(tone || "danger").trim() || "danger";
            const safeOkText = String(okText || "OK").trim() || "OK";
            const safeCancelText = String(cancelText || "Cancel").trim() || "Cancel";

            const backdrop = document.createElement("div");
            backdrop.className = "av-dialog-backdrop";

            const dialog = document.createElement("div");
            dialog.className = `av-dialog av-dialog--${safeTone}`;
            dialog.setAttribute("role", "dialog");
            dialog.setAttribute("aria-modal", "true");

            dialog.innerHTML = `
                <div class="av-dialog-head">
                    <div class="av-dialog-title">${escapeHtml(safeTitle)}</div>
                </div>
                <div class="av-dialog-body">
                    <div class="av-dialog-desc">${escapeHtml(safeMessage)}</div>
                </div>
                <div class="av-dialog-actions">
                    <button type="button" class="av-dialog-btn" data-act="cancel">${escapeHtml(safeCancelText)}</button>
                    <button type="button" class="av-dialog-btn" data-act="ok">${escapeHtml(safeOkText)}</button>
                </div>
            `;

            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);

            const cancelBtn = dialog.querySelector('[data-act="cancel"]');
            const okBtn = dialog.querySelector('[data-act="ok"]');

            const cleanup = () => {
                window.removeEventListener("keydown", onKeyDown, true);
                backdrop.removeEventListener("click", onBackdropClick);
                cancelBtn?.removeEventListener("click", onCancel);
                okBtn?.removeEventListener("click", onOk);
                backdrop.remove();
            };

            const onCancel = () => {
                cleanup();
                resolve(false);
            };

            const onOk = () => {
                cleanup();
                resolve(true);
            };

            const onBackdropClick = (e) => {
                if (e.target === backdrop) onCancel();
            };

            const onKeyDown = (e) => {
                if (e.key === "Escape") onCancel();
            };

            cancelBtn?.addEventListener("click", onCancel);
            okBtn?.addEventListener("click", onOk);
            backdrop.addEventListener("click", onBackdropClick);
            window.addEventListener("keydown", onKeyDown, true);

            setTimeout(() => okBtn?.focus(), 0);
        });

    const getWorkflowStepIndex = (workflowStatus) => {
        const wf = String(workflowStatus || "");
        if (wf === "Awaiting Payment") return 1;
        if (wf === "Proofing") return 2;
        if (wf === "In Progress") return 3;
        if (wf === "Awaiting Final Payment") return 4;
        if (wf === "Ready to Ship") return 5;
        if (wf === "On Transit") return 6;
        if (wf === "Completed") return 7;
        return 0;
    };

    const getWorkflowDisplay = (workflowStatus) => {
        const wf = String(workflowStatus || "Pending");
        if (wf === "Pending" || wf === "Revision Requested") return "Pending Review";
        return wf;
    };

    const isAuthed = () => Boolean(localStorage.getItem("alix_auth_token"));

    const dbStatusToWorkflow = (status) => {
        const s = String(status || "pending").toLowerCase();
        if (s === "completed") return "Completed";
        if (s === "cancelled") return "Completed";
        if (s === "shipped") return "On Transit";
        if (s === "ready_to_ship") return "Ready to Ship";
        if (s === "awaiting_final_payment") return "Awaiting Final Payment";
        if (s === "proofing") return "Proofing";
        if (s === "processing") return "In Progress";
        if (s === "paid") return "Awaiting Payment";
        return "Pending Review";
    };

    const normalizeOrders = (apiOrders) => {
        const list = Array.isArray(apiOrders) ? apiOrders : [];
        return list.map((row) => {
            const o = row?.order || {};
            const items = Array.isArray(row?.items) ? row.items : [];
            const designProof = row?.design_proof && typeof row.design_proof === "object" ? row.design_proof : null;
            const orderId = o.order_id;

            const metaFromApi = (o.meta && typeof o.meta === "object") ? o.meta : {};

            const mapDesignProofStatus = (s) => {
                const v = String(s || "").toLowerCase();
                if (v === "approved") return "Approved";
                if (v === "rejected") return "Revision Requested";
                if (v === "submitted" || v === "reviewing") return "Sent";
                return "Not Sent";
            };

            const meta = { ...metaFromApi };
            if (designProof) {
                meta.proof = {
                    status: mapDesignProofStatus(designProof.proof_status),
                    mockup_data_url: String(designProof.proof_file_path || ""),
                    revision_note: designProof.revision_note ?? null,
                    version_number: designProof.version_number ?? null,
                };
            }

            return {
                id: orderId != null ? `ORD-${orderId}` : "ORD-?",
                rawId: orderId,
                date: o.created_at || null,
                status: String(o.status || "pending"),
                orderType: String(o.order_type || ""),
                tracking_number: o.tracking_number != null ? String(o.tracking_number) : null,
                meta,
                base_price: Number(o.base_price || 0) || 0,
                shipping_fee: Number(o.shipping_fee || 0) || 0,
                total: 0,
                items: items.map((it) => ({
                    id: it?.order_item_id ?? it?.orderItemId ?? null,
                    product_id: it?.product_id ?? null,
                    name: it?.meta?.product_name || `Product #${it?.product_id ?? ""}`,
                    quantity: Number(it?.quantity || 0) || 0,
                    meta: it?.meta || {},
                    total_amount: Number(it?.total_amount || 0) || 0,
                    design_proof: it?.design_proof && typeof it.design_proof === "object"
                        ? {
                            status: mapDesignProofStatus(it.design_proof.proof_status),
                            mockup_data_url: String(it.design_proof.proof_file_path || ""),
                            revision_note: it.design_proof.revision_note ?? null,
                            version_number: it.design_proof.version_number ?? null,
                        }
                        : null,
                })),
            };
        });
    };

    const getProofingItems = (order) => {
        const items = Array.isArray(order?.items) ? order.items : [];
        return items.filter((it) => Number.isFinite(Number(it?.id)) && Number(it.id) > 0);
    };

    const getSelectedProofItem = (order) => {
        const items = getProofingItems(order);
        if (items.length === 0) return null;

        const orderKey = String(order?.rawId ?? "");
        const selectedId = Number(proofItemSelectionByOrder.get(orderKey) || 0);
        const selected = items.find((it) => Number(it.id) === selectedId);
        return selected || items[0];
    };

    const isInProcessOrder = (order) => {
        const s = String(order?.status || "").toLowerCase();
        return s !== "completed" && s !== "cancelled";
    };

    const computeStatusCard = (workflowStatus) => {
        const wf = getWorkflowDisplay(workflowStatus);

        if (wf === "Pending Review") {
            return {
                title: "PENDING REVIEW",
                body: "Your order has been received and is waiting for admin review.",
            };
        }

        if (wf === "Awaiting Payment") {
            return {
                title: "AWAITING PAYMENT",
                body: "Please pay the required 50% downpayment and upload your receipt screenshot. Admin will verify before proofing.",
            };
        }

        if (wf === "Awaiting Final Payment") {
            return {
                title: "AWAITING FINAL PAYMENT",
                body: "Please upload your final payment receipt screenshot (remaining balance). Admin will verify before shipping.",
            };
        }

        if (wf === "Proofing") {
            return {
                title: "PROOFING",
                body: "Review the design proof. Approve to start production or request a revision.",
            };
        }

        if (wf === "In Progress") {
            return {
                title: "IN PRODUCTION",
                body: "Your order is currently being prepared and produced.",
            };
        }

        if (wf === "Ready to Ship") {
            return {
                title: "READY TO SHIP",
                body: "Your order is packed and will be handed to the courier soon.",
            };
        }

        if (wf === "On Transit") {
            return {
                title: "ON TRANSIT",
                body: "Your order is with the courier. Use the tracking number below.",
            };
        }

        if (wf === "Completed") {
            return {
                title: "COMPLETED",
                body: "Order delivered/completed. Thank you for ordering!",
            };
        }

        return { title: wf.toUpperCase(), body: "" };
    };

    let orders = [];

    const loadOrders = async () => {
        if (!isAuthed()) {
            const message = "Please log in first to view your orders.";
            window.AVDialog?.alert(message, { title: "Notice", tone: "info" }) || alert(message);
            window.location.href = "login.html";
            return;
        }

        try {
            const res = await window.AlixCart.listOrders({ limit: 200, offset: 0 });
            orders = normalizeOrders(res?.orders);
        } catch (error) {
            const message = error?.message || "Failed to load orders.";
            uiAlert(message, { tone: "danger" });
            orders = [];
        }
    };

    const getOrderByRawId = (rawId) => {
        if (rawId === null || rawId === undefined || rawId === "") return null;
        return orders.find((o) => String(o.rawId) === String(rawId)) || null;
    };

    const getCurrentOrder = () => {
        const id = getQueryParam("id");
        if (!id) return null;
        return getOrderByRawId(id);
    };

    const renderStepper = (workflowStatus) => {
        const wf = String(workflowStatus || "");
        const current = getWorkflowStepIndex(wf);
        const isCompleted = wf === "Completed";
        document.querySelectorAll(".stepper .step").forEach((el) => {
            const step = Number(el.getAttribute("data-step"));
            const isStep = Number.isFinite(step);
            el.classList.toggle("is-done", isStep && (step < current || (isCompleted && step === current)));
            el.classList.toggle("is-active", isStep && step === current && !isCompleted);
        });
    };

    const renderOrderContents = (order) => {
        if (!orderContentsEl) return;

        ensureProductsLoadedForImages(order?.rawId);

        const items = Array.isArray(order?.items) ? order.items : [];
        if (items.length === 0) {
            orderContentsEl.innerHTML = `<div class="empty-state"><p>No items found.</p></div>`;
            return;
        }

        const renderMetaLine = (label, value) => {
            const v = String(value ?? "").trim();
            if (!v) return "";
            return `<div class="order-content-meta-line"><span class="k">${escapeHtml(label)}</span><div class="v">${escapeHtml(v)}</div></div>`;
        };

        const normalizeRoster = (meta) => {
            if (!meta || typeof meta !== "object") return [];

            const rosterRaw = meta.roster;
            if (Array.isArray(rosterRaw) && rosterRaw.length) {
                return rosterRaw
                    .filter((r) => r && typeof r === "object")
                    .map((r) => ({
                        name: r.name ?? r.playerName ?? "-",
                        number: r.number ?? r.jerseyNumber ?? "-",
                        size: r.size ?? "-",
                    }));
            }

            const playerName = meta.playerName ?? meta.player_name ?? meta.customerName ?? meta.name;
            const jerseyNumber = meta.jerseyNumber ?? meta.jersey_number ?? meta.customerNumber ?? meta.number;
            const size = meta.size ?? meta.jerseySize;
            const hasAny = String(playerName ?? "").trim() || String(jerseyNumber ?? "").trim() || String(size ?? "").trim();
            if (!hasAny) return [];

            return [
                {
                    name: playerName ?? "-",
                    number: jerseyNumber ?? "-",
                    size: size ?? "-",
                },
            ];
        };

        const renderRosterTable = (roster) => {
            if (!Array.isArray(roster) || roster.length === 0) return "";

            const rows = roster
                .filter((r) => r && typeof r === "object")
                .map((r, idx) => {
                    const name = r.name ?? r.playerName ?? "-";
                    const number = r.number ?? r.jerseyNumber ?? "-";
                    const size = r.size ?? "-";
                    return `
                        <tr>
                            <td>${escapeHtml(idx + 1)}</td>
                            <td>${escapeHtml(name)}</td>
                            <td>${escapeHtml(size)}</td>
                            <td>${escapeHtml(number)}</td>
                        </tr>
                    `;
                })
                .join("");

            return `
                <div class="order-content-roster">
                    <div class="table-container">
                        <table class="orders-table">
                            <thead>
                                <tr>
                                    <th>NO</th>
                                    <th>NAME</th>
                                    <th>SIZE</th>
                                    <th>JERSEY NUMBER</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows || ""}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        };

        orderContentsEl.innerHTML = `
            <div class="order-contents">
                ${items
                    .map((it) => {
                        const meta = it && typeof it.meta === "object" && it.meta ? it.meta : {};

                        const pickCustomDesignImage = () => {
                            const cd = meta.custom_design && typeof meta.custom_design === "object" ? meta.custom_design : null;
                            const files = cd && cd.files && typeof cd.files === "object" ? cd.files : null;
                            if (!files) return null;

                            const mainPath = files.main && typeof files.main === "object" ? files.main.path : null;
                            const logoPath = files.logo && typeof files.logo === "object" ? files.logo.path : null;
                            const refs = Array.isArray(files.references) ? files.references : [];
                            const refPath = refs
                                .map((r) => (r && typeof r === "object" ? r.path : null))
                                .find((p) => typeof p === "string" && p.trim() !== "");

                            return resolveImageUrl(mainPath || refPath || logoPath);
                        };

                        const itemProductId = it?.product_id != null ? Number(it.product_id) : 0;
                        const metaImage = meta.image_path ?? meta.imagePath ?? meta.product_image ?? meta.productImage;

                        let imageUrl = pickCustomDesignImage() || resolveImageUrl(metaImage);
                        if (!imageUrl && itemProductId > 0 && Array.isArray(productsCache) && productsCache.length) {
                            const product = productsCache.find((p) => p.id === itemProductId);
                            const images = Array.isArray(product?.images) ? product.images : [];

                            const viewMap = new Map(
                                images
                                    .map((img) => [String(img?.view_type || "").trim().toLowerCase(), resolveImageUrl(img?.image_path)])
                                    .filter(([view, url]) => Boolean(view) && Boolean(url))
                            );

                            imageUrl =
                                viewMap.get("full") ||
                                viewMap.get("front") ||
                                viewMap.get("back") ||
                                viewMap.get("lower") ||
                                resolveImageUrl(product?.imagePath || null);
                        }

                        const groupName = meta.groupName ?? meta.teamName ?? meta.team_name;
                        // Note is shown in Comments & Revisions; keep Order Contents clean.

                        const roster = normalizeRoster(meta);

                        const qty = Number(it.quantity || 0) || 0;
                        const lineTotal = Number(it.total_amount || 0) || 0;

                        const metaLines = [
                            renderMetaLine("Group", groupName),
                        ]
                            .filter(Boolean)
                            .join("");

                        const imageHtml = imageUrl
                            ? `<div class="order-content-media"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(it.name || "Product")}" loading="lazy" /></div>`
                            : "";

                        return `
                            <div class="order-content-item">
                                <div class="order-content-top">
                                    ${imageHtml}
                                    <div class="order-content-main">
                                        <div class="order-content-head">
                                            <div class="order-content-name">${escapeHtml(it.name || "-")}</div>
                                            <div class="order-content-sub">x${escapeHtml(qty)} • ${escapeHtml(formatMoney(lineTotal))}</div>
                                        </div>
                                        ${metaLines ? `<div class="order-content-meta">${metaLines}</div>` : ""}
                                    </div>
                                </div>
                                ${renderRosterTable(roster)}
                            </div>
                        `;
                    })
                    .join("")}
            </div>
        `;
    };

    const renderImagePreview = (container, dataUrl, alt) => {
        if (!container) return;
        container.innerHTML = "";
        if (!dataUrl) {
            container.textContent = "No image yet.";
            return;
        }
        const img = document.createElement("img");
        img.src = dataUrl;
        img.alt = alt;
        img.loading = "lazy";
        container.appendChild(img);
    };

    const renderComments = (order) => {
        if (!commentsListEl) return;
        const raw = order?.meta?.comments;
        const comments = Array.isArray(raw) ? raw : [];
        const normalized = comments
            .filter((c) => c && typeof c === "object")
            .map((c) => ({
                author: String(c.author || "Customer"),
                message: cleanNote(String(c.message || "")),
                at: typeof c.at === "string" ? c.at : "",
            }))
            .filter((c) => c.message.trim() !== "");

        // Fallback: if no stored comments, show item note (custom design / legacy orders).
        if (normalized.length === 0) {
            const items = Array.isArray(order?.items) ? order.items : [];
            const note = items
                .map((it) => (it && typeof it.meta === "object" && it.meta ? it.meta : {}))
                .map((m) => cleanNote(String(m.note ?? m.notes ?? "").trim()))
                .find((v) => v);
            if (note) {
                const at = typeof order?.date === "string" ? order.date : "";
                normalized.push({ author: "Customer", message: note, at });
            }
        }

        if (normalized.length === 0) {
            commentsListEl.innerHTML = `<div class="mini-note">No comments yet.</div>`;
            return;
        }

        commentsListEl.innerHTML = normalized
            .slice()
            .sort((a, b) => String(a.at).localeCompare(String(b.at)))
            .map((c) => {
                const at = c.at ? formatDate(c.at) : "-";
                return `
                    <div class="comment-card">
                        <div class="comment-meta">
                            <span class="comment-author">${escapeHtml(c.author)}</span>
                            <span>${escapeHtml(at)}</span>
                        </div>
                        <div class="comment-body">${escapeHtml(c.message)}</div>
                    </div>
                `;
            })
            .join("");
    };

    const computeTotals = (order) => {
        const items = Array.isArray(order?.items) ? order.items : [];
        const itemsTotal = items.reduce((sum, it) => sum + Number(it?.total_amount || 0), 0);

        const base = Number(order?.base_price ?? order?.basePrice ?? 0);
        const shipping = Number(order?.shipping_fee ?? order?.shippingFee ?? 0);

        // Match backend computed total: use item totals when available,
        // otherwise fall back to base_price.
        const subtotal = itemsTotal > 0 ? itemsTotal : base;
        const total = Math.round((subtotal + shipping) * 100) / 100;
        const downpayment = Math.round(total * 0.5 * 100) / 100;
        return { total, downpayment };
    };

    const computePaymentAmounts = (order) => {
        const totals = computeTotals(order);
        const paymentMeta = order?.meta?.payment && typeof order.meta.payment === "object" ? order.meta.payment : {};

        const verifiedType = typeof paymentMeta.verified_type === "string" ? paymentMeta.verified_type.toLowerCase() : null;
        const isFinalVerified = paymentMeta.final_verified === true || String(paymentMeta.final_receipt_status || "").toLowerCase() === "verified";

        let amountPaid = Number(paymentMeta.amount_paid);
        if (!Number.isFinite(amountPaid) || amountPaid < 0) amountPaid = 0;

        // Fallback if older records didn't store amount_paid.
        if (amountPaid === 0) {
            if (verifiedType === "full") amountPaid = totals.total;
            if (verifiedType === "downpayment") amountPaid = totals.downpayment;
        }

        if (isFinalVerified) amountPaid = totals.total;

        const remaining = Math.max(0, Math.round((totals.total - amountPaid) * 100) / 100);
        return { total: totals.total, downpayment: totals.downpayment, amountPaid, remaining, verifiedType, isFinalVerified };
    };

    const renderBalancePanel = (order) => {
        if (!balancePanelEl) return;
        balancePanelEl.style.display = order ? "block" : "none";
        if (!order) return;

        const amounts = computePaymentAmounts(order);
        if (balanceTotalEl) balanceTotalEl.textContent = formatMoney(amounts.total);
        if (balancePaidEl) balancePaidEl.textContent = formatMoney(amounts.amountPaid);
        if (balanceRemainingEl) balanceRemainingEl.textContent = formatMoney(amounts.remaining);
    };

    const renderStagePanels = (order) => {
        const workflowDisplay = dbStatusToWorkflow(order?.status);
        const stepIndex = getWorkflowStepIndex(workflowDisplay);

        if (paymentPanelEl) {
            const showPayment = workflowDisplay === "Awaiting Payment" || workflowDisplay === "Awaiting Final Payment";
            paymentPanelEl.style.display = showPayment ? "block" : "none";

            if (showPayment) {
                const amounts = computePaymentAmounts(order);
                if (paymentTotalEl) paymentTotalEl.textContent = formatMoney(amounts.total);

                const paymentMeta = order?.meta?.payment && typeof order.meta.payment === "object" ? order.meta.payment : {};

                const isFinal = workflowDisplay === "Awaiting Final Payment";
                const requiredAmount = isFinal ? amounts.remaining : amounts.downpayment;
                if (paymentDownpaymentEl) paymentDownpaymentEl.textContent = formatMoney(requiredAmount);
                if (paymentRequiredLabelEl) paymentRequiredLabelEl.textContent = isFinal ? "Required Final Payment" : "Required Downpayment (50%)";

                if (paymentNoteEl) {
                    paymentNoteEl.textContent = isFinal
                        ? "Upload your final payment receipt screenshot so admin can verify your payment."
                        : "Upload your downpayment receipt screenshot so admin can verify your payment.";
                }

                const receiptUrl = isFinal
                    ? (typeof paymentMeta.final_receipt_data_url === "string" ? paymentMeta.final_receipt_data_url : "")
                    : (typeof paymentMeta.receipt_data_url === "string" ? paymentMeta.receipt_data_url : "");
                renderImagePreview(paymentReceiptPreviewEl, receiptUrl, "Payment receipt");

                const uploadedAt = isFinal
                    ? (typeof paymentMeta.final_receipt_uploaded_at === "string" ? paymentMeta.final_receipt_uploaded_at : "")
                    : (typeof paymentMeta.receipt_uploaded_at === "string" ? paymentMeta.receipt_uploaded_at : "");
                const verified = isFinal
                    ? (paymentMeta.final_verified === true || String(paymentMeta.final_receipt_status || "").toLowerCase() === "verified")
                    : (paymentMeta.verified === true || String(paymentMeta.receipt_status || "").toLowerCase() === "verified");
                if (paymentStateEl) {
                    if (!receiptUrl) {
                        paymentStateEl.textContent = "No receipt uploaded yet.";
                    } else if (verified) {
                        paymentStateEl.textContent = `Payment verified${uploadedAt ? ` (uploaded ${formatDate(uploadedAt)})` : ""}.`;
                    } else {
                        paymentStateEl.textContent = `Receipt uploaded${uploadedAt ? ` (${formatDate(uploadedAt)})` : ""}. Awaiting admin verification.`;
                    }
                }
            }
        }

        if (proofPanelEl) {
            const showProof = workflowDisplay === "Proofing";
            proofPanelEl.style.display = showProof ? "block" : "none";

            if (showProof) {
                const proofingItems = getProofingItems(order);
                const selectedItem = getSelectedProofItem(order);

                if (proofItemPickerEl) {
                    const showPicker = proofingItems.length > 1;
                    proofItemPickerEl.style.display = showPicker ? "block" : "none";
                }

                if (proofItemSelectEl) {
                    const options = proofingItems
                        .map((it, idx) => {
                            const name = String(it?.name || "").trim();
                            const label = name ? `Order Item ${idx + 1} - ${name}` : `Order Item ${idx + 1}`;
                            const selected = selectedItem && Number(selectedItem.id) === Number(it.id) ? " selected" : "";
                            return `<option value="${escapeHtml(String(it.id))}"${selected}>${escapeHtml(label)}</option>`;
                        })
                        .join("");
                    proofItemSelectEl.innerHTML = options;
                }

                const proofMeta = selectedItem?.design_proof && typeof selectedItem.design_proof === "object"
                    ? selectedItem.design_proof
                    : {};
                const status = String(proofMeta.status || "Not Sent");
                const dataUrl = String(proofMeta.mockup_data_url || proofMeta.mockupDataUrl || "").trim();

                const selectedLabel = (() => {
                    if (!selectedItem) return "";
                    const idx = proofingItems.findIndex((it) => Number(it.id) === Number(selectedItem.id));
                    if (idx < 0) return "";
                    const name = String(selectedItem?.name || "").trim();
                    return name ? `Order Item ${idx + 1} - ${name}` : `Order Item ${idx + 1}`;
                })();

                if (proofNoteEl) {
                    if (!dataUrl) {
                        proofNoteEl.textContent = selectedLabel
                            ? `${selectedLabel}: waiting for admin to send the design proof.`
                            : "Waiting for admin to send the design proof.";
                    } else if (status === "Sent") {
                        proofNoteEl.textContent = selectedLabel
                            ? `${selectedLabel}: review the proof image, then approve or request a revision.`
                            : "Review the proof image, then approve or request a revision.";
                    } else if (status === "Revision Requested") {
                        proofNoteEl.textContent = selectedLabel
                            ? `${selectedLabel}: revision requested. Waiting for updated proof.`
                            : "Revision requested. Waiting for updated proof.";
                    } else if (status === "Approved") {
                        proofNoteEl.textContent = selectedLabel
                            ? `${selectedLabel}: proof approved.`
                            : "Proof approved.";
                    } else {
                        proofNoteEl.textContent = "Proofing.";
                    }
                }

                renderImagePreview(proofPreviewEl, dataUrl, "Design proof");

                const canAct = Boolean(dataUrl) && status === "Sent";
                if (proofActionsEl) proofActionsEl.style.display = canAct ? "flex" : "none";
                if (approveProofBtnEl) approveProofBtnEl.disabled = !canAct;
                if (requestRevisionBtnEl) requestRevisionBtnEl.disabled = !canAct;
            }
        }

        if (shippingPanelEl) {
            const showShipping = stepIndex >= 5;
            shippingPanelEl.style.display = showShipping ? "block" : "none";
        }
    };

    let currentWorkflowFilter = "all";
    let currentSearchTerm = "";

    const renderOrdersList = () => {
        if (!ordersTableBodyEl) return;

        const inProcess = orders.filter(isInProcessOrder);
        const filtered = inProcess
            .filter((o) => {
                const wf = dbStatusToWorkflow(o?.status);
                if (currentWorkflowFilter !== "all" && wf !== currentWorkflowFilter) return false;

                if (!currentSearchTerm) return true;
                const term = currentSearchTerm.toLowerCase();
                const idMatch = String(o.id || "").toLowerCase().includes(term);
                const items = Array.isArray(o.items) ? o.items : [];
                const itemMatch = items.some((it) => String(it.name || "").toLowerCase().includes(term));
                return idMatch || itemMatch;
            })
            .slice()
            .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

        if (filtered.length === 0) {
            ordersTableBodyEl.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <h3>No Orders</h3>
                        <p>No in-process orders found.</p>
                    </td>
                </tr>
            `;
            return;
        }

        ordersTableBodyEl.innerHTML = filtered
            .map((order) => {
                const wf = dbStatusToWorkflow(order?.status);
                const items = Array.isArray(order.items) ? order.items : [];
                const itemsHtml = items
                    .map((it) => `<div class="order-item-line">${escapeHtml(it.name || "-")} (x${escapeHtml(it.quantity || 0)})</div>`)
                    .join("");
                const amount = computeTotals(order).total;
                return `
                    <tr>
                        <td><strong>${escapeHtml(order.id || "-")}</strong></td>
                        <td>${escapeHtml(formatDate(order.date))}</td>
                        <td><div class="order-items-wrap">${itemsHtml}</div></td>
                        <td><span class="status-badge">${escapeHtml(wf)}</span></td>
                        <td><strong>${escapeHtml(formatMoney(amount))}</strong></td>
                        <td>
                            <button class="action-btn" type="button" data-view-order="${escapeHtml(order.rawId ?? "")}">VIEW</button>
                        </td>
                    </tr>
                `;
            })
            .join("");

        // Delegate view clicks
        ordersTableBodyEl.querySelectorAll("[data-view-order]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-view-order");
                if (!id) return;
                window.location.href = `order-tracking.html?id=${encodeURIComponent(String(id))}`;
            });
        });
    };

    const setMode = (mode) => {
        const isList = mode === "list";
        if (ordersListPanelEl) ordersListPanelEl.style.display = isList ? "block" : "none";
        if (orderDetailViewEl) orderDetailViewEl.style.display = isList ? "none" : "block";
    };

    const wireOrdersListControls = () => {
        ordersSearchInputEl?.addEventListener("input", (e) => {
            currentSearchTerm = String(e.target.value || "").trim();
            renderOrdersList();
        });

        ordersWorkflowTabsEl?.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                ordersWorkflowTabsEl.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                currentWorkflowFilter = String(btn.getAttribute("data-workflow") || "all");
                renderOrdersList();
            });
        });
    };

    const render = () => {
        const id = getQueryParam("id");
        if (!id) {
            setMode("list");
            renderOrdersList();
            return;
        }

        setMode("detail");
        const order = getCurrentOrder();
        if (!order) {
            if (orderTitleEl) orderTitleEl.textContent = "ORDER";
            if (orderPlacedAtEl) orderPlacedAtEl.textContent = "Placed on -";
            if (orderPillEl) orderPillEl.textContent = "No order";
            if (statusTitleEl) statusTitleEl.textContent = "NO ORDER";
            if (statusBodyEl) statusBodyEl.textContent = "No orders found yet.";
            if (summaryTypeEl) summaryTypeEl.textContent = "-";
            if (summaryQtyEl) summaryQtyEl.textContent = "-";
            if (summaryPaymentEl) summaryPaymentEl.textContent = "-";
            if (trackingNumberEl) trackingNumberEl.value = "";
            if (paymentPanelEl) paymentPanelEl.style.display = "none";
            if (proofPanelEl) proofPanelEl.style.display = "none";
            if (shippingPanelEl) shippingPanelEl.style.display = "none";
            if (orderContentsEl) orderContentsEl.innerHTML = "";
            if (balancePanelEl) balancePanelEl.style.display = "none";
            if (commentsPanelEl) commentsPanelEl.style.display = "none";
            renderStepper("Pending");
            return;
        }

        const workflowDisplay = dbStatusToWorkflow(order?.status);

        if (orderTitleEl) orderTitleEl.textContent = `ORDER #${String(order.id || "")}`;
        if (orderPlacedAtEl) orderPlacedAtEl.textContent = `Placed on ${formatDate(order.date)}`;
        if (orderPillEl) orderPillEl.textContent = workflowDisplay;

        const status = computeStatusCard(workflowDisplay);
        if (statusTitleEl) statusTitleEl.textContent = status.title;
        if (statusBodyEl) statusBodyEl.textContent = status.body;

        const type = String(order.orderType || "").toLowerCase();
        if (summaryTypeEl) {
            summaryTypeEl.textContent = type ? type.charAt(0).toUpperCase() + type.slice(1) : "-";
        }

        const items = Array.isArray(order.items) ? order.items : [];
        const qty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
        if (summaryQtyEl) summaryQtyEl.textContent = qty > 0 ? String(qty) : "-";

        if (summaryPaymentEl) {
            const status = String(order.status || "").toLowerCase();
            const paymentMeta = order?.meta?.payment && typeof order.meta.payment === "object" ? order.meta.payment : {};
            const hasReceipt = typeof paymentMeta.receipt_data_url === "string" && String(paymentMeta.receipt_data_url).trim() !== "";
            const verified = paymentMeta.verified === true || String(paymentMeta.receipt_status || "").toLowerCase() === "verified";

            const amounts = computePaymentAmounts(order);
            const fullyPaid = amounts.remaining <= 0.009;
            const partiallyPaid = amounts.amountPaid > 0 && !fullyPaid;

            if (status === "paid") {
                summaryPaymentEl.textContent = verified ? "Verified" : (hasReceipt ? "Pending Verification" : "Awaiting Receipt");
            } else if (status === "awaiting_final_payment") {
                const finalHas = typeof paymentMeta.final_receipt_data_url === "string" && String(paymentMeta.final_receipt_data_url).trim() !== "";
                const finalVerified = paymentMeta.final_verified === true || String(paymentMeta.final_receipt_status || "").toLowerCase() === "verified";
                summaryPaymentEl.textContent = finalVerified ? "Fully Paid" : (finalHas ? "Final Payment Pending Verification" : "Awaiting Final Receipt");
            } else if (status === "proofing" || status === "processing" || status === "ready_to_ship" || status === "shipped" || status === "completed") {
                summaryPaymentEl.textContent = fullyPaid ? "Fully Paid" : (partiallyPaid ? "Partially Paid" : "Unpaid");
            } else {
                summaryPaymentEl.textContent = "Unpaid";
            }
        }

        const trackingNumber = String(order?.tracking_number || order?.meta?.tracking_number || order?.meta?.trackingNumber || "").trim();
        if (trackingNumberEl) trackingNumberEl.value = trackingNumber;

        renderStepper(workflowDisplay);
        renderStagePanels(order);
        renderOrderContents(order);
        renderBalancePanel(order);

        if (commentsPanelEl) commentsPanelEl.style.display = "block";
        renderComments(order);
    };

    const copyTracking = async () => {
        const value = String(trackingNumberEl?.value || "").trim();
        if (!value) {
            uiAlert("Tracking number isn't available yet.", { title: "Tracking", tone: "info" });
            return;
        }

        try {
            await navigator.clipboard.writeText(value);
        } catch {
            // fallback
            const input = trackingNumberEl;
            if (input) {
                input.focus();
                input.select();
                document.execCommand("copy");
            }
        }

        uiAlert("Tracking number copied to clipboard.", { title: "Copied", tone: "success" });
    };

    copyBtn?.addEventListener("click", copyTracking);

    const uploadReceipt = async () => {
        const order = getCurrentOrder();
        if (!order || !order.rawId) {
            uiAlert("Please open an order first.", { title: "Receipt Upload", tone: "info" });
            return;
        }

        const workflowDisplay = dbStatusToWorkflow(order?.status);
        const stage = workflowDisplay === "Awaiting Final Payment" ? "final" : "initial";
        if (workflowDisplay !== "Awaiting Payment" && workflowDisplay !== "Awaiting Final Payment") {
            uiAlert("Receipt upload is only available while the order is Awaiting Payment or Awaiting Final Payment.", {
                title: "Receipt Upload",
                tone: "info",
            });
            return;
        }

        const file = paymentReceiptUploadEl?.files && paymentReceiptUploadEl.files[0] ? paymentReceiptUploadEl.files[0] : null;
        if (!file) {
            uiAlert("Please choose an image file first.", { title: "Receipt Upload", tone: "info" });
            return;
        }

        if (!String(file.type || "").startsWith("image/")) {
            uiAlert("Receipt must be an image.", { title: "Receipt Upload", tone: "danger" });
            return;
        }

        const maxBytes = 2_000_000;
        if (typeof file.size === "number" && file.size > maxBytes) {
            uiAlert("Image is too large (max 2MB).", { title: "Receipt Upload", tone: "danger" });
            return;
        }

        const oldLabel = uploadReceiptBtnEl ? uploadReceiptBtnEl.textContent : null;
        if (uploadReceiptBtnEl) {
            uploadReceiptBtnEl.disabled = true;
            uploadReceiptBtnEl.textContent = "UPLOADING...";
        }

        try {
            const dataUrl = await readFileAsDataUrl(file);
            const res = await window.AlixCart.uploadOrderReceipt({
                order_id: order.rawId,
                receipt_data_url: dataUrl,
                receipt_stage: stage,
            });

            order.meta = order.meta && typeof order.meta === "object" ? order.meta : {};
            order.meta.payment = res?.payment && typeof res.payment === "object" ? res.payment : { receipt_data_url: dataUrl };

            renderStagePanels(order);
            uiAlert("Receipt uploaded successfully.", { title: "Receipt Upload", tone: "success" });
        } finally {
            if (uploadReceiptBtnEl) {
                uploadReceiptBtnEl.disabled = false;
                uploadReceiptBtnEl.textContent = oldLabel || "UPLOAD RECEIPT";
            }
        }
    };

    const requestRevision = async () => {
        const order = getCurrentOrder();
        if (!order || !order.rawId) {
            uiAlert("Please open an order first.", { title: "Proofing", tone: "info" });
            return;
        }

        const workflowDisplay = dbStatusToWorkflow(order?.status);
        if (workflowDisplay !== "Proofing") {
            uiAlert("Proofing actions are only available during Proofing.", { title: "Proofing", tone: "info" });
            return;
        }

        const msg = await uiPromptRevisionNote({
            title: "Request Revision",
            message: "Add instructions for the revision. This will be sent to admin.",
            placeholder: "e.g. Change logo color to blue, add dragon wings, ...",
            okText: "Request",
            cancelText: "Cancel",
        });
        if (msg === null) return;
        if (!msg) {
            uiAlert("Please add revision instructions.", { title: "Request Revision", tone: "info" });
            return;
        }

        try {
            const selectedItem = getSelectedProofItem(order);
            const selectedOrderItemId = selectedItem?.id != null ? Number(selectedItem.id) : null;
            await window.AlixCart.respondOrderProof({
                order_id: order.rawId,
                action: "revision",
                message: msg,
                ...(Number.isFinite(selectedOrderItemId) && selectedOrderItemId > 0 ? { order_item_id: selectedOrderItemId } : {}),
            });
            await loadOrders();
            render();
            uiAlert("Revision requested.", { title: "Proofing", tone: "success" });
        } catch (e) {
            uiAlert(e?.message || "Failed to request revision.", { title: "Proofing", tone: "danger" });
        }
    };

    const approveProof = async () => {
        const order = getCurrentOrder();
        if (!order || !order.rawId) {
            uiAlert("Please open an order first.", { title: "Proofing", tone: "info" });
            return;
        }

        const workflowDisplay = dbStatusToWorkflow(order?.status);
        if (workflowDisplay !== "Proofing") {
            uiAlert("Proof approval is only available during Proofing.", { title: "Proofing", tone: "info" });
            return;
        }

        const ok = await uiConfirm("Approve this proof and start production?", {
            title: "Approve Proof",
            tone: "danger",
            okText: "Approve",
            cancelText: "Cancel",
        });
        if (!ok) return;

        try {
            const selectedItem = getSelectedProofItem(order);
            const selectedOrderItemId = selectedItem?.id != null ? Number(selectedItem.id) : null;
            await window.AlixCart.respondOrderProof({
                order_id: order.rawId,
                action: "approve",
                ...(Number.isFinite(selectedOrderItemId) && selectedOrderItemId > 0 ? { order_item_id: selectedOrderItemId } : {}),
            });
            await loadOrders();
            render();
            uiAlert("Proof approved.", { title: "Proofing", tone: "success" });
        } catch (e) {
            uiAlert(e?.message || "Failed to approve proof.", { title: "Proofing", tone: "danger" });
        }
    };

    const sendComment = async () => {
        const order = getCurrentOrder();
        if (!order || !order.rawId) {
            uiAlert("Please open an order first.", { title: "Comments", tone: "info" });
            return;
        }

        const workflowDisplay = dbStatusToWorkflow(order?.status);
        if (workflowDisplay !== "Proofing") {
            uiAlert("You can add revision comments during Proofing.", { title: "Comments", tone: "info" });
            return;
        }

        const msg = String(commentInputEl?.value || "").trim();
        if (!msg) return;

        const oldLabel = sendCommentBtnEl ? sendCommentBtnEl.textContent : null;
        if (sendCommentBtnEl) {
            sendCommentBtnEl.disabled = true;
            sendCommentBtnEl.textContent = "SENDING...";
        }

        try {
            await window.AlixCart.addOrderComment({ order_id: order.rawId, message: msg });
            if (commentInputEl) commentInputEl.value = "";
            await loadOrders();
            render();
            uiAlert("Comment sent.", { title: "Comments", tone: "success" });
        } catch (e) {
            uiAlert(e?.message || "Failed to send comment.", { title: "Comments", tone: "danger" });
        } finally {
            if (sendCommentBtnEl) {
                sendCommentBtnEl.textContent = oldLabel || "SEND COMMENT";
            }
            const refreshed = getCurrentOrder();
            const canComment = dbStatusToWorkflow(refreshed?.status) === "Proofing";
            if (sendCommentBtnEl) sendCommentBtnEl.disabled = !canComment;
        }
    };

    uploadReceiptBtnEl?.addEventListener("click", () => {
        uploadReceipt().catch((err) =>
            uiAlert(err?.message || "Upload failed. Please try again.", { title: "Receipt Upload", tone: "danger" }),
        );
    });

    paymentReceiptUploadEl?.addEventListener("change", () => {
        const file = paymentReceiptUploadEl.files && paymentReceiptUploadEl.files[0] ? paymentReceiptUploadEl.files[0] : null;
        if (!file) {
            renderImagePreview(paymentReceiptPreviewEl, "", "Payment receipt");
            if (paymentStateEl) paymentStateEl.textContent = "No receipt selected.";
            return;
        }

        if (!String(file.type || "").startsWith("image/")) {
            renderImagePreview(paymentReceiptPreviewEl, "", "Payment receipt");
            if (paymentStateEl) paymentStateEl.textContent = "Please select an image file.";
            return;
        }

        readFileAsDataUrl(file)
            .then((dataUrl) => {
                renderImagePreview(paymentReceiptPreviewEl, dataUrl, "Payment receipt");
                if (paymentStateEl) paymentStateEl.textContent = "Ready to upload.";
            })
            .catch(() => {
                if (paymentStateEl) paymentStateEl.textContent = "Failed to read file.";
            });
    });

    requestRevisionBtnEl?.addEventListener("click", requestRevision);
    approveProofBtnEl?.addEventListener("click", approveProof);
    proofItemSelectEl?.addEventListener("change", () => {
        const order = getCurrentOrder();
        if (!order) return;
        const selected = Number(proofItemSelectEl.value || 0);
        if (!Number.isFinite(selected) || selected <= 0) return;
        proofItemSelectionByOrder.set(String(order.rawId), selected);
        renderStagePanels(order);
    });

    const start = async () => {
        wireOrdersListControls();
        await loadOrders();
        render();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            start().catch((err) => {
                console.error(err);
                uiAlert(err?.message || "Failed to load orders.", { title: "Orders", tone: "danger" });
            });
        });
    } else {
        start().catch((err) => {
            console.error(err);
            uiAlert(err?.message || "Failed to load orders.", { title: "Orders", tone: "danger" });
        });
    }
})();

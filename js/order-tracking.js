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

    const proofPanelEl = qs("#proofPanel");
    const proofNoteEl = qs("#proofNote");
    const proofPreviewEl = qs("#proofPreview");
    const approveProofBtnEl = qs("#approveProofBtn");
    const requestRevisionBtnEl = qs("#requestRevisionBtn");
    const proofActionsEl = qs("#proofActions");

    const ordersListPanelEl = qs("#ordersListPanel");
    const ordersSearchInputEl = qs("#ordersSearchInput");
    const ordersWorkflowTabsEl = qs("#ordersWorkflowTabs");
    const ordersTableBodyEl = qs("#ordersTableBody");
    const orderDetailViewEl = qs("#orderDetailView");

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

    const getWorkflowStepIndex = (workflowStatus) => {
        const wf = String(workflowStatus || "");
        if (wf === "Awaiting Payment") return 1;
        if (wf === "Proofing") return 2;
        if (wf === "In Progress") return 3;
        if (wf === "Ready to Ship") return 4;
        if (wf === "On Transit") return 5;
        if (wf === "Completed") return 6;
        return 0;
    };

    const getWorkflowDisplay = (workflowStatus) => {
        const wf = String(workflowStatus || "Pending");
        if (wf === "Pending" || wf === "Revision Requested") return "Pending Review";
        return wf;
    };

    const isInProcessOrder = (order) => {
        const admin = order && typeof order.admin === "object" && order.admin ? order.admin : {};
        const wf = getWorkflowDisplay(admin.workflowStatus);
        return wf !== "Completed";
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

    const getOrders = () => {
        if (window.AdminStore && typeof window.AdminStore.getOrders === "function") {
            return window.AdminStore.getOrders();
        }
        const raw = localStorage.getItem("orders");
        const list = safeJsonParse(raw || "[]", []);
        return Array.isArray(list) ? list : [];
    };

    const updateOrder = (orderId, updater) => {
        if (!orderId) return null;
        if (window.AdminStore && typeof window.AdminStore.updateOrder === "function") {
            return window.AdminStore.updateOrder(orderId, updater);
        }

        const orders = getOrders();
        const idx = orders.findIndex((o) => String(o.id) === String(orderId));
        if (idx < 0) return null;
        const current = orders[idx];
        const next = typeof updater === "function" ? updater({ ...current }) : { ...current, ...(updater || {}) };
        orders[idx] = next;
        localStorage.setItem("orders", JSON.stringify(orders));
        return next;
    };

    const getOrderById = (id) => {
        if (!id) return null;
        const orders = getOrders();
        return orders.find((o) => String(o.id) === String(id)) || null;
    };

    const getCurrentOrder = () => {
        const id = getQueryParam("id");
        if (id) {
            const found = getOrderById(id);
            if (found) return found;
        }

        return null;
    };

    const renderStepper = (workflowStatus) => {
        const current = getWorkflowStepIndex(workflowStatus);
        document.querySelectorAll(".stepper .step").forEach((el) => {
            const step = Number(el.getAttribute("data-step"));
            el.classList.toggle("is-done", Number.isFinite(step) && step < current);
            el.classList.toggle("is-active", Number.isFinite(step) && step === current);
        });
    };

    const formatMoney = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`;

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

    const computeTotals = (order) => {
        const admin = order && typeof order.admin === "object" && order.admin ? order.admin : {};
        const quote = admin.quote && typeof admin.quote === "object" ? admin.quote : {};
        const isCustom = String(admin.orderType || "") === "custom";
        const base = Number(quote.basePrice || 0);
        const ship = Number(quote.shippingFee || 0);

        const total = isCustom && (base > 0 || ship > 0) ? base + ship : Number(order.total || 0);
        const downpayment = Math.round((total * 0.5) * 100) / 100;
        return { total, downpayment };
    };

    const renderStagePanels = (order) => {
        const admin = order && typeof order.admin === "object" && order.admin ? order.admin : {};
        const workflow = admin.workflowStatus || "Pending";
        const workflowDisplay = getWorkflowDisplay(workflow);
        const stepIndex = getWorkflowStepIndex(workflow);

        // Shipping: show only when On Transit (or Completed).
        if (shippingPanelEl) {
            const showShipping = stepIndex >= 5;
            shippingPanelEl.style.display = showShipping ? "block" : "none";
        }

        // Payment stage
        if (paymentPanelEl) {
            const showPayment = workflowDisplay === "Awaiting Payment";
            paymentPanelEl.style.display = showPayment ? "block" : "none";
            if (showPayment) {
                if (paymentNoteEl) {
                    paymentNoteEl.textContent = "Wait for Admin to accept the order. Once accepted, pay the required 50% downpayment and upload your receipt screenshot. Admin will verify it before proofing.";
                }

                const totals = computeTotals(order);
                if (paymentTotalEl) paymentTotalEl.textContent = formatMoney(totals.total);
                if (paymentDownpaymentEl) paymentDownpaymentEl.textContent = formatMoney(totals.downpayment);

                const payment = admin.payment && typeof admin.payment === "object" ? admin.payment : {};
                const hasReceipt = Boolean(payment.receiptDataUrl);
                renderImagePreview(paymentReceiptPreviewEl, payment.receiptDataUrl, "Payment receipt");
                if (paymentStateEl) {
                    if (!hasReceipt) {
                        paymentStateEl.textContent = "No receipt uploaded yet.";
                    } else if (payment.verified) {
                        const typ = String(payment.verifiedType || "");
                        paymentStateEl.textContent = `Receipt uploaded. Payment verified (${typ || "-"}).`;
                    } else {
                        paymentStateEl.textContent = "Receipt uploaded. Waiting for admin verification.";
                    }
                }
            }
        }

        // Proofing stage
        if (proofPanelEl) {
            const showProof = workflowDisplay === "Proofing";
            proofPanelEl.style.display = showProof ? "block" : "none";

            if (showProof) {
                const proof = admin.proof && typeof admin.proof === "object" ? admin.proof : {};
                const status = String(proof.status || "Not Sent");
                const hasMockup = Boolean(proof.mockupDataUrl);

                renderImagePreview(proofPreviewEl, proof.mockupDataUrl, "Design proof");

                if (proofNoteEl) {
                    if (!hasMockup || status === "Not Sent") {
                        proofNoteEl.textContent = "Waiting for admin to send the design proof.";
                    } else if (status === "Sent") {
                        proofNoteEl.textContent = "Please review the design proof. Approve to start production or request a revision.";
                    } else if (status === "Revision Requested") {
                        proofNoteEl.textContent = "Revision requested. Please wait for the updated proof.";
                    } else if (status === "Approved") {
                        proofNoteEl.textContent = "Approved. Production will start.";
                    } else {
                        proofNoteEl.textContent = "Proofing.";
                    }
                }

                const canRespond = status === "Sent";
                if (proofActionsEl) proofActionsEl.style.display = canRespond ? "flex" : "none";
                if (approveProofBtnEl) approveProofBtnEl.disabled = !canRespond;
                if (requestRevisionBtnEl) requestRevisionBtnEl.disabled = !canRespond;
            }
        }
    };

    let currentWorkflowFilter = "all";
    let currentSearchTerm = "";

    const renderOrdersList = () => {
        if (!ordersTableBodyEl) return;

        const orders = getOrders().filter(isInProcessOrder);
        const filtered = orders
            .filter((o) => {
                const wf = getWorkflowDisplay(o?.admin?.workflowStatus);
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
                const wf = getWorkflowDisplay(order?.admin?.workflowStatus);
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
                            <button class="action-btn" type="button" data-view-order="${escapeHtml(order.id || "")}">VIEW</button>
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
            renderStepper("Pending");
            return;
        }

        const admin = order && typeof order.admin === "object" && order.admin ? order.admin : {};
        const workflow = admin.workflowStatus || "Pending";
        const workflowDisplay = getWorkflowDisplay(workflow);

        if (orderTitleEl) orderTitleEl.textContent = `ORDER #${String(order.id || "")}`;
        if (orderPlacedAtEl) orderPlacedAtEl.textContent = `Placed on ${formatDate(order.date)}`;
        if (orderPillEl) orderPillEl.textContent = workflowDisplay;

        const status = computeStatusCard(workflow);
        if (statusTitleEl) statusTitleEl.textContent = status.title;
        if (statusBodyEl) statusBodyEl.textContent = status.body;

        const type = admin.orderType === "custom" ? "Custom" : "Fixed";
        if (summaryTypeEl) summaryTypeEl.textContent = type;

        const items = Array.isArray(order.items) ? order.items : [];
        const qty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
        if (summaryQtyEl) summaryQtyEl.textContent = qty > 0 ? String(qty) : "-";

        const payment = admin.payment && typeof admin.payment === "object" ? admin.payment : {};
        const payVerified = Boolean(payment.verified);
        const payLabel = payVerified ? "Verified" : (workflowDisplay === "Awaiting Payment" ? "Pending" : "-");
        if (summaryPaymentEl) summaryPaymentEl.textContent = payLabel;

        const trackingNumber = String(admin.trackingNumber || "").trim();
        if (trackingNumberEl) trackingNumberEl.value = trackingNumber;

        renderStepper(workflow);
        renderStagePanels(order);
    };

    const copyTracking = async () => {
        const value = String(trackingNumberEl?.value || "").trim();
        if (!value) {
            alert("No tracking number yet.");
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

        alert("Tracking number copied.");
    };

    copyBtn?.addEventListener("click", copyTracking);

    const uploadReceipt = async () => {
        const order = getCurrentOrder();
        if (!order) return;

        const admin = order && typeof order.admin === "object" && order.admin ? order.admin : {};
        const wf = getWorkflowDisplay(admin.workflowStatus || "Pending");
        if (wf !== "Awaiting Payment") {
            alert("Receipt upload is only available in the Awaiting Payment stage.");
            return;
        }

        const file = paymentReceiptUploadEl?.files?.[0];
        if (!file) {
            alert("Please choose a receipt screenshot first.");
            return;
        }

        const dataUrl = await readFileAsDataUrl(file);
        updateOrder(order.id, (o) => {
            if (!o.admin || typeof o.admin !== "object") o.admin = {};
            if (!o.admin.payment || typeof o.admin.payment !== "object") o.admin.payment = {};
            if (!o.admin.payment.receiptMeta || typeof o.admin.payment.receiptMeta !== "object") o.admin.payment.receiptMeta = {};
            o.admin.payment.method = o.admin.payment.method || "GCash";
            o.admin.payment.receiptDataUrl = dataUrl;
            o.admin.payment.receiptMeta.fileName = file.name || null;
            o.admin.payment.receiptMeta.uploadedAt = new Date().toISOString();
            // Do not auto-verify. Admin verifies in admin workflow.
            o.admin.payment.verified = Boolean(o.admin.payment.verified);
            return o;
        });

        alert("Receipt uploaded! Admin will verify it soon.");
        render();
    };

    const requestRevision = () => {
        const order = getCurrentOrder();
        if (!order) return;
        const admin = order && typeof order.admin === "object" && order.admin ? order.admin : {};
        const wf = getWorkflowDisplay(admin.workflowStatus || "Pending");
        if (wf !== "Proofing") {
            alert("Revisions are only available during the Proofing stage.");
            return;
        }

        const proof = admin.proof && typeof admin.proof === "object" ? admin.proof : {};
        const status = String(proof.status || "Not Sent");
        if (status !== "Sent") {
            alert("Please wait for the admin to send the proof first.");
            return;
        }

        updateOrder(order.id, (o) => {
            if (!o.admin || typeof o.admin !== "object") o.admin = {};
            if (!o.admin.proof || typeof o.admin.proof !== "object") o.admin.proof = {};
            o.admin.proof.status = "Revision Requested";
            if (!Array.isArray(o.admin.comments)) o.admin.comments = [];
            o.admin.comments.push({ author: "Customer", message: "Requested revision on proof.", at: new Date().toISOString() });
            return o;
        });

        alert("Revision request sent to admin. Please wait for the updated proof.");
        render();
    };

    const approveProof = () => {
        const order = getCurrentOrder();
        if (!order) return;
        const admin = order && typeof order.admin === "object" && order.admin ? order.admin : {};
        const wf = getWorkflowDisplay(admin.workflowStatus || "Pending");
        if (wf !== "Proofing") {
            alert("Approval is only available during the Proofing stage.");
            return;
        }

        const proof = admin.proof && typeof admin.proof === "object" ? admin.proof : {};
        const status = String(proof.status || "Not Sent");
        if (status !== "Sent") {
            alert("Please wait for the admin to send the proof first.");
            return;
        }

        if (!confirm("Approve this design proof? Once approved, production will start.")) return;

        updateOrder(order.id, (o) => {
            if (!o.admin || typeof o.admin !== "object") o.admin = {};
            if (!o.admin.proof || typeof o.admin.proof !== "object") o.admin.proof = {};
            o.admin.proof.status = "Approved";
            if (!Array.isArray(o.admin.comments)) o.admin.comments = [];
            o.admin.comments.push({ author: "Customer", message: "Approved the proof.", at: new Date().toISOString() });
            return o;
        });

        alert("Design proof approved! Your order is now in production.");
        render();
    };

    uploadReceiptBtnEl?.addEventListener("click", () => {
        uploadReceipt().catch(() => alert("Failed to upload receipt."));
    });

    requestRevisionBtnEl?.addEventListener("click", requestRevision);
    approveProofBtnEl?.addEventListener("click", approveProof);

    window.addEventListener("storage", (e) => {
        if (e.key === "orders" || e.key === "alix_auth_user") {
            render();
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            wireOrdersListControls();
            render();
        });
    } else {
        wireOrdersListControls();
        render();
    }
})();

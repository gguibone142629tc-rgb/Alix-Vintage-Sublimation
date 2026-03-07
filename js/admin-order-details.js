(function () {
    "use strict";

    const qs = (sel) => document.querySelector(sel);

    const orderIdEl = qs("#orderId");
    const customerNameEl = qs("#customerName");
    const customerMobileEl = qs("#customerMobile");
    const orderDateEl = qs("#orderDate");
    const workflowPill = qs("#workflowPill");

    const designDetails = qs("#designDetails");
    const orderContents = qs("#orderContents");

    const stockConfirmedInput = qs("#stockConfirmed");
    const stockWrap = qs("#stockWrap");
    const basePriceInput = qs("#basePrice");
    const shippingFeeInput = qs("#shippingFee");
    const pricingHint = qs("#pricingHint");
    const pricingBox = qs("#pricingBox");

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

    const formatDate = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString("en-PH", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    };

    const formatMoney = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`;

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

    const getOrderIdFromQuery = () => window.AdminStore.getQueryParam("id");

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
        if (wf === "Ready to Ship") return 4;
        if (wf === "On Transit") return 5;
        if (wf === "Completed") return 6;
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

        const customerName =
            details.customerName ||
            details.groupName ||
            custom?.designName ||
            "-";

        const mobile = details.customerMobile || details.customerPhone || "-";
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
        const current = getWorkflowStepIndex(order.admin.workflowStatus);
        document.querySelectorAll(".order-stepper .step").forEach((el) => {
            const step = Number(el.getAttribute("data-step"));
            el.classList.toggle("is-done", Number.isFinite(step) && step < current);
            el.classList.toggle("is-active", Number.isFinite(step) && step === current);
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
        const roster = getRosterForOrder(order);
        const items = Array.isArray(order.items) ? order.items : [];

        const makeRosterTable = () => {
            const rows = roster.length
                ? roster
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
            const box = dataUrl
                ? `<img src="${dataUrl}" alt="${escapeHtml(title)}" loading="lazy">`
                : `<div class="mini-note">${escapeHtml(fallbackText)}</div>`;
            return `
                <div class="upload-card">
                    <div class="upload-card-title">${escapeHtml(title)}</div>
                    <div class="upload-card-box">${box}</div>
                </div>
            `;
        };

        const custom = order.customRequest || null;
        const orderLabel = custom ? `Custom Request — ${custom.productType || "Custom"}` : "Order";

        const showProofCard = getWorkflowStepIndex(order.admin.workflowStatus) >= 2; // Proofing and beyond

        const contentsHtml = (items.length ? items : [{ name: orderLabel }])
            .map((it) => {
                const title = it.name || orderLabel;
                const uploadCards = `
                    <div class="upload-cards">
                        ${getUploadCard("Uploaded Design", null, custom?.designType === "reference" ? "Reference only" : "No file uploaded")}
                        ${getUploadCard("Logo", null, "No logo uploaded")}
                        ${showProofCard ? getUploadCard("Design Proof", order.admin.proof.mockupDataUrl, "No proof uploaded") : ""}
                    </div>
                `;

                return `
                    <div class="order-item-block">
                        <div class="order-item-head">
                            <div class="order-item-title">${escapeHtml(title)}</div>
                        </div>
                        ${makeRosterTable()}
                        ${uploadCards}
                    </div>
                `;
            })
            .join("");

        orderContents.innerHTML = contentsHtml;
    };

    const renderDesignSummaryLine = (order) => {
        const details = order.details || {};
        const custom = order.customRequest || null;
        const roster = getRosterForOrder(order);

        const parts = [];
        if (custom) {
            parts.push(`Design: ${custom.designName || "-"}`);
            parts.push(`Product: ${custom.productType || "Custom"}`);
            if (custom.notes) parts.push(`Notes: ${custom.notes}`);
            if (roster.length) parts.push(`Roster: ${getRosterText(roster)}`);
        } else {
            if (details.groupName) parts.push(`Group: ${details.groupName}`);
            if (details.customerName) parts.push(`Name: ${details.customerName}`);
            if (details.customerNumber) parts.push(`Number: ${details.customerNumber}`);
            if (roster.length) parts.push(`Roster: ${getRosterText(roster)}`);
        }

        designDetails.textContent = parts.length ? parts.join(" • ") : "-";
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
                const receiptLine = fileName && uploadedAt ? `${fileName} · ${uploadedAt}` : fileName || uploadedAt || "";
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
            addStageButton("sendProofBtn", "Send Proof");
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

        rejectBtn?.addEventListener("click", () => {
            const order = window.AdminStore.getOrderById(orderId);
            if (!order) return;
            if (!window.confirm("Reject this order?")) return;
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
                window.alert(computeAcceptHint(refreshed));
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
            window.open(dataUrl, "_blank", "noopener,noreferrer");
        });

        const verifyPayment = (type) => {
            const order = window.AdminStore.getOrderById(orderId);
            if (!order) return;

            if (order.admin.workflowStatus !== "Awaiting Payment") {
                window.alert("Payment verification is only available in the Awaiting Payment stage.");
                return;
            }

            if (!order.admin.payment.receiptDataUrl) {
                window.alert("Upload a receipt first.");
                return;
            }

            if (order.admin.payment.method === "COD" && type !== "downpayment") {
                window.alert("COD requires verifying the 50% downpayment.");
                return;
            }

            window.AdminStore.updateOrder(orderId, (o) => {
                o.admin.payment.verified = true;
                o.admin.payment.verifiedType = type;
                return o;
            });

            // After payment is verified, move to Proofing (not production yet).
            ensureProofing(orderId);
            loadAndRender();
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
                window.alert("Proofing is only available after payment is verified.");
                return;
            }
            if (!order.admin.proof.mockupDataUrl) {
                window.alert("Upload a mockup first.");
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
                window.alert("Order must be In Progress first.");
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
                window.alert("Order must be Ready to Ship first.");
                return;
            }
            const tracking = String(trackingNumberInput?.value || "").trim();
            if (!tracking) {
                window.alert("Enter the J&T tracking number.");
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
                window.alert("Order must be On Transit first.");
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
        renderDesignSummaryLine(order);
        renderOrderContents(order);
        renderStageActions(orderId, order);
        renderComments(order);
    };

    const loadAndRender = () => {
        const id = getOrderIdFromQuery();
        if (!id) {
            window.alert("Missing order id.");
            window.location.replace("admin-orders.html");
            return;
        }

        const order = window.AdminStore.getOrderById(id);
        if (!order) {
            window.alert("Order not found.");
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

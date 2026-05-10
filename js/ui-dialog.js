(function () {
    "use strict";

    if (window.AVDialog) return;

    const escapeHtml = (value) =>
        String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    let activeCleanup = null;

    let toastStack = null;
    let toastTimers = new Set();

    const closeActive = () => {
        if (typeof activeCleanup === "function") {
            activeCleanup();
            activeCleanup = null;
        }
    };

    const openDialog = ({ title, message, tone, variant, okText, cancelText, icon, destructive } = {}) => {
        closeActive();

        const safeTitle = String(title || "Notice").trim() || "Notice";
        const safeMessage = String(message || "").trim();
        const safeTone = String(tone || "info").trim() || "info"; // info | success | warning | danger
        const safeVariant = String(variant || "alert").trim() || "alert"; // alert | confirm

        const backdrop = document.createElement("div");
        backdrop.className = "av-dialog-backdrop";

        const dialog = document.createElement("div");
        dialog.className = "av-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");

        const okLabel = String(okText || "OK").trim() || "OK";
        const cancelLabel = String(cancelText || "Cancel").trim() || "Cancel";

        const isConfirm = safeVariant === "confirm";
        const rawIcon = String(icon || "").trim().toLowerCase();
        const isDeleteLike = /^(delete|remove)\b/i.test(okLabel);
        const isExplicitTrash = rawIcon === "trash";
        const isDestructive = Boolean(destructive) || isExplicitTrash || (isConfirm && isDeleteLike);

        // Avoid making normal confirmations look like delete actions.
        const visualTone = isConfirm && !isDestructive && safeTone === "danger" ? "info" : safeTone;

        dialog.className = `av-dialog av-dialog--${visualTone}${isConfirm ? " av-dialog--confirm" : ""}${isDestructive ? " av-dialog--destructive" : ""}`;

        const iconSvg = (() => {
            const iconName = (() => {
                if (rawIcon) return rawIcon;
                if (isConfirm) {
                    if (!isDestructive) return "question";
                    return isDeleteLike ? "trash" : "warning";
                }
                if (visualTone === "success") return "success";
                if (visualTone === "danger") return "error";
                if (visualTone === "warning") return "warning";
                return "info";
            })();

            if (iconName === "success") {
                return `
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M9.1 16.2 4.9 12l-1.4 1.4 5.6 5.6L20.5 7.6 19.1 6.2z"></path>
                    </svg>
                `;
            }
            if (iconName === "trash") {
                return `
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z"></path>
                    </svg>
                `;
            }

            if (iconName === "error") {
                return `
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
                    </svg>
                `;
            }

            if (iconName === "question") {
                return `
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"></path>
                    </svg>
                `;
            }

            if (iconName === "warning") {
                return `
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                    </svg>
                `;
            }

            // info
            return `
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                </svg>
            `;
        })();

        const actionsHtml =
            safeVariant === "confirm"
                ? `
                    <button type="button" class="av-dialog-btn av-dialog-btn--cancel" data-av-cancel>${escapeHtml(cancelLabel)}</button>
                    <button type="button" class="av-dialog-btn av-dialog-btn--primary" data-av-ok>${escapeHtml(okLabel)}</button>
                `
                : `
                    <button type="button" class="av-dialog-btn av-dialog-btn--primary" data-av-ok>${escapeHtml(okLabel)}</button>
                `;

        const messageHtml = escapeHtml(safeMessage).replaceAll("\n", "<br>");

        dialog.innerHTML = `
            <button type="button" class="av-dialog-close" aria-label="Close" data-av-close>
                <span aria-hidden="true">×</span>
            </button>

            <div class="av-dialog-icon" aria-hidden="true">
                ${iconSvg}
            </div>

            <div class="av-dialog-title">${escapeHtml(safeTitle)}</div>
            <div class="av-dialog-desc">${messageHtml}</div>

            <div class="av-dialog-actions av-dialog-actions--${escapeHtml(safeVariant)}">
                ${actionsHtml}
            </div>
        `;

        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);

        const okBtn = dialog.querySelector("[data-av-ok]");
        const cancelBtn = dialog.querySelector("[data-av-cancel]");
        const closeBtn = dialog.querySelector("[data-av-close]");

        let resolver = null;
        const promise = new Promise((resolve) => {
            resolver = resolve;
        });

        const cleanup = () => {
            window.removeEventListener("keydown", onKeyDown, true);
            backdrop.removeEventListener("click", onBackdropClick);
            okBtn?.removeEventListener("click", onOk);
            cancelBtn?.removeEventListener("click", onCancel);
            closeBtn?.removeEventListener("click", onClose);
            backdrop.remove();
        };

        const close = (result) => {
            cleanup();
            if (activeCleanup === cleanup) {
                activeCleanup = null;
            }
            resolver?.(result);
        };

        const onOk = () => close(true);
        const onCancel = () => close(false);
        const onClose = () => close(safeVariant === "confirm" ? false : true);

        const onBackdropClick = (e) => {
            if (e.target !== backdrop) return;
            close(safeVariant === "confirm" ? false : true);
        };

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                close(safeVariant === "confirm" ? false : true);
                return;
            }

            if (e.key === "Enter") {
                // avoid accidental submissions in text fields; only accept if focus isn't in an input/textarea.
                const tag = String(document.activeElement?.tagName || "").toLowerCase();
                if (tag !== "input" && tag !== "textarea") {
                    if (safeVariant === "confirm") {
                        if (document.activeElement === cancelBtn) {
                            close(false);
                            return;
                        }
                        if (document.activeElement === okBtn) {
                            close(true);
                            return;
                        }
                        return;
                    }

                    close(true);
                }
            }
        };

        activeCleanup = cleanup;

        backdrop.addEventListener("click", onBackdropClick);
        window.addEventListener("keydown", onKeyDown, true);
        okBtn?.addEventListener("click", onOk);
        cancelBtn?.addEventListener("click", onCancel);
        closeBtn?.addEventListener("click", onClose);

        setTimeout(() => {
            (safeVariant === "confirm" ? cancelBtn : okBtn)?.focus();
        }, 0);

        return promise;
    };

    const ensureToastStack = () => {
        if (toastStack && toastStack.isConnected) return toastStack;
        const el = document.createElement("div");
        el.className = "av-toast-stack";
        el.setAttribute("aria-live", "polite");
        el.setAttribute("aria-atomic", "true");
        document.body.appendChild(el);
        toastStack = el;
        return el;
    };

    const toast = (message, opts = {}) => {
        const stack = ensureToastStack();
        const safeTone = String(opts.tone || "info").trim() || "info"; // info | success | warning | danger
        const duration = Number.isFinite(Number(opts.duration)) ? Number(opts.duration) : 4000;

        const wrap = document.createElement("div");
        wrap.className = `av-toast av-toast--${safeTone}`;
        wrap.setAttribute("role", "status");

        const raw = String(message ?? "").trim();
        const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const title = escapeHtml(lines[0] || "");
        const subtitle = lines.length > 1 ? escapeHtml(lines.slice(1).join(" ")) : "";

        const msg = subtitle
            ? `<div class="av-toast-title">${title}</div><div class="av-toast-sub">${subtitle}</div>`
            : `<div class="av-toast-title">${title}</div>`;

        wrap.innerHTML = `
            <div class="av-toast-icon" aria-hidden="true"></div>
            <div class="av-toast-message">${msg}</div>
            <button type="button" class="av-toast-close" aria-label="Close">×</button>
        `;

        const closeBtn = wrap.querySelector(".av-toast-close");
        const cleanup = () => {
            wrap.remove();
        };

        const close = () => {
            wrap.classList.add("is-hiding");
            window.setTimeout(cleanup, 180);
        };

        closeBtn?.addEventListener("click", close);
        stack.appendChild(wrap);

        // auto-dismiss
        if (duration > 0) {
            const t = window.setTimeout(() => {
                toastTimers.delete(t);
                close();
            }, duration);
            toastTimers.add(t);
        }

        return { close };
    };

    const clearToasts = () => {
        for (const t of toastTimers) {
            try {
                clearTimeout(t);
            } catch {
                // ignore
            }
        }
        toastTimers.clear();
        if (toastStack && toastStack.isConnected) {
            toastStack.innerHTML = "";
        }
    };

    window.AVDialog = {
        closeActive,
        alert: (message, opts = {}) =>
            openDialog({
                title: opts.title || "Notice",
                message,
                tone: opts.tone || "info",
                variant: "alert",
                okText: opts.okText || "OK",
                icon: opts.icon,
            }),
        confirm: (message, opts = {}) =>
            openDialog({
                title: opts.title || "Confirm",
                message,
                tone: opts.tone || "info",
                variant: "confirm",
                okText: opts.okText || "OK",
                cancelText: opts.cancelText || "Cancel",
                icon: opts.icon,
                destructive: opts.destructive,
            }),
    };

    window.AVToast = {
        show: (message, opts = {}) => toast(message, opts),
        info: (message, opts = {}) => toast(message, { ...opts, tone: "info" }),
        success: (message, opts = {}) => toast(message, { ...opts, tone: "success" }),
        warning: (message, opts = {}) => toast(message, { ...opts, tone: "warning" }),
        danger: (message, opts = {}) => toast(message, { ...opts, tone: "danger" }),
        clear: clearToasts,
    };
})();

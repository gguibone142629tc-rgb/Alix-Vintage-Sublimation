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

    const closeActive = () => {
        if (typeof activeCleanup === "function") {
            activeCleanup();
            activeCleanup = null;
        }
    };

    const openDialog = ({ title, message, tone, variant, okText, cancelText } = {}) => {
        closeActive();

        const safeTitle = String(title || "Notice").trim() || "Notice";
        const safeMessage = String(message || "").trim();
        const safeTone = String(tone || "info").trim() || "info"; // info | success | danger
        const safeVariant = String(variant || "alert").trim() || "alert"; // alert | confirm

        const backdrop = document.createElement("div");
        backdrop.className = "av-dialog-backdrop";

        const dialog = document.createElement("div");
        dialog.className = `av-dialog av-dialog--${safeTone}`;
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");

        const okLabel = String(okText || "OK").trim() || "OK";
        const cancelLabel = String(cancelText || "Cancel").trim() || "Cancel";

        const actionsHtml =
            safeVariant === "confirm"
                ? `
                    <button type="button" class="av-dialog-btn av-dialog-btn--ghost" data-av-cancel>${escapeHtml(cancelLabel)}</button>
                    <button type="button" class="av-dialog-btn" data-av-ok>${escapeHtml(okLabel)}</button>
                `
                : `
                    <button type="button" class="av-dialog-btn" data-av-ok>${escapeHtml(okLabel)}</button>
                `;

        const messageHtml = escapeHtml(safeMessage).replaceAll("\n", "<br>");

        dialog.innerHTML = `
            <div class="av-dialog-head">
                <div class="av-dialog-title">${escapeHtml(safeTitle)}</div>
            </div>
            <div class="av-dialog-body">
                <div class="av-dialog-desc">${messageHtml}</div>
            </div>
            <div class="av-dialog-actions">
                ${actionsHtml}
            </div>
        `;

        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);

        const okBtn = dialog.querySelector("[data-av-ok]");
        const cancelBtn = dialog.querySelector("[data-av-cancel]");

        let resolver = null;
        const promise = new Promise((resolve) => {
            resolver = resolve;
        });

        const cleanup = () => {
            window.removeEventListener("keydown", onKeyDown, true);
            backdrop.removeEventListener("click", onBackdropClick);
            okBtn?.removeEventListener("click", onOk);
            cancelBtn?.removeEventListener("click", onCancel);
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

        setTimeout(() => {
            (safeVariant === "confirm" ? cancelBtn : okBtn)?.focus();
        }, 0);

        return promise;
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
            }),
        confirm: (message, opts = {}) =>
            openDialog({
                title: opts.title || "Confirm",
                message,
                tone: opts.tone || "info",
                variant: "confirm",
                okText: opts.okText || "OK",
                cancelText: opts.cancelText || "Cancel",
            }),
    };
})();

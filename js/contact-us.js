(function () {
    "use strict";

    const apiBaseUrl = () => {
        try {
            if (window.AlixAuth && typeof window.AlixAuth.apiBaseUrl === "function") {
                return window.AlixAuth.apiBaseUrl();
            }
        } catch {
            // ignore
        }
        return "";
    };

    const showDialog = async (message, opts = {}) => {
        if (window.AVDialog && typeof window.AVDialog.alert === "function") {
            await window.AVDialog.alert(message, opts);
            return;
        }

        window.alert(message);
    };

    const qs = (sel) => document.querySelector(sel);

    const form = qs(".contact-form");
    if (!form) return;

    const submitBtn = form.querySelector("button[type='submit']");

    const setBusy = (busy) => {
        if (submitBtn) {
            submitBtn.disabled = !!busy;
            submitBtn.textContent = busy ? "Sending..." : "Send Inquiry";
        }
    };

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const getFieldValue = (fieldName) => {
            const el = form.elements.namedItem(fieldName);
            return el && typeof el.value === "string" ? el.value : "";
        };

        const payload = {
            name: String(getFieldValue("name") || "").trim(),
            email: String(getFieldValue("email") || "").trim(),
            phone: String(getFieldValue("phone") || "").trim(),
            topic: String(getFieldValue("topic") || "").trim(),
            message: String(getFieldValue("message") || "").trim(),
        };

        if (!payload.name || !payload.email || !payload.topic || !payload.message) {
            await showDialog("Please complete the required fields.", { title: "Missing info", tone: "danger" });
            return;
        }

        setBusy(true);

        try {
            const res = await fetch(`${apiBaseUrl()}/api/contact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = String(data?.error || "Failed to send inquiry.");
                await showDialog(msg, { title: "Send failed", tone: "danger" });
                return;
            }

            form.reset();
            await showDialog("Your inquiry was sent. We'll get back to you soon.", {
                title: "Sent",
                tone: "success",
                okText: "OK",
            });
        } catch {
            await showDialog("Network error. Please try again.", { title: "Send failed", tone: "danger" });
        } finally {
            setBusy(false);
        }
    });
})();

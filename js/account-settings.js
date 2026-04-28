(function () {
    "use strict";

    const TOKEN_KEY = "alix_auth_token";
    const USER_KEY = "alix_auth_user";

    const form = document.getElementById("profileForm");
    const statusEl = document.getElementById("profileSaveStatus");
    const resetBtn = document.getElementById("resetProfileBtn");

    if (!form) {
        return;
    }

    const fields = {
        firstname: document.getElementById("profileFirstName"),
        lastname: document.getElementById("profileLastName"),
        email: document.getElementById("profileEmail"),
        phone_number: document.getElementById("profilePhone"),
        address: document.getElementById("profileAddress"),
    };

    const uiAlert = async (message, opts = {}) => {
        if (window.AVDialog?.alert) {
            await window.AVDialog.alert(String(message || ""), opts);
            return;
        }
        window.alert(String(message || ""));
    };

    const getStoredUser = () => {
        try {
            if (window.AlixAuth?.getUser) {
                return window.AlixAuth.getUser() || {};
            }
            return JSON.parse(localStorage.getItem(USER_KEY) || "{}") || {};
        } catch {
            return {};
        }
    };

    const getCurrentUser = () => {
        const raw = getStoredUser();
        return {
            firstname: String(raw.firstname || "").trim(),
            lastname: String(raw.lastname || "").trim(),
            email: String(raw.email || "").trim(),
            phone_number: String(raw.phone_number || raw.phone || "").trim(),
            address: String(raw.address || "").trim(),
            user_id: raw.user_id,
            role_name: raw.role_name,
            role: raw.role,
        };
    };

    let initialUser = getCurrentUser();

    const setStatus = (message, tone) => {
        if (!statusEl) {
            return;
        }
        statusEl.textContent = String(message || "");
        statusEl.classList.remove("is-success", "is-error");
        if (tone === "success") {
            statusEl.classList.add("is-success");
        }
        if (tone === "error") {
            statusEl.classList.add("is-error");
        }
    };

    const hydrateForm = (user) => {
        fields.firstname.value = user.firstname || "";
        fields.lastname.value = user.lastname || "";
        fields.email.value = user.email || "";
        fields.phone_number.value = user.phone_number || "";
        fields.address.value = user.address || "";
    };

    const collectForm = () => ({
        firstname: String(fields.firstname.value || "").trim(),
        lastname: String(fields.lastname.value || "").trim(),
        email: String(fields.email.value || "").trim(),
        phone_number: String(fields.phone_number.value || "").trim(),
        address: String(fields.address.value || "").trim(),
    });

    const validate = (payload) => {
        if (!payload.firstname) {
            return "First name is required.";
        }
        if (!payload.lastname) {
            return "Last name is required.";
        }
        if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
            return "Please enter a valid email address.";
        }
        return "";
    };

    const saveLocalProfile = (payload) => {
        const currentRaw = getStoredUser();
        const merged = {
            ...currentRaw,
            ...payload,
        };

        if (window.AlixAuth?.setSession) {
            const token = localStorage.getItem(TOKEN_KEY);
            window.AlixAuth.setSession(token || "", merged);
        } else {
            localStorage.setItem(USER_KEY, JSON.stringify(merged));
        }

        initialUser = getCurrentUser();
    };

    const saveServerProfile = async (payload) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            throw new Error("Unauthorized");
        }

        const base = window.AlixAuth?.apiBaseUrl ? window.AlixAuth.apiBaseUrl() : "";
        const response = await fetch(`${base}/api/account/profile`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = typeof data.error === "string" ? data.error : "Failed to update profile.";
            throw new Error(message);
        }

        return data;
    };

    const requireLogin = () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            uiAlert("Please log in first to edit your account settings.", { title: "Notice", tone: "info" })
                .finally(() => {
                    window.location.href = "login.html";
                });
            return false;
        }
        return true;
    };

    if (!requireLogin()) {
        return;
    }

    hydrateForm(initialUser);

    // Philippines address autocomplete (Nominatim)
    const addressInputElement = fields.address;
    const addressSuggestionsElement = document.getElementById("profileAddressSuggestions");
    const addressAutocompleteWrap = document.getElementById("profileAddressAutocomplete");

    const hideAddressSuggestions = () => {
        if (!addressSuggestionsElement) {
            return;
        }
        addressSuggestionsElement.classList.add("is-hidden");
        addressSuggestionsElement.innerHTML = "";
    };

    const renderAddressSuggestions = (items) => {
        if (!addressSuggestionsElement || !Array.isArray(items) || items.length === 0) {
            hideAddressSuggestions();
            return;
        }

        addressSuggestionsElement.innerHTML = "";

        items.forEach((item) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "address-suggestion";
            button.setAttribute("role", "option");
            button.textContent = item.label;
            button.addEventListener("click", () => {
                if (addressInputElement) {
                    addressInputElement.value = item.value;
                    addressInputElement.focus();
                }
                hideAddressSuggestions();
            });
            addressSuggestionsElement.appendChild(button);
        });

        addressSuggestionsElement.classList.remove("is-hidden");
    };

    if (addressInputElement && addressSuggestionsElement) {
        let debounceTimer = null;
        let currentRequestId = 0;
        let activeAbortController = null;

        const scheduleSuggestionFetch = () => {
            const query = String(addressInputElement.value || "").trim();

            if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
            }

            if (query.length < 4) {
                hideAddressSuggestions();
                return;
            }

            debounceTimer = setTimeout(async () => {
                const requestId = ++currentRequestId;

                if (activeAbortController) {
                    activeAbortController.abort();
                }
                activeAbortController = new AbortController();

                try {
                    const url = new URL("https://nominatim.openstreetmap.org/search");
                    url.searchParams.set("format", "jsonv2");
                    url.searchParams.set("addressdetails", "1");
                    url.searchParams.set("limit", "6");
                    url.searchParams.set("countrycodes", "ph");
                    url.searchParams.set("q", query);

                    const response = await fetch(url.toString(), {
                        headers: { Accept: "application/json" },
                        signal: activeAbortController.signal,
                    });

                    if (!response.ok) {
                        if (requestId === currentRequestId) {
                            hideAddressSuggestions();
                        }
                        return;
                    }

                    const data = await response.json().catch(() => []);
                    if (requestId !== currentRequestId) {
                        return;
                    }

                    const items = Array.isArray(data)
                        ? data
                              .filter((item) => item && typeof item.display_name === "string")
                              .map((item) => ({ label: item.display_name, value: item.display_name }))
                        : [];

                    renderAddressSuggestions(items);
                } catch (error) {
                    if (error && error.name === "AbortError") {
                        return;
                    }
                    hideAddressSuggestions();
                }
            }, 450);
        };

        addressInputElement.addEventListener("input", scheduleSuggestionFetch);
        addressInputElement.addEventListener("focus", scheduleSuggestionFetch);

        document.addEventListener("click", (event) => {
            if (!addressAutocompleteWrap) {
                return;
            }

            const target = event.target;
            if (target instanceof Node && addressAutocompleteWrap.contains(target)) {
                return;
            }

            hideAddressSuggestions();
        });

        addressInputElement.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                hideAddressSuggestions();
            }
        });
    }

    resetBtn?.addEventListener("click", () => {
        hydrateForm(initialUser);
        setStatus("Changes reset.");
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = collectForm();
        const error = validate(payload);
        if (error) {
            setStatus(error, "error");
            return;
        }

        try {
            const result = await saveServerProfile(payload);
            const user = result && typeof result === "object" && result.user && typeof result.user === "object" ? result.user : payload;

            saveLocalProfile(user);
            setStatus("Profile updated successfully.", "success");
            await uiAlert("Profile updated successfully.", { title: "Success", tone: "success" });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to save profile right now.";
            setStatus(message, "error");
        }
    });
})();

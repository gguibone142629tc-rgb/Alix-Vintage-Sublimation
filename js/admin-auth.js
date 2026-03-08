(function () {
    const ADMIN_SESSION_KEY = "alix_admin_logged_in";
    const ADMIN_LOGIN_AT_KEY = "alix_admin_logged_in_at";
    const ADMIN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

    const path = String(window.location.pathname || "");
    const isAdminPage = /\/admin-[^/]+\.html$/i.test(path);
    const isLegacyAdminLoginPage = /\/admin-login\.html$/i.test(path);
    const loginUrl = "login.html#admin";

    if (isAdminPage) {
        const style = document.createElement("style");
        style.textContent = `
            .admin-account-dropdown {
                position: fixed;
                z-index: 999;
                min-width: 160px;
                background: var(--panel, #ffffff);
                border: 1px solid var(--line, #d0d0d0);
                border-radius: 12px;
                box-shadow: 0 12px 26px rgba(0,0,0,0.12);
                padding: 8px;
            }

            .admin-account-dropdown.is-hidden {
                display: none;
            }

            .admin-account-item {
                width: 100%;
                border: 0;
                background: transparent;
                padding: 10px 10px;
                border-radius: 10px;
                text-align: left;
                cursor: pointer;
                font-weight: 700;
                color: var(--ink, #3a3a3a);
            }

            .admin-account-item:hover {
                background: rgba(0, 0, 0, 0.06);
            }
        `;
        document.head.appendChild(style);
    }

    const isAdminSessionFresh = () => {
        const flag = localStorage.getItem(ADMIN_SESSION_KEY) === "true";
        const loginAt = Number(localStorage.getItem(ADMIN_LOGIN_AT_KEY));
        const hasValidTimestamp = Number.isFinite(loginAt) && loginAt > 0;
        const isFresh = hasValidTimestamp && Date.now() - loginAt <= ADMIN_MAX_AGE_MS;

        if (flag && !isFresh) {
            localStorage.removeItem(ADMIN_SESSION_KEY);
            localStorage.removeItem(ADMIN_LOGIN_AT_KEY);
        }

        return flag && isFresh;
    };

    const isLoggedIn = isAdminSessionFresh();

    if (isLegacyAdminLoginPage) {
        window.location.replace(loginUrl);
        return;
    }

    if (isAdminPage && !isLoggedIn) {
        window.location.replace(loginUrl);
        return;
    }

    if (!isAdminPage) {
        return;
    }

    const adminMenuButton = document.querySelector(".admin-menu");
    if (!adminMenuButton) {
        return;
    }

    adminMenuButton.setAttribute("aria-haspopup", "true");
    adminMenuButton.setAttribute("aria-expanded", "false");

    const dropdown = document.createElement("div");
    dropdown.className = "admin-account-dropdown is-hidden";
    dropdown.setAttribute("role", "menu");

    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.className = "admin-account-item";
    logoutButton.textContent = "Log out";
    logoutButton.setAttribute("role", "menuitem");

    dropdown.appendChild(logoutButton);
    document.body.appendChild(dropdown);

    const closeDropdown = () => {
        dropdown.classList.add("is-hidden");
        adminMenuButton.setAttribute("aria-expanded", "false");
    };

    const openDropdown = () => {
        dropdown.classList.remove("is-hidden");
        dropdown.style.visibility = "hidden";
        dropdown.style.left = "0px";
        dropdown.style.top = "0px";

        // Measure and position under the button, right-aligned.
        const btnRect = adminMenuButton.getBoundingClientRect();
        const dropRect = dropdown.getBoundingClientRect();
        const top = Math.round(btnRect.bottom + 10);
        const left = Math.round(Math.max(10, btnRect.right - dropRect.width));

        dropdown.style.left = `${left}px`;
        dropdown.style.top = `${top}px`;
        dropdown.style.visibility = "visible";
        adminMenuButton.setAttribute("aria-expanded", "true");
    };

    const toggleDropdown = () => {
        const isOpen = !dropdown.classList.contains("is-hidden");
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    };

    adminMenuButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleDropdown();
    });

    logoutButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        localStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(ADMIN_LOGIN_AT_KEY);
        closeDropdown();
        window.location.href = loginUrl;
    });

    document.addEventListener("click", () => {
        closeDropdown();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeDropdown();
        }
    });

    window.addEventListener("resize", () => {
        closeDropdown();
    });
})();

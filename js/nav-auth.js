(function () {
    const style = document.createElement("style");
    style.textContent = `
        .nav-account-menu { position: relative; display: inline-flex; align-items: center; }
        .nav-account-dropdown { position: absolute; right: 0; top: calc(100% + 10px); z-index: 50; }
        .nav-account-dropdown { background: var(--panel, #ffffff); border: 1px solid var(--line, #d0d0d0); border-radius: 6px; padding: 10px 12px; min-width: 140px; }
        .nav-account-dropdown a { display: block; text-decoration: none; color: var(--ink, inherit); font-weight: 600; }
        .nav-account-dropdown a:hover { text-decoration: underline; }
    `;
    document.head.appendChild(style);

    const LOGIN_KEY = "alix_is_logged_in";
    const LOGIN_AT_KEY = "alix_logged_in_at";
    const LOGIN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
    const TOKEN_KEY = "alix_auth_token";
    const USER_KEY = "alix_auth_user";

    const token = localStorage.getItem(TOKEN_KEY);

    const base64UrlDecode = (value) => {
        const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
        return atob(padded);
    };

    const decodeJwtPayload = (jwtToken) => {
        if (!jwtToken || typeof jwtToken !== "string") {
            return null;
        }

        const parts = jwtToken.split(".");
        if (parts.length !== 3) {
            return null;
        }

        try {
            return JSON.parse(base64UrlDecode(parts[1]));
        } catch {
            return null;
        }
    };

    const isTokenValid = (jwtToken) => {
        const payload = decodeJwtPayload(jwtToken);
        if (!payload || typeof payload.exp !== "number") {
            return Boolean(jwtToken);
        }
        return Date.now() < payload.exp * 1000;
    };

    const isLoggedInByToken = Boolean(token) && isTokenValid(token);

    const loginFlag = localStorage.getItem(LOGIN_KEY) === "true";
    const loginAt = Number(localStorage.getItem(LOGIN_AT_KEY));
    const hasValidTimestamp = Number.isFinite(loginAt) && loginAt > 0;
    const isFreshLogin = hasValidTimestamp && Date.now() - loginAt <= LOGIN_MAX_AGE_MS;
    const isLoggedInByFlag = loginFlag && isFreshLogin;

    const isLoggedIn = isLoggedInByToken || isLoggedInByFlag;

    if (loginFlag && !isFreshLogin) {
        localStorage.removeItem(LOGIN_KEY);
        localStorage.removeItem(LOGIN_AT_KEY);
    }

    if (token && !isLoggedInByToken) {
        localStorage.removeItem(TOKEN_KEY);
    }

    const isProtectedPage = /(order-history|product-order-individual|product-order-group|upload-custom-design)\.html$/i.test(
        window.location.pathname
    );
    const loginButtons = document.querySelectorAll(".nav-login-btn-link");
    const logoutButtons = document.querySelectorAll(".nav-logout-btn-link");
    const accountLinks = document.querySelectorAll(".nav-account-link");
    const orderLinks = document.querySelectorAll(".nav-order-link");

    const performLogout = (event) => {
        event.stopPropagation();
        event.preventDefault();
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(LOGIN_KEY);
        localStorage.removeItem(LOGIN_AT_KEY);
        localStorage.removeItem("alix_pending_email");
        localStorage.removeItem("alix_pending_phone");
        window.location.href = "login.html";
    };

    if (!isLoggedIn && isProtectedPage) {
        window.location.replace("login.html");
        return;
    }

    loginButtons.forEach((button) => {
        button.classList.toggle("is-hidden", isLoggedIn);
    });

    logoutButtons.forEach((button) => {
        button.classList.toggle("is-hidden", !isLoggedIn);
        button.addEventListener("click", performLogout);
    });

    accountLinks.forEach((link) => {
        link.classList.toggle("is-hidden", !isLoggedIn);
    });

    orderLinks.forEach((link) => {
        link.classList.toggle("is-hidden", !isLoggedIn);
    });

    const closeAllAccountMenus = () => {
        document.querySelectorAll(".nav-account-dropdown").forEach((dropdown) => {
            dropdown.classList.add("is-hidden");
        });
        document.querySelectorAll(".nav-account-link[aria-expanded]").forEach((trigger) => {
            trigger.setAttribute("aria-expanded", "false");
        });
    };

    const ensureAccountMenu = (link) => {
        let menu = link.closest(".nav-account-menu");
        if (!menu) {
            menu = document.createElement("div");
            menu.className = "nav-account-menu";
            const parent = link.parentNode;
            if (parent) {
                parent.insertBefore(menu, link);
                menu.appendChild(link);
            }
        }

        let dropdown = menu.querySelector(".nav-account-dropdown");
        if (!dropdown) {
            dropdown = document.createElement("div");
            dropdown.className = "nav-account-dropdown is-hidden";
            dropdown.setAttribute("role", "menu");

            const logoutLink = document.createElement("a");
            logoutLink.className = "nav-logout-btn-link";
            logoutLink.href = "#";
            logoutLink.setAttribute("role", "menuitem");
            logoutLink.textContent = "Log Out";
            logoutLink.addEventListener("click", performLogout);

            dropdown.appendChild(logoutLink);
            menu.appendChild(dropdown);
        }

        return dropdown;
    };

    accountLinks.forEach((link) => {
        const dropdown = ensureAccountMenu(link);

        if (link.tagName && link.tagName.toLowerCase() === "a") {
            link.setAttribute("href", "#");
            link.setAttribute("role", "button");
        }

        link.setAttribute("aria-haspopup", "true");
        link.setAttribute("aria-expanded", "false");

        link.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const isOpen = !dropdown.classList.contains("is-hidden");
            closeAllAccountMenus();

            dropdown.classList.toggle("is-hidden", isOpen);
            link.setAttribute("aria-expanded", isOpen ? "false" : "true");
        });
    });

    document.addEventListener("click", () => {
        closeAllAccountMenus();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeAllAccountMenus();
        }
    });
})();

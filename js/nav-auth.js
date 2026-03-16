(function () {
    const STANDARD_FOOTER_HTML = `
        <div class="footer-wrap">
            <div class="footer-col footer-brand">
                <h3>ALIX VINTAGE</h3>
                <p>Your trusted shop for custom sublimation jerseys, teamwear, and apparel.</p>
                <p class="footer-note">ALIX VINTAGE delivers premium custom sublimation for teams, schools, and businesses with easy catalog ordering or design uploads, accurate roster personalization, transparent admin quoting, and reliable production-to-delivery updates.</p>
            </div>
            <div class="footer-col">
                <h4>Contact Info</h4>
                <p><strong>Phone:</strong> +63 9XX XXX XXXX</p>
                <p><strong>Email:</strong> hello@alixvintage.com</p>
                <p><strong>Address:</strong> Purok 0, Example Street, Tagum City, Philippines</p>
            </div>
            <div class="footer-col">
                <h4>Business Hours</h4>
                <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                <p>Saturday: 9:00 AM - 4:00 PM</p>
                <p>Sunday: Closed</p>
            </div>
            <div class="footer-col">
                <h4>Follow Us</h4>
                <p><a href="https://www.facebook.com/profile.php?id=61563383904729" target="_blank" rel="noopener noreferrer">Facebook Page</a></p>
            </div>
        </div>
        <div class="footer-bottom">
            <span>(c) 2026 ALIX VINTAGE. All rights reserved.</span>
            <span>Dummy legal links: Privacy Policy | Terms of Service</span>
        </div>
    `;

    const normalizeFooters = () => {
        document.querySelectorAll("footer.site-footer").forEach((footer) => {
            footer.innerHTML = STANDARD_FOOTER_HTML;
        });
    };

    normalizeFooters();

    const style = document.createElement("style");
    style.textContent = `
        .nav-account-menu { position: relative; display: inline-flex; align-items: center; }
        .nav-account-dropdown { position: absolute; right: 0; top: calc(100% + 10px); z-index: 50; }
        .nav-account-dropdown { background: var(--panel, #ffffff); border: 1px solid var(--line, #d0d0d0); border-radius: 6px; padding: 10px 12px; min-width: 140px; }
        .nav-account-dropdown a { display: block; text-decoration: none; color: var(--ink, inherit); font-weight: 600; }
        .nav-account-dropdown a:hover { text-decoration: underline; }

        /* Keep footer presentation consistent across pages with different CSS files */
        footer.site-footer {
            background: radial-gradient(circle at 50% 50%, #4b220c 0%, #2b1308 65%, #1f0f08 100%) !important;
            color: #f3ede6 !important;
            padding: 20px 0 10px !important;
            border-top: 2px solid rgba(216, 172, 126, 0.18) !important;
            font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif !important;
        }
        footer.site-footer .footer-wrap {
            width: min(1360px, 92%) !important;
            margin: 0 auto !important;
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 14px !important;
            align-items: start !important;
            text-align: center !important;
        }
        footer.site-footer .footer-col { min-width: 0 !important; }
        footer.site-footer .footer-col h3,
        footer.site-footer .footer-col h4 {
            margin: 0 0 8px !important;
            color: #f7c183 !important;
            letter-spacing: 1px !important;
            text-transform: uppercase !important;
            font-weight: 800 !important;
            font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif !important;
        }
        footer.site-footer .footer-col h3 { font-size: 20px !important; line-height: 1.05 !important; }
        footer.site-footer .footer-col h4 { font-size: 18px !important; line-height: 1.05 !important; }
        footer.site-footer .footer-col p,
        footer.site-footer .footer-col a {
            margin: 0 0 5px !important;
            color: #f3ede6 !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
            text-decoration-thickness: 1.5px !important;
            text-underline-offset: 2px !important;
            font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif !important;
        }
        footer.site-footer .footer-note { opacity: 0.96 !important; }
        footer.site-footer .footer-bottom {
            width: min(1360px, 92%) !important;
            margin: 10px auto 0 !important;
            padding-top: 8px !important;
            border-top: 1px solid rgba(216, 172, 126, 0.22) !important;
            display: flex !important;
            justify-content: space-between !important;
            gap: 16px !important;
            color: #ead7c3 !important;
            font-size: 11px !important;
            font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif !important;
        }
        @media (max-width: 1100px) {
            footer.site-footer .footer-wrap { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 640px) {
            footer.site-footer .footer-wrap { grid-template-columns: 1fr !important; }
            footer.site-footer .footer-bottom { flex-direction: column !important; text-align: center !important; }
            footer.site-footer .footer-col h3 { font-size: 18px !important; }
            footer.site-footer .footer-col h4 { font-size: 16px !important; }
            footer.site-footer .footer-col p,
            footer.site-footer .footer-col a { font-size: 12px !important; }
        }
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

    const isProtectedPage = /(order-history|order-tracking|product-order-individual|product-order-group|upload-custom-design)\.html$/i.test(
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

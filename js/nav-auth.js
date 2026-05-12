(function () {
    const STANDARD_FOOTER_HTML = `
        <div class="footer-wrap">
            <div class="footer-col footer-brand">
                <h3>ALIX VINTAGE</h3>
                <p>Your trusted shop for custom sublimation jerseys, teamwear, and apparel.</p>
            </div>
            <div class="footer-col">
                <h4>Contact Info</h4>
                <p><strong>Phone:</strong> 0994 088 7463</p>
                <p><strong>Email:</strong> alixvintagesublimation@gmail.com</p>
                <p><strong>Address:</strong> STALL #04-A Tagum Cultural and Trade Center, Magugpo Poblacion, Tagum City</p>
                <p><a href="faq.html">FAQ and Help Center</a></p>
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
            <span>
                <a href="#" class="legal-summary-trigger">Privacy and Terms Summary</a>
                | <a href="privacy-policy.html">Privacy Policy</a>
                | <a href="terms-of-service.html">Terms of Service</a>
            </span>
        </div>
    `;

    const LEGAL_SUMMARY_MODAL_HTML = `
        <div id="legal-summary-modal" class="legal-summary-modal is-hidden" role="dialog" aria-modal="true" aria-labelledby="legal-summary-title">
            <div class="legal-summary-panel" role="document">
                <button type="button" class="legal-summary-close" aria-label="Close legal summary">&times;</button>
                <h3 id="legal-summary-title">Privacy and Terms Summary</h3>
                <p>This summary is for quick guidance and does not replace the full policies.</p>

                <h4>Privacy Highlights</h4>
                <ul>
                    <li>We collect account, order, design upload, and basic usage data to run the service.</li>
                    <li>We use your data for order processing, support, fraud prevention, and legal compliance.</li>
                    <li>We do not sell personal data and only share necessary information with service partners.</li>
                </ul>

                <h4>Terms Highlights</h4>
                <ul>
                    <li>Custom orders require approval before production and may have limited edits after approval.</li>
                    <li>Pricing, timelines, and release depend on complete order details and payment terms.</li>
                    <li>Uploaded designs must be lawful and owned or authorized by the customer.</li>
                </ul>

                <p class="legal-summary-links">
                    Read full details:
                    <a href="privacy-policy.html">Privacy Policy</a>
                    and
                    <a href="terms-of-service.html">Terms of Service</a>.
                </p>
            </div>
        </div>
    `;

    const normalizeFooters = () => {
        document.querySelectorAll("footer.site-footer").forEach((footer) => {
            footer.innerHTML = STANDARD_FOOTER_HTML;
        });
    };

    const ensureLegalSummaryModal = () => {
        if (!document.getElementById("legal-summary-modal")) {
            document.body.insertAdjacentHTML("beforeend", LEGAL_SUMMARY_MODAL_HTML);
        }
    };

    normalizeFooters();
    ensureLegalSummaryModal();

    const style = document.createElement("style");
    style.textContent = `
        .nav-account-menu { position: relative; display: inline-flex; align-items: center; }
        .nav-account-dropdown {
            position: absolute;
            right: 0;
            top: calc(100% + 12px);
            z-index: 120;
            width: 246px;
            background: #ffffff;
            border: 1px solid rgba(40, 40, 40, 0.12);
            border-radius: 14px;
            box-shadow: 0 16px 42px rgba(0, 0, 0, 0.2);
            padding: 10px;
            overflow: hidden;
            backdrop-filter: blur(4px);
        }
        .nav-account-dropdown::before {
            content: "";
            position: absolute;
            right: 18px;
            top: -7px;
            width: 12px;
            height: 12px;
            transform: rotate(45deg);
            background: #ffffff;
            border-left: 1px solid rgba(40, 40, 40, 0.12);
            border-top: 1px solid rgba(40, 40, 40, 0.12);
        }
        .nav-account-header {
            padding: 10px 10px 12px;
            border-bottom: 1px solid rgba(40, 40, 40, 0.1);
            margin-bottom: 6px;
        }
        .nav-account-name {
            display: block;
            font-size: 15px;
            font-weight: 800;
            color: #202020;
            line-height: 1.2;
        }
        .nav-account-email {
            display: block;
            margin-top: 3px;
            font-size: 12px;
            color: #6d6d6d;
            line-height: 1.2;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .nav-account-item {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            border-radius: 10px;
            padding: 9px 10px;
            text-decoration: none;
            color: #2b2b2b;
            font-size: 14px;
            font-weight: 700;
            transition: background 0.18s ease, color 0.18s ease;
        }
        .nav-account-item + .nav-account-item { margin-top: 2px; }
        .nav-account-item svg {
            width: 16px;
            height: 16px;
            flex: 0 0 16px;
            stroke: currentColor;
            fill: none;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        .nav-account-item:hover {
            background: #f4f5f7;
            color: #121212;
        }
        .nav-account-item--logout:hover {
            background: #fbe9e9;
            color: #9f2424;
        }
        @media (max-width: 640px) {
            .nav-account-dropdown {
                right: -8px;
                width: 220px;
                top: calc(100% + 10px);
            }
        }



        .legal-summary-modal {
            position: fixed;
            inset: 0;
            z-index: 3000;
            display: grid;
            place-items: center;
            background: rgba(0, 0, 0, 0.5);
            padding: 16px;
        }
        .legal-summary-panel {
            width: min(760px, 100%);
            max-height: min(82vh, 720px);
            overflow: auto;
            border-radius: 14px;
            border: 1px solid rgba(40, 40, 40, 0.16);
            background: #ffffff;
            color: #232323;
            box-shadow: 0 24px 46px rgba(0, 0, 0, 0.28);
            padding: 18px 18px 14px;
            position: relative;
        }
        .legal-summary-close {
            position: absolute;
            right: 10px;
            top: 8px;
            border: 0;
            background: transparent;
            color: #555;
            font-size: 28px;
            line-height: 1;
            cursor: pointer;
        }
        .legal-summary-panel h3 {
            font-size: 22px;
            margin: 0 0 8px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .legal-summary-panel h4 {
            font-size: 14px;
            margin: 14px 0 8px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }
        .legal-summary-panel p,
        .legal-summary-panel li {
            font-size: 13px;
            line-height: 1.6;
            color: #444;
        }
        .legal-summary-panel ul {
            margin: 0;
            padding-left: 18px;
        }
        .legal-summary-panel a {
            color: #5b2b0f;
            font-weight: 700;
        }
        .legal-summary-links {
            margin-top: 10px;
        }
        .legal-summary-modal.is-hidden {
            display: none;
        }

        /* Unified mobile customer header */
        header .nav {
            position: relative;
        }
        @media (max-width: 760px) {
            header {
                padding: 10px 14px !important;
            }
            header .nav {
                min-height: 62px;
                gap: 10px;
            }
            header nav,
            header .nav-icons {
                display: none !important;
            }
            header .logo-wrap {
                min-height: 48px;
                gap: 10px;
            }
            header .logo-wrap img {
                width: 44px !important;
                height: 44px !important;
            }
            header .logo-wrap span {
                font-size: 14px !important;
                letter-spacing: 1px !important;
                font-weight: 800;
            }
            .nav-menu-toggle {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                border-radius: 999px;
                padding: 0;
                gap: 4px;
                flex-direction: column;
                border: 1px solid rgba(255, 255, 255, 0.24);
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                flex-shrink: 0;
                cursor: pointer;
            }
            .nav-menu-toggle span {
                display: block;
                width: 18px;
                height: 2px;
                border-radius: 999px;
                background: currentColor;
            }
            .nav-menu-panel {
                position: absolute;
                right: 0;
                top: calc(100% + 10px);
                width: min(320px, calc(100vw - 28px));
                display: grid;
                gap: 6px;
                padding: 10px;
                border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(39, 24, 17, 0.98);
                box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
                z-index: 220;
            }
            .nav-menu-panel a {
                display: block;
                text-decoration: none;
                color: #f2e7d8;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                border-radius: 10px;
                padding: 10px 12px;
                border: 1px solid rgba(255, 255, 255, 0.14);
                background: rgba(255, 255, 255, 0.04);
            }
            .nav-menu-panel a:hover {
                background: rgba(224, 192, 144, 0.2);
                border-color: rgba(224, 192, 144, 0.4);
                color: #fff7eb;
            }
            .nav-menu-panel.is-hidden {
                display: none !important;
            }
        }
        @media (min-width: 761px) {
            .nav-menu-toggle,
            .nav-menu-panel {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);

    const legalSummaryModal = document.getElementById("legal-summary-modal");
    const legalSummaryClose = legalSummaryModal ? legalSummaryModal.querySelector(".legal-summary-close") : null;

    const openLegalSummary = () => {
        if (!legalSummaryModal) return;
        legalSummaryModal.classList.remove("is-hidden");
        document.body.style.overflow = "hidden";
    };

    const closeLegalSummary = () => {
        if (!legalSummaryModal) return;
        legalSummaryModal.classList.add("is-hidden");
        document.body.style.overflow = "";
    };

    document.addEventListener("click", (event) => {
        const trigger = event.target.closest(".legal-summary-trigger");
        if (trigger) {
            event.preventDefault();
            openLegalSummary();
            return;
        }

        if (legalSummaryModal && event.target === legalSummaryModal) {
            closeLegalSummary();
        }
    });

    if (legalSummaryClose) {
        legalSummaryClose.addEventListener("click", closeLegalSummary);
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeLegalSummary();
        }
    });

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

    const isProtectedPage = /(cart|order-history|order-tracking|account-settings|product-order-individual|product-order-group|upload-custom-design)\.html$/i.test(
        window.location.pathname
    );
    const loginButtons = document.querySelectorAll(".nav-login-btn-link");
    const logoutButtons = document.querySelectorAll(".nav-logout-btn-link");
    const accountLinks = document.querySelectorAll(".nav-account-link");
    const orderLinks = document.querySelectorAll(".nav-order-link");

    const getUserIdentity = () => {
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) {
            return { name: "My Account", email: "" };
        }

        try {
            const user = JSON.parse(raw);
            const first = String(user?.firstname || "").trim();
            const last = String(user?.lastname || "").trim();
            const full = `${first} ${last}`.trim();
            const email = String(user?.email || "").trim();
            return {
                name: full || email || "My Account",
                email,
            };
        } catch {
            return { name: "My Account", email: "" };
        }
    };

    // Ensure there is a clickable cart link on pages that only have the cart SVG.
    // (Some pages include the cart icon as a plain <svg> without an <a> wrapper.)
    document.querySelectorAll('.nav-icons').forEach((wrap) => {
        const existingLink = wrap.querySelector('a.nav-order-link');
        if (existingLink) return;

        const svgs = Array.from(wrap.querySelectorAll('svg.nav-icon'));
        const cartSvg = svgs.find((svg) => {
            const html = svg.outerHTML || '';
            return html.includes('M6 6h14') && html.includes('circle') && html.includes('cx="9"') && html.includes('cx="17"');
        });
        if (!cartSvg) return;

        const a = document.createElement('a');
        a.className = 'nav-order-link is-hidden';
        a.href = 'cart.html';
        a.setAttribute('aria-label', 'Cart');
        cartSvg.parentNode && cartSvg.parentNode.insertBefore(a, cartSvg);
        a.appendChild(cartSvg);
    });

    // Repurpose the existing "order" icon link as the Cart link.
    document.querySelectorAll('a.nav-order-link').forEach((link) => {
        link.setAttribute('href', 'cart.html');
        link.setAttribute('aria-label', 'Cart');
    });

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
            menu.appendChild(dropdown);
        }

        const identity = getUserIdentity();

        let header = dropdown.querySelector('.nav-account-header');
        if (!header) {
            header = document.createElement('div');
            header.className = 'nav-account-header';
            dropdown.prepend(header);
        }
        header.innerHTML = `
            <span class="nav-account-name">${identity.name}</span>
            <span class="nav-account-email">${identity.email || 'Signed in'}</span>
        `;

        let ordersLink = dropdown.querySelector('.nav-account-item--orders');
        if (!ordersLink) {
            ordersLink = Array.from(dropdown.querySelectorAll('a')).find((a) => {
                const href = String(a.getAttribute('href') || '').toLowerCase();
                return href.endsWith('order-history.html') || href.endsWith('order-tracking.html');
            }) || null;
            if (ordersLink) {
                ordersLink.classList.add('nav-account-item', 'nav-account-item--orders');
                ordersLink.setAttribute('role', 'menuitem');
                ordersLink.href = 'order-tracking.html';
                ordersLink.innerHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18"></path><path d="M7 3h10v18H7z"></path><path d="M10 11h4"></path><path d="M10 15h4"></path></svg>
                    <span>Orders</span>
                `;
            }
        }
        if (!ordersLink) {
            ordersLink = document.createElement('a');
            ordersLink.className = 'nav-account-item nav-account-item--orders';
            ordersLink.href = 'order-tracking.html';
            ordersLink.setAttribute('role', 'menuitem');
            ordersLink.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18"></path><path d="M7 3h10v18H7z"></path><path d="M10 11h4"></path><path d="M10 15h4"></path></svg>
                <span>Orders</span>
            `;
            dropdown.appendChild(ordersLink);
        }

        let profileLink = dropdown.querySelector('.nav-account-item--profile');
        if (!profileLink) {
            profileLink = document.createElement('a');
            profileLink.className = 'nav-account-item nav-account-item--profile';
            profileLink.href = 'account-settings.html';
            profileLink.setAttribute('role', 'menuitem');
            profileLink.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"></path><path d="M4 20a8 8 0 0 1 16 0"></path></svg>
                <span>Account Settings</span>
            `;
            dropdown.appendChild(profileLink);
        }

        let logoutLink = dropdown.querySelector('.nav-logout-btn-link');
        if (logoutLink) {
            logoutLink.classList.add('nav-account-item', 'nav-account-item--logout');
            logoutLink.setAttribute('role', 'menuitem');
            logoutLink.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l-5-5 5-5"></path><path d="M5 12h11"></path><path d="M14 4h5v16h-5"></path></svg>
                <span>Log Out</span>
            `;
        }
        if (!logoutLink) {
            logoutLink = document.createElement('a');
            logoutLink.className = 'nav-account-item nav-account-item--logout nav-logout-btn-link';
            logoutLink.href = '#';
            logoutLink.setAttribute('role', 'menuitem');
            logoutLink.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l-5-5 5-5"></path><path d="M5 12h11"></path><path d="M14 4h5v16h-5"></path></svg>
                <span>Log Out</span>
            `;
            logoutLink.addEventListener('click', performLogout);
            dropdown.appendChild(logoutLink);
        }

        // Keep a stable order: header -> orders -> account settings -> logout.
        if (header.nextElementSibling !== ordersLink) {
            dropdown.insertBefore(ordersLink, header.nextElementSibling);
        }
        if (ordersLink.nextElementSibling !== profileLink) {
            dropdown.insertBefore(profileLink, ordersLink.nextElementSibling);
        }
        if (profileLink.nextElementSibling !== logoutLink) {
            dropdown.insertBefore(logoutLink, profileLink.nextElementSibling);
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

    const ensureMobileMenuShell = () => {
        const navRoot = document.querySelector("header .nav");
        if (!navRoot) {
            return { mobileMenuToggle: null, mobileMenuPanel: null };
        }

        let mobileMenuToggle = navRoot.querySelector(".nav-menu-toggle");
        if (!mobileMenuToggle) {
            mobileMenuToggle = document.createElement("button");
            mobileMenuToggle.className = "nav-menu-toggle";
            mobileMenuToggle.type = "button";
            mobileMenuToggle.setAttribute("aria-label", "Open menu");
            mobileMenuToggle.setAttribute("aria-expanded", "false");
            mobileMenuToggle.setAttribute("aria-controls", "mobile-nav-menu");
            mobileMenuToggle.innerHTML = "<span></span><span></span><span></span>";
            navRoot.appendChild(mobileMenuToggle);
        }
        if (mobileMenuToggle.querySelectorAll("span").length < 3) {
            mobileMenuToggle.innerHTML = "<span></span><span></span><span></span>";
        }

        let mobileMenuPanel = navRoot.querySelector("#mobile-nav-menu");
        if (!mobileMenuPanel) {
            mobileMenuPanel = document.createElement("div");
            mobileMenuPanel.className = "nav-menu-panel is-hidden";
            mobileMenuPanel.id = "mobile-nav-menu";
            mobileMenuPanel.setAttribute("role", "menu");
            mobileMenuPanel.setAttribute("aria-label", "Mobile navigation");
            navRoot.appendChild(mobileMenuPanel);
        }

        return { mobileMenuToggle, mobileMenuPanel };
    };

    const { mobileMenuToggle, mobileMenuPanel } = ensureMobileMenuShell();

    const renderMobileMenu = () => {
        if (!mobileMenuPanel) {
            return;
        }

        mobileMenuPanel.innerHTML = "";

        const entries = [
            { label: "Shop Now", href: "categories.html", className: "nav-mobile-shop-link" },
            { label: "Contact", href: "contact-us.html", className: "nav-mobile-contact-link" },
            { label: "Track Order", href: isLoggedIn ? "order-history.html" : "login.html", className: "nav-mobile-orders-link" },
        ];

        if (isLoggedIn) {
            entries.push({ label: "Account Settings", href: "account-settings.html", className: "nav-mobile-account-link" });
            entries.push({ label: "Log Out", href: "#", className: "nav-mobile-logout-link" });
        } else {
            entries.push({ label: "Log In", href: "login.html", className: "nav-mobile-login-link" });
        }

        entries.forEach((entry) => {
            const link = document.createElement("a");
            link.textContent = entry.label;
            link.href = entry.href;
            link.className = entry.className;
            link.setAttribute("role", "menuitem");
            mobileMenuPanel.appendChild(link);
        });

        const mobileLogout = mobileMenuPanel.querySelector(".nav-mobile-logout-link");
        if (mobileLogout) {
            mobileLogout.addEventListener("click", performLogout);
        }
    };

    renderMobileMenu();

    const closeMobileMenu = () => {
        if (!mobileMenuToggle || !mobileMenuPanel) {
            return;
        }

        mobileMenuPanel.classList.add("is-hidden");
        mobileMenuToggle.setAttribute("aria-expanded", "false");
    };

    if (mobileMenuToggle && mobileMenuPanel) {
        mobileMenuToggle.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const isOpen = !mobileMenuPanel.classList.contains("is-hidden");
            closeAllAccountMenus();
            mobileMenuPanel.classList.toggle("is-hidden", isOpen);
            mobileMenuToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
        });

        mobileMenuPanel.addEventListener("click", (event) => {
            const target = event.target;
            if (target && target.closest("a")) {
                closeMobileMenu();
            }
        });
    }

    document.addEventListener("click", () => {
        closeAllAccountMenus();
        closeMobileMenu();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeAllAccountMenus();
            closeMobileMenu();
        }
    });

    window.addEventListener("resize", () => {
        closeMobileMenu();
    });
})();


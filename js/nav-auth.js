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
                justify-content: flex-start;
            }
            header nav {
                display: none !important;
            }

            /* Keep Cart + Notifications visible on mobile header (outside hamburger). */
            header .nav-icons {
                display: flex !important;
                align-items: center;
                gap: 10px;
                margin-left: auto;
                min-height: 44px;
            }

            /* Collapse non-essential header links into the hamburger menu. */
            header .nav-icons .nav-contact-link,
            header .nav-icons .nav-login-btn-link,
            header .nav-icons .nav-account-menu,
            header .nav-icons .nav-account-link {
                display: none !important;
            }

            header .nav-icons a.nav-order-link,
            header .nav-icons a.nav-notifications-link {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
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
                border: 1px solid var(--theme-line, rgba(255, 255, 255, 0.24));
                background: color-mix(in srgb, var(--theme-panel, rgba(15, 17, 23, 0.7)) 78%, rgba(6, 7, 11, 0.9));
                color: var(--theme-text, #ffffff);
                flex-shrink: 0;
                cursor: pointer;
            }

            .nav-menu-toggle:hover {
                border-color: color-mix(in srgb, var(--theme-brand-2, #ff6b6b) 55%, var(--theme-line, rgba(255, 255, 255, 0.24)));
                box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-brand, #e63946) 22%, transparent);
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
                border: 1px solid var(--theme-line, rgba(255, 255, 255, 0.2));
                background: color-mix(in srgb, var(--theme-panel, rgba(16, 18, 26, 0.72)) 92%, rgba(6, 7, 11, 0.85));
                box-shadow: var(--theme-shadow, 0 20px 50px rgba(0, 0, 0, 0.7));
                z-index: 220;
            }
            .nav-menu-panel a {
                display: block;
                text-decoration: none;
                color: var(--theme-text, #e4eaf2);
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                border-radius: 10px;
                padding: 10px 12px;
                border: 1px solid var(--theme-line, rgba(255, 255, 255, 0.14));
                background: rgba(255, 255, 255, 0.04);
            }
            .nav-menu-panel a:hover {
                background: color-mix(in srgb, var(--theme-brand, #e63946) 18%, rgba(255, 255, 255, 0.04));
                border-color: color-mix(in srgb, var(--theme-brand-2, #ff6b6b) 55%, var(--theme-line, rgba(255, 255, 255, 0.14)));
                color: #ffffff;
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

    const safeGet = (storage, key) => {
        try {
            return storage.getItem(key);
        } catch {
            return null;
        }
    };

    const safeRemove = (storage, key) => {
        try {
            storage.removeItem(key);
        } catch {
            // ignore
        }
    };

    const getFromAnyStorage = (key) => {
        const sessionValue = safeGet(sessionStorage, key);
        if (sessionValue != null) {
            return sessionValue;
        }
        return safeGet(localStorage, key);
    };

    const removeFromAllStorages = (key) => {
        safeRemove(sessionStorage, key);
        safeRemove(localStorage, key);
    };

    const token = getFromAnyStorage(TOKEN_KEY);

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

    const loginFlag = getFromAnyStorage(LOGIN_KEY) === "true";
    const loginAt = Number(getFromAnyStorage(LOGIN_AT_KEY));
    const hasValidTimestamp = Number.isFinite(loginAt) && loginAt > 0;
    const isFreshLogin = hasValidTimestamp && Date.now() - loginAt <= LOGIN_MAX_AGE_MS;
    const isLoggedInByFlag = loginFlag && isFreshLogin;

    const isLoggedIn = isLoggedInByToken || isLoggedInByFlag;

    if (loginFlag && !isFreshLogin) {
        removeFromAllStorages(LOGIN_KEY);
        removeFromAllStorages(LOGIN_AT_KEY);
    }

    if (token && !isLoggedInByToken) {
        removeFromAllStorages(TOKEN_KEY);
        removeFromAllStorages(USER_KEY);
        removeFromAllStorages(LOGIN_KEY);
        removeFromAllStorages(LOGIN_AT_KEY);
    }

    const isProtectedPage = /(cart|order-history|order-tracking|account-settings|notifications|product-order-individual|product-order-group|upload-custom-design)\.html$/i.test(
        window.location.pathname
    );
    const loginButtons = document.querySelectorAll(".nav-login-btn-link");
    const logoutButtons = document.querySelectorAll(".nav-logout-btn-link");
    const accountLinks = document.querySelectorAll(".nav-account-link");
    const orderLinks = document.querySelectorAll(".nav-order-link");

    const getUserIdentity = () => {
        const raw = getFromAnyStorage(USER_KEY);
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

    // Ensure cart red-dot exists (no counter) when cart has items.
    document.querySelectorAll('a.nav-order-link').forEach((link) => {
        let dot = link.querySelector('.nav-cart-dot');
        if (!dot) {
            dot = document.createElement('span');
            dot.className = 'nav-cart-dot is-hidden';
            dot.setAttribute('aria-label', 'Cart has items');
            link.appendChild(dot);
        }
        dot.classList.add('is-hidden');
    });

    // Ensure there is a Notifications icon link beside the Cart icon.
    document.querySelectorAll('.nav-icons').forEach((wrap) => {
        const existing = wrap.querySelector('a.nav-notifications-link');
        if (existing) {
            existing.classList.toggle('is-hidden', !isLoggedIn);
            return;
        }

        const a = document.createElement('a');
        a.className = 'nav-notifications-link is-hidden';
        a.href = 'notifications.html';
        a.setAttribute('aria-label', 'Notifications');
        a.innerHTML = `
            <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
        `;

        const badge = document.createElement('span');
        badge.className = 'nav-notifications-badge is-hidden';
        badge.setAttribute('aria-label', 'Unread notifications');
        a.appendChild(badge);

        const cartLink = wrap.querySelector('a.nav-order-link');
        if (cartLink && cartLink.nextSibling) {
            wrap.insertBefore(a, cartLink.nextSibling);
        } else {
            wrap.appendChild(a);
        }

        a.classList.toggle('is-hidden', !isLoggedIn);
    });

    const NOTIFICATIONS_KEY = 'alix_order_notifications_v1';

    const CART_HAS_ITEMS_KEY = 'alix_cart_has_items_v1';
    const CART_HAS_ITEMS_AT_KEY = 'alix_cart_has_items_at_v1';
    const CART_UPDATED_EVENT = 'alix:cart-updated';

    const getUnreadNotificationCount = () => {
        try {
            const raw = localStorage.getItem(NOTIFICATIONS_KEY);
            if (!raw) return 0;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return 0;
            return parsed.reduce((sum, n) => sum + (n && typeof n === 'object' && n.read ? 0 : 1), 0);
        } catch {
            return 0;
        }
    };

    const refreshNotificationBadge = () => {
        const count = getUnreadNotificationCount();
        document.querySelectorAll('a.nav-notifications-link').forEach((link) => {
            let badge = link.querySelector('.nav-notifications-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-notifications-badge is-hidden';
                badge.setAttribute('aria-label', 'Unread notifications');
                link.appendChild(badge);
            }

            const display = count > 99 ? '99+' : String(count);
            badge.textContent = display;
            badge.classList.toggle('is-hidden', !isLoggedIn || count <= 0);
        });
    };

    const readCartHasItemsCache = () => {
        try {
            const v = localStorage.getItem(CART_HAS_ITEMS_KEY);
            const at = Number(localStorage.getItem(CART_HAS_ITEMS_AT_KEY) || 0) || 0;
            return {
                hasItems: v === '1',
                at,
            };
        } catch {
            return { hasItems: false, at: 0 };
        }
    };

    const setCartDot = (hasItems) => {
        document.querySelectorAll('a.nav-order-link').forEach((link) => {
            const dot = link.querySelector('.nav-cart-dot');
            if (!dot) return;
            dot.classList.toggle('is-hidden', !isLoggedIn || !hasItems);
        });
    };

    let cartDotRefreshInFlight = false;
    const refreshCartDot = async ({ force } = {}) => {
        const cached = readCartHasItemsCache();
        if (cached.at) {
            setCartDot(cached.hasItems);
        }

        if (!isLoggedIn) {
            setCartDot(false);
            return;
        }

        const isFresh = cached.at && (Date.now() - cached.at) < 60_000;
        if (!force && isFresh) {
            return;
        }

        if (cartDotRefreshInFlight) return;
        if (!window.AlixCart?.getCart) return;
        cartDotRefreshInFlight = true;

        try {
            const env = await window.AlixCart.getCart();
            const cart = env?.cart && typeof env.cart === 'object' ? env.cart : env;
            const items = Array.isArray(cart?.items) ? cart.items : [];
            const hasItems = items.length > 0;
            setCartDot(hasItems);
        } catch {
            // ignore
        } finally {
            cartDotRefreshInFlight = false;
        }
    };

    const performLogout = (event) => {
        event.stopPropagation();
        event.preventDefault();

        if (window.AlixAuth?.clearSession) {
            window.AlixAuth.clearSession();
        } else {
            removeFromAllStorages(TOKEN_KEY);
            removeFromAllStorages(USER_KEY);
            removeFromAllStorages(LOGIN_KEY);
            removeFromAllStorages(LOGIN_AT_KEY);
        }

        removeFromAllStorages("alix_pending_email");
        removeFromAllStorages("alix_pending_phone");
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

    document.querySelectorAll('a.nav-notifications-link').forEach((link) => {
        link.classList.toggle('is-hidden', !isLoggedIn);
    });

    refreshNotificationBadge();
    void refreshCartDot({ force: false });

    // --- Site-wide order update polling (for notifications everywhere) ---
    const ORDER_NOTIFICATIONS_STATUS_KEY = 'alix_order_status_map_v1';
    // "Real-time" feel without websockets: frequent polling while visible.
    const ORDER_POLL_MIN_VISIBLE_MS = 5_000;
    const ORDER_POLL_MIN_HIDDEN_MS = 60_000;
    const ORDER_POLL_MAX_BACKOFF_MS = 120_000;

    const isAdminPage = /(^|\/)(admin-[^/]+\.html)$/i.test(String(window.location.pathname || ''));

    const getAuthToken = () => {
        if (window.AlixAuth?.getToken) {
            try {
                return window.AlixAuth.getToken();
            } catch {
                // ignore
            }
        }
        try {
            return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
        } catch {
            return localStorage.getItem(TOKEN_KEY);
        }
    };

    const getApiBaseUrl = () => {
        if (window.AlixAuth && typeof window.AlixAuth.apiBaseUrl === 'function') {
            try {
                return window.AlixAuth.apiBaseUrl() || '';
            } catch {
                return '';
            }
        }
        const origin = window.location && window.location.origin ? window.location.origin : '';
        return origin && origin !== 'null' ? origin : '';
    };

    const orderPollRequestJson = async (path) => {
        const t = getAuthToken();
        if (!t) throw new Error('Login required');

        const res = await fetch(getApiBaseUrl() + path, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${t}`,
            },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const debugMessage = data && data.details && typeof data.details.message === 'string' ? data.details.message : null;
            const message = debugMessage || (typeof data.error === 'string' ? data.error : 'Request failed');
            throw new Error(message);
        }
        return data;
    };

    const ensureOrderNotificationsLoaded = () => {
        if (window.AlixOrderNotifications) return Promise.resolve(true);

        const existing = document.querySelector('script[data-av-order-notifs="1"]');
        if (existing) {
            return new Promise((resolve) => {
                const done = () => resolve(Boolean(window.AlixOrderNotifications));
                existing.addEventListener('load', done, { once: true });
                existing.addEventListener('error', () => resolve(false), { once: true });
                // In case it already loaded.
                setTimeout(done, 0);
            });
        }

        return new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = '../js/order-notifications.js?v=9';
            s.async = true;
            s.setAttribute('data-av-order-notifs', '1');
            s.addEventListener('load', () => resolve(Boolean(window.AlixOrderNotifications)), { once: true });
            s.addEventListener('error', () => resolve(false), { once: true });
            document.body.appendChild(s);
        });
    };

    const mapDesignProofStatus = (s) => {
        const v = String(s || '').toLowerCase();
        if (v === 'approved') return 'Approved';
        if (v === 'rejected') return 'Revision Requested';
        if (v === 'submitted' || v === 'reviewing') return 'Sent';
        return 'Not Sent';
    };

    const mapOrdersForNotifications = (apiOrders) => {
        const list = Array.isArray(apiOrders) ? apiOrders : [];
        return list.map((row) => {
            const o = row?.order || {};
            const items = Array.isArray(row?.items) ? row.items : [];
            const metaFromApi = (o.meta && typeof o.meta === 'object') ? o.meta : {};

            // Preserve any provided design_proof envelope.
            const designProof = row?.design_proof && typeof row.design_proof === 'object' ? row.design_proof : null;
            const meta = { ...metaFromApi };
            if (designProof) {
                meta.proof = {
                    status: mapDesignProofStatus(designProof.proof_status),
                    mockup_data_url: String(designProof.proof_file_path || ''),
                    revision_note: designProof.revision_note ?? null,
                    version_number: designProof.version_number ?? null,
                };
            }

            return {
                rawId: o?.order_id,
                status: o?.status,
                tracking_number: o?.tracking_number != null ? String(o.tracking_number) : null,
                meta,
                items: items.map((it) => ({
                    id: it?.order_item_id ?? it?.orderItemId ?? null,
                    name: it?.meta?.product_name || `Product #${it?.product_id ?? ''}`,
                    quantity: it?.quantity,
                    design_proof: it?.design_proof && typeof it.design_proof === 'object'
                        ? {
                            status: mapDesignProofStatus(it.design_proof.proof_status),
                            mockup_data_url: String(it.design_proof.proof_file_path || ''),
                            revision_note: it.design_proof.revision_note ?? null,
                            version_number: it.design_proof.version_number ?? null,
                        }
                        : null,
                })),
            };
        });
    };

    const hadOrderNotificationsBaseline = () => {
        try {
            const raw = localStorage.getItem(ORDER_NOTIFICATIONS_STATUS_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
        } catch {
            return false;
        }
    };

    let orderPollInFlight = false;
    let orderPollTimer = null;
    let orderPollBackoffMs = ORDER_POLL_MIN_VISIBLE_MS;

    const scheduleOrderPoll = (delayMs) => {
        if (orderPollTimer) {
            clearTimeout(orderPollTimer);
            orderPollTimer = null;
        }
        const d = Math.max(2_000, Number(delayMs) || 0);
        orderPollTimer = setTimeout(() => {
            void pollOrdersForNotifications();
        }, d);
    };

    const getDesiredPollIntervalMs = () => {
        if (document.visibilityState && document.visibilityState !== 'visible') return ORDER_POLL_MIN_HIDDEN_MS;
        return ORDER_POLL_MIN_VISIBLE_MS;
    };

    const pollOrdersForNotifications = async ({ immediate } = {}) => {
        if (!isLoggedIn) return;
        if (isAdminPage) return;
        if (orderPollInFlight) return;

        const ok = await ensureOrderNotificationsLoaded();
        if (!ok || !window.AlixOrderNotifications?.recordFromOrders) {
            // Try again later.
            scheduleOrderPoll(getDesiredPollIntervalMs());
            return;
        }

        orderPollInFlight = true;
        const baselineExisted = hadOrderNotificationsBaseline();

        try {
            const limit = 200;
            const offset = 0;
            const data = await orderPollRequestJson(`/api/orders?${new URLSearchParams({ limit: String(limit), offset: String(offset) }).toString()}`);
            const apiOrders = Array.isArray(data?.orders) ? data.orders : [];
            const mapped = mapOrdersForNotifications(apiOrders);

            const changes = window.AlixOrderNotifications.recordFromOrders(mapped);

            // Avoid popup spam on the very first baseline run.
            if (baselineExisted && changes.length && window.AlixOrderNotifications.showPopups) {
                await window.AlixOrderNotifications.showPopups(changes);
            }

            orderPollBackoffMs = getDesiredPollIntervalMs();
        } catch {
            // Backoff on failures.
            orderPollBackoffMs = Math.min(ORDER_POLL_MAX_BACKOFF_MS, Math.max(getDesiredPollIntervalMs(), orderPollBackoffMs * 2));
        } finally {
            orderPollInFlight = false;
            if (immediate) {
                scheduleOrderPoll(getDesiredPollIntervalMs());
            } else {
                scheduleOrderPoll(orderPollBackoffMs);
            }
        }
    };

    if (isLoggedIn && !isAdminPage) {
        // Start shortly after page load so DOM is ready.
        scheduleOrderPoll(5_000);

        window.addEventListener('focus', () => {
            void pollOrdersForNotifications({ immediate: true });
        });
    }

    window.addEventListener('alix:order-notifications-updated', () => {
        refreshNotificationBadge();
    });

    window.addEventListener(CART_UPDATED_EVENT, (event) => {
        const hasItems = Boolean(event?.detail?.hasItems);
        setCartDot(hasItems);
    });

    window.addEventListener('load', () => {
        void refreshCartDot({ force: false });
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            refreshNotificationBadge();
            void refreshCartDot({ force: false });
            if (isLoggedIn && !isAdminPage) {
                void pollOrdersForNotifications({ immediate: true });
            }
        }
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
        ];

        if (isLoggedIn) {
            entries.push({ label: "Cart", href: "cart.html", className: "nav-mobile-cart-link" });
            entries.push({ label: "Notifications", href: "notifications.html", className: "nav-mobile-notifications-link" });
            entries.push({ label: "Orders", href: "order-tracking.html", className: "nav-mobile-orders-link" });
            entries.push({ label: "Order History", href: "order-history.html", className: "nav-mobile-order-history-link" });
            entries.push({ label: "Account Settings", href: "account-settings.html", className: "nav-mobile-account-link" });
            entries.push({ label: "Log Out", href: "#", className: "nav-mobile-logout-link" });
        } else {
            entries.push({ label: "Track Order", href: "login.html", className: "nav-mobile-orders-link" });
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


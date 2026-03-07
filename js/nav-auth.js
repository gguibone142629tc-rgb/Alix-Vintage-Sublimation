(function () {
    const LOGIN_KEY = "alix_is_logged_in";
    const LOGIN_AT_KEY = "alix_logged_in_at";
    const LOGIN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

    const loginFlag = localStorage.getItem(LOGIN_KEY) === "true";
    const loginAt = Number(localStorage.getItem(LOGIN_AT_KEY));
    const hasValidTimestamp = Number.isFinite(loginAt) && loginAt > 0;
    const isFreshLogin = hasValidTimestamp && Date.now() - loginAt <= LOGIN_MAX_AGE_MS;
    const isLoggedIn = loginFlag && isFreshLogin;

    // Cleanup stale login flags created before timestamp tracking.
    if (loginFlag && !isFreshLogin) {
        localStorage.removeItem(LOGIN_KEY);
        localStorage.removeItem(LOGIN_AT_KEY);
    }

    const isOrderHistoryPage = /order-history\.html$/i.test(window.location.pathname);
    const loginButtons = document.querySelectorAll(".nav-login-btn-link");
    const accountLinks = document.querySelectorAll(".nav-account-link");
    const orderLinks = document.querySelectorAll(".nav-order-link");

    if (!isLoggedIn && isOrderHistoryPage) {
        window.location.replace("login.html");
        return;
    }

    loginButtons.forEach((button) => {
        button.classList.toggle("is-hidden", isLoggedIn);
    });

    accountLinks.forEach((link) => {
        link.classList.toggle("is-hidden", !isLoggedIn);
    });

    orderLinks.forEach((link) => {
        link.classList.toggle("is-hidden", !isLoggedIn);
    });
})();

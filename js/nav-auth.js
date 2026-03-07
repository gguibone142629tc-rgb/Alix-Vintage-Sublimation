(function () {
    const LOGIN_KEY = "alix_is_logged_in";

    const isLoggedIn = localStorage.getItem(LOGIN_KEY) === "true";
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

(() => {
  const menuHtml = `
<details class="profile-menu">
  <summary aria-label="Account"><i class="fa-solid fa-user" aria-hidden="true"></i></summary>
  <div class="profile-dropdown">
    <a href="/signin">Sign In</a>
    <a href="/create-account">Create Account</a>
  </div>
</details>`;

  const containers = document.querySelectorAll(".nav-items, .nav-links, .mobile-fixed-nav");
  containers.forEach((container) => {
    if (container.querySelector(".profile-menu")) return;
    container.insertAdjacentHTML("beforeend", menuHtml);
  });
})();

(() => {
  function getDirectChildByClass(parent, className) {
    return Array.from(parent.children).find((node) => node.classList && node.classList.contains(className)) || null;
  }

  function normalizeFooter(footerInner) {
    if (!footerInner || footerInner.querySelector(":scope > .footer-left-cluster")) return;

    const footerLeft = getDirectChildByClass(footerInner, "footer-left");
    const footerNav = getDirectChildByClass(footerInner, "footer-nav");
    const footerSocial = getDirectChildByClass(footerInner, "footer-social");
    if (!footerLeft || !footerNav || !footerSocial) return;

    const brand = footerLeft.querySelector(".footer-brand");
    const created = footerLeft.querySelector(".footer-created");
    const updated = footerLeft.querySelector(".footer-updated");
    if (!brand) return;

    const leftCluster = document.createElement("div");
    leftCluster.className = "footer-left-cluster";

    const brandStack = document.createElement("div");
    brandStack.className = "footer-brand-stack";

    const brandWrap = document.createElement("div");
    brandWrap.className = "footer-brand-wrap";
    brandWrap.appendChild(brand);

    const meta = document.createElement("div");
    meta.className = "footer-meta";
    if (created) meta.appendChild(created);
    if (updated) meta.appendChild(updated);

    brandStack.appendChild(brandWrap);
    if (meta.childNodes.length) {
      brandStack.appendChild(meta);
    }

    leftCluster.appendChild(brandStack);
    leftCluster.appendChild(footerNav);

    footerInner.insertBefore(leftCluster, footerLeft);
    footerLeft.remove();
  }

  function initSharedFooter() {
    document.querySelectorAll(".footer .footer-inner").forEach(normalizeFooter);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSharedFooter, { once: true });
  } else {
    initSharedFooter();
  }
})();

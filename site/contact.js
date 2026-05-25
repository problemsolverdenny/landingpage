(function () {
  var email = "problemsolver.denny@gmail.com";
  var subject = encodeURIComponent("MVP 상담 문의");
  var mailto = "mailto:" + email + "?subject=" + subject;

  function wireContact() {
    document.querySelectorAll("button").forEach(function (button) {
      if (button.textContent && button.textContent.trim() === "무료 상담 신청") {
        button.type = "button";
        button.addEventListener("click", function () {
          window.location.href = mailto;
        });
      }
    });

    document.querySelectorAll("h4").forEach(function (heading) {
      if (heading.textContent && heading.textContent.trim() === "Contact") {
        var container = heading.parentElement;
        if (!container || container.querySelector("a[href^='mailto:']")) {
          return;
        }
        var paragraph = container.querySelector("p");
        if (paragraph) {
          paragraph.innerHTML =
            '<a class="hover:text-white transition" href="' +
            mailto +
            '">' +
            email +
            "</a>";
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireContact);
  } else {
    wireContact();
  }

  new MutationObserver(wireContact).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();

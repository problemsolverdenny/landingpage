(function () {
  var email = "problemsolver.denny@gmail.com";
  var subject = encodeURIComponent("MVP 상담 문의");
  var mailto = "mailto:" + email + "?subject=" + subject;
  var socials = {
    Threads:
      "https://www.threads.com/@problemsolver.denny?xmt=AQG0nR5di3T7JoXkP-jaf3IgF4a-LrkJos9PYoSuLVbKv1Y",
    Instagram: "https://www.instagram.com/problemsolver.denny/",
    Twitter: "https://x.com/solverdenny",
  };

  function setExternalLink(link, href) {
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  function wireContact() {
    document.querySelectorAll("button").forEach(function (button) {
      if (button.textContent && button.textContent.trim() === "무료 상담 신청") {
        button.type = "button";
        button.addEventListener("click", function () {
          window.location.href = mailto;
        });
      }

      if (button.textContent && button.textContent.trim() === "SNS에서 팔로우") {
        button.type = "button";
        button.addEventListener("click", function () {
          window.open(socials.Threads, "_blank", "noopener,noreferrer");
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

    document.querySelectorAll("h4").forEach(function (heading) {
      if (heading.textContent && heading.textContent.trim() === "Follow") {
        var container = heading.parentElement;
        if (!container || container.querySelector("[data-socials-added='true']")) {
          return;
        }

        var list = container.querySelector("ul");
        if (!list) {
          return;
        }

        list.innerHTML = "";
        Object.keys(socials).forEach(function (name) {
          var item = document.createElement("li");
          var link = document.createElement("a");
          link.className = "hover:text-white transition";
          link.textContent = name;
          setExternalLink(link, socials[name]);
          item.appendChild(link);
          list.appendChild(item);
        });
        list.setAttribute("data-socials-added", "true");
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

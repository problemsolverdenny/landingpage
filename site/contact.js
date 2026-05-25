(function () {
  var email = "problemsolver.denny@gmail.com";
  var bookingUrl = "https://whattime.co.kr/problemsolver-denny";
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

  function buttonLabel(button) {
    return button.textContent ? button.textContent.trim() : "";
  }

  function openExternal(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function scrollToHeading(text) {
    var target = null;
    document.querySelectorAll("h2").forEach(function (heading) {
      if (!target && heading.textContent && heading.textContent.trim() === text) {
        target = heading.closest("section") || heading;
      }
    });

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function wireContact() {
    document.querySelectorAll("button").forEach(function (button) {
      var label = buttonLabel(button);
      if (
        label === "무료 상담 신청" ||
        label === "컨설팅 받기" ||
        label === "Contact" ||
        label === "내 이야기 보기"
      ) {
        button.type = "button";
      }

      if (label === "SNS에서 팔로우") {
        button.type = "button";
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

    document.querySelectorAll("footer .border-t p").forEach(function (paragraph) {
      if (paragraph.querySelector("a[href='/privacy.html']")) {
        return;
      }
      paragraph.insertAdjacentHTML(
        "beforeend",
        ' · <a class="hover:text-white transition" href="/privacy.html">Privacy Policy</a>',
      );
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

  document.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) {
      return;
    }

    var label = buttonLabel(button);
    if (
      label === "무료 상담 신청" ||
      label === "컨설팅 받기" ||
      label === "Contact"
    ) {
      event.preventDefault();
      openExternal(bookingUrl);
      return;
    }

    if (label === "내 이야기 보기") {
      event.preventDefault();
      scrollToHeading("Denny에 대해");
      return;
    }

    if (label === "SNS에서 팔로우") {
      event.preventDefault();
      openExternal(socials.Threads);
    }
  });

  new MutationObserver(wireContact).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();

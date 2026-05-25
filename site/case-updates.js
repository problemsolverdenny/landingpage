(function () {
  const reviewId = "physical-therapy-review";
  const caseId = "physical-therapy-case";
  let attempts = 0;

  function findSectionByHeading(text) {
    return Array.from(document.querySelectorAll("section")).find((section) => {
      const heading = section.querySelector("h2");
      return heading && heading.textContent.trim() === text;
    });
  }

  function createStars() {
    const stars = document.createElement("div");
    stars.className = "flex mb-3";

    for (let index = 0; index < 5; index += 1) {
      const star = document.createElement("span");
      star.className = "text-orange-500";
      star.textContent = "★";
      stars.appendChild(star);
    }

    return stars;
  }

  function addCustomerReview() {
    if (document.getElementById(reviewId)) return true;

    const section = findSectionByHeading("고객 리뷰");
    const grid = section && section.querySelector(".grid");
    if (!grid) return false;

    grid.className = grid.className.replace("md:grid-cols-2", "md:grid-cols-3");

    const card = document.createElement("div");
    card.id = reviewId;
    card.className =
      "p-6 border-0 shadow-sm hover:shadow-md transition-shadow rounded-lg bg-white";

    const header = document.createElement("div");
    header.className = "flex items-center mb-4";

    const avatar = document.createElement("div");
    avatar.className =
      "w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg";
    avatar.textContent = "고";

    const meta = document.createElement("div");
    meta.className = "ml-4";

    const name = document.createElement("p");
    name.className = "font-semibold text-gray-900";
    name.textContent = "고객 C";

    const project = document.createElement("p");
    project.className = "text-sm text-gray-600";
    project.textContent = "물리치료 데이터 플랫폼";

    const quote = document.createElement("p");
    quote.className = "text-gray-700";
    quote.textContent =
      '"환자의 생체 리듬 데이터를 물리치료사가 맥락적으로 이해할 수 있는 보고서로 정리하고, 올바른 치료법 추천까지 연결하는 플랫폼을 함께 만들고 있습니다. 박사 논문 연구의 핵심 도구로 활용하고 있어요."';

    meta.append(name, project);
    header.append(avatar, meta);
    card.append(header, createStars(), quote);
    grid.appendChild(card);

    return true;
  }

  function addCaseStudy() {
    if (document.getElementById(caseId)) return true;

    const section = document.getElementById("cases") || findSectionByHeading("실제 사례");
    const grid = section && section.querySelector(".grid");
    if (!grid) return false;

    grid.className = grid.className.replace(
      "md:grid-cols-2",
      "md:grid-cols-2 lg:grid-cols-3"
    );

    const card = document.createElement("div");
    card.id = caseId;
    card.className =
      "overflow-hidden hover:shadow-lg transition-shadow border-0 rounded-lg bg-white";

    card.innerHTML = [
      '<div class="p-8">',
      '  <div class="mb-6 flex justify-center">',
      '    <img src="/assets/case-study-2-icon.webp" alt="Physical therapy data platform" class="w-32 h-32">',
      "  </div>",
      '  <h3 class="text-2xl font-bold text-gray-900 mb-4">물리치료 데이터 플랫폼</h3>',
      '  <div class="space-y-4 mb-6">',
      "    <div>",
      '      <p class="text-sm text-gray-600 font-medium mb-1">문제</p>',
      '      <p class="text-gray-700">물리치료 환자의 생체 리듬 데이터가 많아도 치료 맥락으로 해석하기 어려움</p>',
      "    </div>",
      "    <div>",
      '      <p class="text-sm text-gray-600 font-medium mb-1">해결</p>',
      '      <p class="text-gray-700">환자 상태를 맥락적으로 설명하는 보고서와 치료법 추천 흐름을 설계</p>',
      "    </div>",
      "    <div>",
      '      <p class="text-sm text-gray-600 font-medium mb-1">결과</p>',
      '      <p class="text-gray-700 font-semibold text-orange-600">✓ 박사 논문 연구에 활용되는 플랫폼 구축</p>',
      "    </div>",
      "  </div>",
      '  <div class="bg-blue-50 rounded-lg p-4 text-center">',
      '    <p class="text-3xl font-bold text-blue-700">PhD</p>',
      '    <p class="text-sm text-gray-600">연구 플랫폼</p>',
      "  </div>",
      "</div>",
    ].join("");

    grid.appendChild(card);

    return true;
  }

  function applyUpdates() {
    attempts += 1;
    const reviewAdded = addCustomerReview();
    const caseAdded = addCaseStudy();

    if ((!reviewAdded || !caseAdded) && attempts < 30) {
      window.setTimeout(applyUpdates, 100);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyUpdates);
  } else {
    applyUpdates();
  }
})();

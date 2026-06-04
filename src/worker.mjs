const CONTACT_EMAIL = "problemsolver.denny@gmail.com";

const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = normalize_pathname(url.pathname);

    if (pathname === "/privacy") {
      return serve_privacy_page(request, env);
    }

    if (pathname === "/data-deletion") {
      return data_deletion_response(request);
    }

    if (pathname === "/auth/threads/callback") {
      return threads_callback_response(url);
    }

    return env.ASSETS.fetch(request);
  },
};

function normalize_pathname(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

async function serve_privacy_page(request, env) {
  const privacy_url = new URL(request.url);
  privacy_url.pathname = "/privacy.html";

  const response = await env.ASSETS.fetch(new Request(privacy_url, request));
  return add_security_headers(response);
}

function data_deletion_response(request) {
  if (request.method === "POST") {
    const url = new URL(request.url);

    return json_response({
      url: `${url.origin}/data-deletion`,
      confirmation_code: "problemsolverdenny-data-deletion-request-received",
    });
  }

  return html_response(
    "데이터 삭제 안내",
    `
      <h1>데이터 삭제 안내</h1>
      <p>
        Problem Solver, Denny는 Threads 연동 과정에서 게시 권한 확인에 필요한 최소 정보만
        사용하며, 별도 회원 계정이나 사용자 데이터베이스를 운영하지 않습니다.
      </p>
      <p>
        데이터 삭제를 요청하려면 아래 이메일로 요청 내용을 보내주세요. 확인 후 보관 중인
        관련 정보를 삭제하고 처리 결과를 회신합니다.
      </p>
      <p><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
      <p><a href="/">홈으로 돌아가기</a></p>
    `,
  );
}

function threads_callback_response(url) {
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return html_response(
      "Threads 인증 실패",
      `
        <h1>Threads 인증 실패</h1>
        <p>Meta OAuth 인증이 완료되지 않았습니다.</p>
        <dl>
          <dt>error</dt>
          <dd>${escape_html(error)}</dd>
          <dt>description</dt>
          <dd>${escape_html(error_description || "제공되지 않음")}</dd>
        </dl>
        <p><a href="/">홈으로 돌아가기</a></p>
      `,
      400,
    );
  }

  return html_response(
    "Threads 인증 콜백",
    `
      <h1>Threads 인증 콜백</h1>
      <p>Threads OAuth 리다이렉트 URL이 정상적으로 응답했습니다.</p>
      ${
        code
          ? `
            <dl>
              <dt>code</dt>
              <dd><code>${escape_html(code)}</code></dd>
              <dt>state</dt>
              <dd>${escape_html(state || "제공되지 않음")}</dd>
            </dl>
          `
          : "<p>전달된 인증 코드가 없습니다.</p>"
      }
      <p><a href="/">홈으로 돌아가기</a></p>
    `,
  );
}

function html_response(title, body, status = 200) {
  return new Response(
    `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escape_html(title)} - Problem Solver, Denny</title>
    <style>
      :root {
        color: #1f2937;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.7;
      }
      body {
        margin: 0;
        background: #f8fafc;
      }
      main {
        max-width: 760px;
        margin: 0 auto;
        padding: 56px 20px 80px;
      }
      article {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 36px;
      }
      h1 {
        margin: 0 0 16px;
        color: #111827;
        font-size: 2rem;
        line-height: 1.2;
      }
      a {
        color: #2563eb;
        font-weight: 700;
      }
      dt {
        margin-top: 16px;
        color: #374151;
        font-weight: 700;
      }
      dd {
        margin: 4px 0 0;
        overflow-wrap: anywhere;
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
    </style>
  </head>
  <body>
    <main>
      <article>${body}</article>
    </main>
  </body>
</html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        ...SECURITY_HEADERS,
      },
    },
  );
}

function json_response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...SECURITY_HEADERS,
    },
  });
}

function add_security_headers(response) {
  const next_response = new Response(response.body, response);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    next_response.headers.set(name, value);
  }

  return next_response;
}

function escape_html(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

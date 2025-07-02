var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-v4NyC9/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// worker/index.ts
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      if (path.startsWith("/api/chat")) {
        return handleChat(request, env, corsHeaders);
      }
      if (path.startsWith("/api/teams")) {
        return handleTeams(request, env, corsHeaders);
      }
      if (path === "/api/health") {
        return new Response(JSON.stringify({
          status: "ok",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          environment: "production"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (path === "/favicon.ico") {
        return new Response(null, { status: 204 });
      }
      if (path === "/") {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blawby AI Chatbot API</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        .endpoint { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb; }
        .method { font-weight: bold; color: #059669; }
        .url { font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
        .description { color: #6b7280; margin-top: 5px; }
        .example { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 8px; margin: 10px 0; font-family: monospace; font-size: 14px; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status.ok { background: #dcfce7; color: #166534; }
        .status.error { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <h1>\u{1F916} Blawby AI Chatbot API</h1>
    <p>Welcome to the Blawby AI Chatbot API. This service provides AI-powered legal assistance through Cloudflare Workers AI.</p>
    
    <h2>\u{1F4CB} Available Endpoints</h2>
    
    <div class="endpoint">
        <div class="method">GET</div>
        <div class="url">/api/health</div>
        <div class="description">Health check endpoint to verify API status</div>
        <div class="example">
curl -X GET "https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/health"
        </div>
    </div>

    <div class="endpoint">
        <div class="method">GET</div>
        <div class="url">/api/teams</div>
        <div class="description">Retrieve available law firm teams and their configurations</div>
        <div class="example">
curl -X GET "https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams"
        </div>
    </div>

    <div class="endpoint">
        <div class="method">POST</div>
        <div class="url">/api/chat</div>
        <div class="description">Send messages to the AI legal assistant and receive responses</div>
        <div class="example">
curl -X POST "https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/chat" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, I need help with a legal question about contracts."}
    ],
    "teamId": "test-team",
    "sessionId": "optional-session-id"
  }'
        </div>
    </div>

    <h2>\u{1F527} API Status</h2>
    <div class="status ok">\u2705 API is operational</div>
    <div class="status ok">\u2705 AI Model: Llama 3.1 8B</div>
    <div class="status ok">\u2705 Database: D1 (blawby-ai-chatbot)</div>
    <div class="status ok">\u2705 KV Storage: Chat Sessions</div>

    <h2>\u{1F4DA} Documentation</h2>
    <p>This API is designed to integrate with the Blawby AI legal assistant frontend. For more information about the project, see the <a href="https://github.com/your-repo/preact-chat-gpt-interface" target="_blank">GitHub repository</a>.</p>

    <h2>\u{1F517} Integration</h2>
    <p>To integrate with your frontend application, use the endpoints above with proper CORS headers. The API supports cross-origin requests and returns JSON responses.</p>

    <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
        <p>Blawby AI Chatbot API \u2022 Powered by Cloudflare Workers AI</p>
    </footer>
</body>
</html>`;
        return new Response(html, {
          headers: { "Content-Type": "text/html;charset=UTF-8" }
        });
      }
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
async function handleChat(request, env, corsHeaders) {
  if (request.method === "POST") {
    try {
      const body = await request.json();
      if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
        return new Response(JSON.stringify({
          error: "Invalid request: messages array is required and must not be empty"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      for (const message of body.messages) {
        if (!message.role || !message.content) {
          return new Response(JSON.stringify({
            error: "Invalid message format: each message must have role and content"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      let teamConfig = null;
      if (body.teamId) {
        const mockTeams = [
          { id: "test-team", name: "Test Law Firm", config: { consultationFee: 150, requiresPayment: true } },
          { id: "family-law-team", name: "Family Law Specialists", config: { consultationFee: 200, requiresPayment: true } },
          { id: "criminal-defense-team", name: "Criminal Defense Attorneys", config: { consultationFee: 300, requiresPayment: true } },
          { id: "demo", name: "Demo Law Firm", config: { consultationFee: 0, requiresPayment: false } }
        ];
        teamConfig = mockTeams.find((team) => team.id === body.teamId);
      }
      const systemPrompt = teamConfig ? `You are a helpful legal assistant for ${teamConfig.name}. Provide clear, professional, and accurate legal information. Always remind users that you are an AI assistant and recommend consulting with a qualified attorney for specific legal advice.${teamConfig.config.requiresPayment ? ` Consultation fee: $${teamConfig.config.consultationFee}.` : " Free consultation available."}` : "You are a helpful legal assistant for Blawby AI. Provide clear, professional, and accurate legal information. Always remind users that you are an AI assistant and recommend consulting with a qualified attorney for specific legal advice.";
      const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          ...body.messages
        ],
        stream: false
      });
      return new Response(JSON.stringify({
        response: response.response,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        sessionId: body.sessionId || null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("AI Error:", error);
      return new Response(JSON.stringify({
        error: "AI service temporarily unavailable",
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
__name(handleChat, "handleChat");
async function handleTeams(request, env, corsHeaders) {
  if (request.method === "GET") {
    try {
      const teams = [
        {
          id: "test-team",
          name: "Test Law Firm",
          config: {
            aiModel: "llama",
            consultationFee: 150,
            requiresPayment: true,
            availableServices: ["family-law", "criminal-defense", "civil-litigation"]
          }
        },
        {
          id: "family-law-team",
          name: "Family Law Specialists",
          config: {
            aiModel: "llama",
            consultationFee: 200,
            requiresPayment: true,
            availableServices: ["divorce", "child-custody", "adoption", "prenuptial-agreements"]
          }
        },
        {
          id: "criminal-defense-team",
          name: "Criminal Defense Attorneys",
          config: {
            aiModel: "llama",
            consultationFee: 300,
            requiresPayment: true,
            availableServices: ["dui-defense", "drug-charges", "assault", "white-collar-crime"]
          }
        },
        {
          id: "demo",
          name: "Demo Law Firm",
          config: {
            aiModel: "llama",
            consultationFee: 0,
            requiresPayment: false,
            availableServices: ["general-consultation", "legal-advice"]
          }
        }
      ];
      return new Response(JSON.stringify(teams), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Teams Error:", error);
      return new Response(JSON.stringify({
        error: "Failed to fetch teams",
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
__name(handleTeams, "handleTeams");

// ../../../.nvm/versions/node/v20.19.2/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../.nvm/versions/node/v20.19.2/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-v4NyC9/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../.nvm/versions/node/v20.19.2/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-v4NyC9/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map

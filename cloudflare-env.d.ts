declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    WORKBENCH_SECRET_KEY?: string;
    WORKBENCH_ADMIN_EMAIL?: string;
    PLATFORM_SESSION_SERVICE_URL?: string;
    PLATFORM_SESSION_SERVICE_KEY?: string;
  }
}

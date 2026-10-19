import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page is dynamic and per-user, so no incremental cache is needed.
export default defineCloudflareConfig();

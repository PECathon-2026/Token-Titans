import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

describe("optional accounts", () => {
  it("lets guests read without signing in", () => {
    for (const path of ["/timeline", "/subscriptions", "/feed/example", "/read/example", "/discover"]) {
      const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
      const matches = router.matchRoutes(path);
      expect(matches.length).toBeGreaterThan(1);
      expect(matches.every((match) => !match.routeId.includes("_authenticated"))).toBe(true);
      for (const match of matches) {
        const route = router.routesById[match.routeId];
        expect(route?.options.beforeLoad).toBeUndefined();
      }
    }
  });
});
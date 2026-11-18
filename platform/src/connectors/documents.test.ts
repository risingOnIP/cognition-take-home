import { describe, expect, it, vi } from "vitest";
import { createMockDocumentStore, createSharePointDocumentStore } from "./documents";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("SharePoint document store", () => {
  it("gets an Entra token once and lists a folder via Graph", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
      const u = String(url);
      if (u.startsWith("https://login.microsoftonline.com/t1/")) return json({ access_token: "tok", expires_in: 3600 });
      return json({ value: [{ id: "1", name: "receipt.pdf", size: 10, lastModifiedDateTime: "2026-01-01T00:00:00Z", webUrl: "https://sp/receipt.pdf" }] });
    });
    const store = createSharePointDocumentStore({ tenantId: "t1", clientId: "c", clientSecret: "s", siteId: "site", fetch: fetchMock as typeof fetch });
    expect(await store.list("refunds/RF 1")).toEqual([{ id: "1", name: "receipt.pdf", sizeBytes: 10, modifiedAt: "2026-01-01T00:00:00Z", webUrl: "https://sp/receipt.pdf" }]);
    await store.list("refunds/RF 1");
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.filter((u) => u.includes("oauth2"))).toHaveLength(1);
    expect(urls[1]).toBe("https://graph.microsoft.com/v1.0/sites/site/drive/root:/refunds/RF%201:/children?$select=id,name,size,lastModifiedDateTime,webUrl");
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ authorization: "Bearer tok" });
  });

  it("treats a missing folder as empty", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => (String(url).includes("oauth2") ? json({ access_token: "tok", expires_in: 3600 }) : json({}, 404)));
    const store = createSharePointDocumentStore({ tenantId: "t", clientId: "c", clientSecret: "s", siteId: "site", fetch: fetchMock as typeof fetch });
    expect(await store.list("nope")).toEqual([]);
  });
});

describe("mock document store", () => {
  it("seeds per folder and accepts uploads", async () => {
    const store = createMockDocumentStore({ seed: (f) => (f === "a" ? [{ name: "x.pdf", sizeBytes: 1, modifiedAt: "t" }] : []) });
    expect((await store.list("a")).map((d) => d.name)).toEqual(["x.pdf"]);
    await store.upload("a", "y.pdf", new Uint8Array(3));
    expect((await store.list("a")).map((d) => d.name)).toEqual(["x.pdf", "y.pdf"]);
    expect(await store.list("b")).toEqual([]);
  });
});

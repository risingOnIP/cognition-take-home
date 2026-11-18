/**
 * Document storage connector (the Power Apps SharePoint connector equivalent).
 * Apps depend on `DocumentStore`; web/src/platform.ts picks SharePoint (Microsoft Graph) or the mock.
 */
export interface DocumentInfo {
  id: string;
  name: string;
  sizeBytes: number;
  modifiedAt: string;
  webUrl: string;
}

export interface DocumentStore {
  readonly name: string;
  list(folder: string): Promise<DocumentInfo[]>;
  upload(folder: string, fileName: string, content: Uint8Array, contentType?: string): Promise<DocumentInfo>;
}

export interface SharePointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /** Graph site id, e.g. "contoso.sharepoint.com,<guid>,<guid>". */
  siteId: string;
  /** Document library (drive) id; defaults to the site's default library. */
  driveId?: string;
  fetch?: typeof fetch;
}

interface GraphDriveItem {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  webUrl: string;
}

const toInfo = (i: GraphDriveItem): DocumentInfo => ({ id: i.id, name: i.name, sizeBytes: i.size, modifiedAt: i.lastModifiedDateTime, webUrl: i.webUrl });
const encodePath = (p: string) => p.split("/").filter(Boolean).map(encodeURIComponent).join("/");

/** SharePoint document library via Microsoft Graph, using an Entra app registration (client credentials). */
export function createSharePointDocumentStore(cfg: SharePointConfig): DocumentStore {
  const http = cfg.fetch ?? fetch;
  const drive = `https://graph.microsoft.com/v1.0/sites/${cfg.siteId}/${cfg.driveId ? `drives/${cfg.driveId}` : "drive"}`;
  let token: { value: string; expiresAt: number } | null = null;

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt > Date.now() + 60_000) return token.value;
    const res = await http(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
    });
    if (!res.ok) throw new Error(`Entra token request failed: ${res.status}`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
    return token.value;
  }

  async function graph(url: string, init: RequestInit = {}) {
    const res = await http(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${await accessToken()}` } });
    return res;
  }

  return {
    name: "sharepoint",
    async list(folder) {
      const res = await graph(`${drive}/root:/${encodePath(folder)}:/children?$select=id,name,size,lastModifiedDateTime,webUrl`);
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`SharePoint list failed: ${res.status}`);
      return ((await res.json()) as { value: GraphDriveItem[] }).value.map(toInfo);
    },
    async upload(folder, fileName, content, contentType = "application/octet-stream") {
      const res = await graph(`${drive}/root:/${encodePath(`${folder}/${fileName}`)}:/content`, { method: "PUT", headers: { "content-type": contentType }, body: new Blob([new Uint8Array(content)]) });
      if (!res.ok) throw new Error(`SharePoint upload failed: ${res.status}`);
      return toInfo((await res.json()) as GraphDriveItem);
    },
  };
}

/** In-memory store for local dev and tests. `seed(folder)` supplies initial documents per folder. */
export function createMockDocumentStore(opts: { seed?: (folder: string) => Omit<DocumentInfo, "id" | "webUrl">[] } = {}): DocumentStore {
  const folders = new Map<string, DocumentInfo[]>();
  const get = (folder: string) => {
    if (!folders.has(folder)) {
      folders.set(folder, (opts.seed?.(folder) ?? []).map((d) => ({ ...d, id: `${folder}/${d.name}`, webUrl: "#" })));
    }
    return folders.get(folder)!;
  };
  return {
    name: "mock-documents",
    async list(folder) {
      return [...get(folder)];
    },
    async upload(folder, fileName, content) {
      const doc: DocumentInfo = { id: `${folder}/${fileName}`, name: fileName, sizeBytes: content.byteLength, modifiedAt: new Date().toISOString(), webUrl: "#" };
      folders.set(folder, [...get(folder).filter((d) => d.name !== fileName), doc]);
      return doc;
    },
  };
}

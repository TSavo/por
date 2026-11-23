/**
 * The resource layer in a page served by the game's local server (#225): reads by the server's URLs
 * (src/resources/urls.ts). Saves and settings are the page's own: in memory here; IndexedDB in #227.
 */
import type { ResourceData, ResourceId, ResourceProvider } from "../../src/resources/provider.js";
import { serverUrl } from "../../src/resources/urls.js";

export class HttpResources implements ResourceProvider {
  protected readonly local = new Map<ResourceId, Uint8Array>();
  constructor(protected readonly base = "") {}
  getUrl(id: ResourceId): string | undefined {
    const url = serverUrl(id);
    return url && this.base + url;
  }
  async getBytes(id: ResourceId): Promise<Uint8Array | undefined> {
    if (this.isLocal(id)) return this.local.get(id);
    const url = this.getUrl(id);
    if (!url) return;
    const response = await fetch(url);
    if (!response.ok) return;
    return new Uint8Array(await response.arrayBuffer());
  }
  async getText(id: ResourceId) {
    const bytes = await this.getBytes(id);
    return bytes && new TextDecoder().decode(bytes);
  }
  async getJson<T = unknown>(id: ResourceId) {
    const text = await this.getText(id);
    return text === undefined ? undefined : JSON.parse(text) as T;
  }
  async list(prefix: string): Promise<ResourceId[]> {
    return [...this.local.keys()].filter((id) => id.startsWith(prefix)).sort();
  }
  async put(id: ResourceId, data: ResourceData) {
    if (!this.isLocal(id)) throw new Error(`${id} cannot be written`);
    this.local.set(id, typeof data === "string" ? new TextEncoder().encode(data) : data);
  }
  async remove(id: ResourceId) { this.local.delete(id); }
  protected isLocal(id: ResourceId) {
    return id.startsWith("save:") || id.startsWith("setting:") || id.startsWith("journal:");
  }
}

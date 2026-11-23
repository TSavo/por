/**
 * The player's own records in the browser (#227): saves (`save:A`–`save:J`, `save:roster`), the
 * original-files setting and the journal profile, in IndexedDB, in the same shape as the files the
 * Node game writes (tools/save-slots.ts). Everything else is read from the server, as HttpResources.
 *
 * The engine keeps its records in memory and never waits for a write: its worker posts each change
 * (tools/web/engine-worker.ts) and the page stores it here.
 */
import type { ResourceData, ResourceId } from "../../src/resources/provider.js";
import { HttpResources } from "./http-provider.js";

const open = (name: string) => new Promise<IDBDatabase>((done, failed) => {
  const request = indexedDB.open(name, 1);
  request.onupgradeneeded = () => request.result.createObjectStore("records");
  request.onsuccess = () => done(request.result);
  request.onerror = () => failed(request.error);
});
const finished = (transaction: IDBTransaction) => new Promise<void>((done, failed) => {
  transaction.oncomplete = () => done();
  transaction.onerror = transaction.onabort = () => failed(transaction.error);
});

export class IdbResources extends HttpResources {
  private constructor(private readonly db: IDBDatabase, base: string) { super(base); }

  /** Open the records and read them all: a few saves of some hundred kilobytes at most. */
  static async open(base = "", name = "por-resources"): Promise<IdbResources> {
    const resources = new IdbResources(await open(name), base);
    const transaction = resources.db.transaction("records", "readonly");
    const store = transaction.objectStore("records");
    const keys = await new Promise<IDBValidKey[]>((done, failed) => {
      const request = store.getAllKeys();
      request.onsuccess = () => done(request.result);
      request.onerror = () => failed(request.error);
    });
    const values = await new Promise<Uint8Array[]>((done, failed) => {
      const request = store.getAll();
      request.onsuccess = () => done(request.result as Uint8Array[]);
      request.onerror = () => failed(request.error);
    });
    keys.forEach((key, at) => resources.local.set(String(key), values[at]!));
    return resources;
  }

  override async put(id: ResourceId, data: ResourceData) {
    await super.put(id, data);
    const transaction = this.db.transaction("records", "readwrite");
    transaction.objectStore("records").put(this.local.get(id)!, id);
    await finished(transaction);
  }

  override async remove(id: ResourceId) {
    await super.remove(id);
    const transaction = this.db.transaction("records", "readwrite");
    transaction.objectStore("records").delete(id);
    await finished(transaction);
  }

  /** Copy a legacy save folder in one transaction and keep every occupied record. */
  async importMissingSaves(records: ReadonlyMap<ResourceId, Uint8Array>) {
    const transaction = this.db.transaction("records", "readwrite", { durability: "strict" });
    const store = transaction.objectStore("records");
    const imported = new Map<ResourceId, Uint8Array>();
    const kept: ResourceId[] = [];
    for (const [id, bytes] of records) {
      const lookup = store.getKey(id);
      lookup.onsuccess = () => {
        if (lookup.result === undefined) {
          store.add(bytes, id);
          imported.set(id, bytes);
        } else kept.push(id);
      };
    }
    await finished(transaction);
    for (const [id, bytes] of imported) this.local.set(id, bytes);
    return { imported: [...imported.keys()], kept };
  }

  /** The records the engine reads at its start: the saves and the roster. */
  residentRecords(): [ResourceId, Uint8Array][] {
    return [...this.local].filter(([id]) => id.startsWith("save:"));
  }
}

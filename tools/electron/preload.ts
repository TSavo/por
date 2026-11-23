/**
 * The Electron preload (#108): the page asks the main process for the player's original files,
 * picked from File > Use Original Files… or restored from original-files.json.
 */
import { contextBridge, ipcRenderer } from "electron";

export type HostOriginalFiles = {
  folder: string;
  release: "1.3" | "first";
  files: { name: string; data: Uint8Array }[];
};

contextBridge.exposeInMainWorld("porElectron", {
  getOriginalFiles: (): Promise<HostOriginalFiles | null> => ipcRenderer.invoke("original-files:get"),
  onOriginalFiles: (callback: (payload: HostOriginalFiles) => void) => {
    ipcRenderer.on("original-files:used", (_event, payload: HostOriginalFiles) => callback(payload));
  },
});

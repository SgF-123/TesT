const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("setupAPI", {
  getInfo: () => ipcRenderer.invoke("tesT:setup-info"),
  chooseFolder: () => ipcRenderer.invoke("tesT:setup-choose"),
  confirm: (dataDir) =>
    ipcRenderer.invoke("tesT:setup-confirm", { dataDir }),
});

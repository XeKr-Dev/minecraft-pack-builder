import type {ConfigJson, ModuleConfigJson, SetConfigJson} from "@/scripts/type";
import JSZip from "jszip";
import {GithubAPI} from "@/scripts/github";
import {b64tou, imageMagnify, Proxy} from "@/scripts/util";
import {Message} from "@/scripts/message";
import {Builder} from "@/scripts/builder";
import {saveAs} from "file-saver";
import {BASE_64_PNG_PREFIX} from "@/scripts/constants";

export class Project {
    public readonly repo: string
    public icon: string = ""
    public readme: string = ""
    public config?: ConfigJson
    public modules: Map<string, ModuleConfigJson> = new Map()
    public sets: Map<string, SetConfigJson> = new Map()
    public type: "all" | "resource" | "data" = "all"
    public cacheZip?: JSZip

    public constructor(repo: string) {
        this.repo = repo;
    }

    public moduleKeys() {
        return Array.from(this.modules.keys()).sort((a, b) => a.localeCompare(b))
    }

    public resetStatus() {
        this.readme = ""
        this.config = undefined
        this.modules = new Map()
        this.sets = new Map()
        this.type = "all"
        this.icon = ""
        this.cacheZip = undefined
    }

    public loadRepo(): Promise<void> {
        const self = this;
        return new Promise((resolve, reject) => {
            try {
                const promises: Promise<any>[] = []
                GithubAPI.getRepoContents(self.repo, "config.json", Proxy.useProxy.value).then(configData => {
                    self.config = JSON.parse(b64tou(configData.content)) as ConfigJson
                    // if (self.config.suggested_version) self.selectedMinecraft = self.config.suggested_version
                    if (self.config.type) self.type = self.config.type
                    if (self.config.icon) {
                        GithubAPI.getRepoContents(self.repo, self.config.icon, Proxy.useProxy.value).then(iconData => {
                            imageMagnify(`${BASE_64_PNG_PREFIX}${iconData.content}`).then(b64 => {
                                self.icon = b64
                            })
                        })
                    }
                    promises.push(self.loadModules())
                    promises.push(self.loadSets())
                    Promise.all(promises).then(() => {
                        resolve()
                    })
                }).catch(e => {
                    Message.error("无法加载配置文件")
                    console.error(e)
                    self.resetStatus()
                    reject(e)
                })
                GithubAPI.getRepoReadme(self.repo, Proxy.useProxy.value).then(readmeData => {
                    self.readme = b64tou(readmeData.content)
                }).catch(e => {
                    Message.error("无法加载 README.md")
                    console.error(e)
                    self.resetStatus()
                    reject(e)
                })
            } catch (e: any) {
                console.error(e)
                self.resetStatus()
                reject(e)
            }
        })
    }

    public loadModules(): Promise<void> {
        const basePath = Builder.getBasePath(this.config!)
        const self = this;
        return new Promise((resolve, reject) => {
            GithubAPI.getRepoContents(self.repo, basePath, Proxy.useProxy.value).then(data => {
                const promises: Promise<any>[] = []
                for (const path of data) {
                    let cont = false;
                    if (self.config!.version_modules) {
                        for (let key in self.config!.version_modules) {
                            // const versionModule = self.config.version_modules[key]
                            if (key == path.name) {
                                cont = true
                                break
                            }
                        }
                    }
                    if (cont) continue;
                    if (path.name == self.config!.main_module) {
                        continue
                    }
                    const promise = GithubAPI.getRepoContents(self.repo, path.path + "/module.config.json", Proxy.useProxy.value).then(data => {
                        self.modules.set(path.path as string, JSON.parse(b64tou(data.content)) as ModuleConfigJson)
                    })
                    promises.push(promise)
                }
                Promise.all(promises).then(() => resolve())
            }).catch(e => {
                console.error(e)
                self.resetStatus()
                reject(e)
            })
        })
    }

    public loadSets(): Promise<void> {
        if (!this.config!.sets_path) return Promise.resolve();
        const setsPath = this.config!.sets_path
        const self = this;
        return new Promise((resolve, reject) => {
            GithubAPI.getRepoContents(self.repo, setsPath, Proxy.useProxy.value).then(data => {
                const promises: Promise<any>[] = []
                for (const path of data) {
                    const promise = GithubAPI.getRepoContents(self.repo, path.path, Proxy.useProxy.value).then(setConfigData => {
                        const configJson = JSON.parse(b64tou(setConfigData.content)) as SetConfigJson
                        self.sets.set(configJson.set_name, configJson)
                    })
                    promises.push(promise)
                }
                Promise.all(promises).then(() => resolve())
            }).catch(e => {
                console.error(e)
                self.resetStatus()
                reject(e)
            })
        })
    }

    public build(type: "all" | "resource" | "data", selectedModules: string[], selectedMinecraft: string, buildToMod: boolean): Promise<void> {
        if (!type) {
            Message.error("请选择构建类型")
            return Promise.reject()
        }
        const self = this;
        return new Promise((resolve, reject) => {
            if (self.cacheZip) {
                self.zipHandler(type, selectedModules, selectedMinecraft, buildToMod).then(() => resolve())
                return;
            }
            if (!self.config!.file_mode && !Proxy.useProxy.value) {
                const mods: Map<string, number> = new Map()
                for (const key of selectedModules) {
                    const value = self.modules.get(key)
                    if (value == undefined) continue
                    mods.set(key, value.weight)
                }
                Builder.build(
                    self.repo,
                    self.config!,
                    mods,
                    selectedMinecraft,
                    self.type,
                    buildToMod,
                    "online",
                    Proxy.useProxy.value
                ).then((blob) => {
                    resolve()
                    Message.success("构建成功")
                    saveAs(blob, `${self.config!.pack_name}-${self.config!.version}-${self.type}-mc${selectedMinecraft}.${buildToMod ? "jar" : "zip"}`)
                }).catch(e => {
                    reject(e)
                    Message.error("构建失败")
                    console.error(e)
                })
                return;
            }
            GithubAPI.getRepoInfo(self.repo, Proxy.useProxy.value).then(repoInfo => {
                GithubAPI.getRepoZip(self.repo, repoInfo["default_branch"], Proxy.useProxy.value).then(async res => {
                    console.log("getRepoZip", res)
                    self.loadZip(res, false).then(() => {
                        self.zipHandler(type, selectedModules, selectedMinecraft, buildToMod).then(() => resolve())
                    })
                }).catch(e => {
                    reject(e)
                    console.warn(e)
                })
            }).catch(e => {
                reject('should-open-file-selector')
                console.error(e)
                self.resetStatus()
            })
        })
    }

    public loadZip(file: any, base64: boolean = true): Promise<void> {
        const self = this;
        return new Promise((resolve, reject) => {
            JSZip.loadAsync(file, {base64: base64}).then(zip => {
                self.cacheZip = zip
                resolve()
            }).catch(e => {
                Message.error("无法加载 ZIP 文件")
                reject(e)
            })
        })
    }

    public zipHandler(type: "all" | "resource" | "data", selectedModules: string[], selectedMinecraft: string, buildToMod: boolean): Promise<void> {
        const mods: Map<string, number> = new Map()
        for (const key of selectedModules) {
            const value = this.modules.get(key)
            if (value == undefined) continue
            mods.set(key, value.weight)
        }
        const zip = this.cacheZip!
        const neoZip = JSZip()
        const self = this;
        return new Promise<void>((resolve, reject) => {
            const promises: Promise<void>[] = []
            for (let filesKey in zip.files) {
                const neoKey = filesKey.split("/").slice(1).join("/")
                if (neoKey === "" || neoKey === "/") continue
                if (filesKey.endsWith("/")) {
                    neoZip.folder(neoKey)
                } else {
                    promises.push(new Promise((resolve, reject) => {
                        zip.file(filesKey)?.async("uint8array").then(data => {
                            neoZip.file(neoKey, data)
                            resolve()
                        }).catch(e => {
                            reject(e)
                        })
                    }))
                }
            }
            Promise.all(promises).then(() => {
                Builder.build(
                    self.repo,
                    self.config!,
                    mods,
                    selectedMinecraft,
                    type,
                    buildToMod,
                    "file",
                    Proxy.useProxy.value,
                    neoZip
                ).then((blob) => {
                    Message.success("构建成功")
                    saveAs(blob, `${self.config!.pack_name}-${self.config!.version}-${type}-mc${selectedMinecraft}.${buildToMod ? "jar" : "zip"}`)
                    resolve()
                }).catch(e => {
                    Message.error("构建失败")
                    console.error(e)
                    reject(e)
                })
            })
        })
    }
}

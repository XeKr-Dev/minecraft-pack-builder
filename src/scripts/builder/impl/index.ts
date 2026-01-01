import mc_version from '@/minecraft_version.json'
import JSZip from "jszip";
import type {ConfigJson, MetaJson, VersionModule} from "@/scripts/type";
import {RecipeFormatter} from "@/scripts/formatter";
import {b64tou, utob64} from "@/scripts/util";
import {Version} from "@/scripts/version";

export const mcVersions: {
    [key: string]: {
        datapack_version: number,
        resources_version: number
    }
} = mc_version

export interface RepoFileContent {
    name: string,
    path: string,
    content: string,
}

export interface RepoPathContent {
    name: string,
    path: string
}

export type RepoContents = RepoFileContent | RepoPathContent[]

export interface FileOrTree {
    path: string,
    content?: string,
    children?: FileOrTree[]
}

export interface IBuilder {
    processPath(path: string): string

    preprocessContent(content: string, path: string): string

    mergeFileOrTree(file1: FileOrTree, file2: FileOrTree): FileOrTree

    getFileTree(path: string): Promise<FileOrTree>

    fileToZip(zip: JSZip, b64: string, path: string): void

    fileTreeToZip(zip: JSZip, file: FileOrTree): void

    getBasePath(): string

    buildModZip(zip: JSZip): void

    build(): Promise<Blob>
}

export abstract class AbstractBuilder implements IBuilder {
    public readonly repo: string;
    public readonly config: ConfigJson;
    public readonly modules: Map<string, number>;
    public readonly version: string;
    public readonly type: "all" | "resource" | "data";
    public readonly mod: boolean;
    public readonly basePath: string;
    public readonly minecraftVersion;

    public constructor(
        repo: string,
        config: ConfigJson,
        modules: Map<string, number>,
        version: string,
        type: "all" | "resource" | "data" = "all",
        mod: boolean = false
    ) {
        this.repo = repo;
        this.config = config;
        this.modules = modules;
        this.version = version;
        this.type = type;
        this.mod = mod
        this.basePath = this.getBasePath();
        this.minecraftVersion = mcVersions[this.version]
    }

    public processPath(path: string) {
        if (path.startsWith(this.basePath)) {
            let curPath = path.replace(this.basePath, "")
            const curPathSplit = curPath.split("/")
            curPath = curPathSplit.length > 2 ? curPathSplit.slice(2).join("/") : ""
            return curPath
        } else if (path.startsWith("./")) {
            return path.substring(2)
        } else {
            return path
        }
    }

    public mergeFileOrTree(file1: FileOrTree, file2: FileOrTree): FileOrTree {
        if (file1.children === undefined || file2.children === undefined) {
            throw new Error("file1 or file2 is not a tree")
        }
        const file: FileOrTree = {
            path: file2.path,
        }
        file.children = file1.children
        for (let child of file2.children) {
            let contain = false
            for (let child1 of file.children) {
                if (child1.path == child.path) {
                    if (child1.content !== undefined && child.content !== undefined) {
                        child1.content = child.content
                        contain = true
                        break
                    }
                    if (child1.children !== undefined && child.children !== undefined) {
                        const merged = this.mergeFileOrTree(child, child1)
                        child1.children = merged.children
                        contain = true
                        break
                    }
                }
            }
            if (contain) continue
            file.children.push(child)
        }
        return file
    }

    public preprocessContent(
        content: string,
        path: string
    ) {
        const pathSplit = path.split("/")
        const type = pathSplit[2]
        if (!type) return content
        if (type === "recipe" || type === "recipes") {
            content = RecipeFormatter.format(content, this.minecraftVersion)
        }
        return content
    }

    public abstract getFileTree(path: string): Promise<FileOrTree>;

    public fileToZip(zip: JSZip, b64: string, path: string) {
        const cleanBase64 = b64.replace(/\s+/g, '');
        const binaryString = atob(cleanBase64);
        const buffer = new ArrayBuffer(binaryString.length);
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        zip.file(path, buffer)
    }

    public fileTreeToZip(zip: JSZip, file: FileOrTree) {
        if (
            this.type === "data"
            && file.content == null
            && (file.path.startsWith("assets/") || file.path === "assets")
        ) {
            return
        }
        if (
            this.type === "resource"
            && file.content == null
            && (file.path.startsWith("data/") || file.path === "data")
        ) {
            return
        }
        if (file.children) {
            zip.folder(file.path)
            for (let child of file.children) {
                this.fileTreeToZip(zip, child)
            }
        } else if (file.content) {
            this.fileToZip(zip, file.content, file.path)
        }
    }

    public getBasePath(): string {
        let basePath = this.config.base_path
        if (basePath.startsWith("./")) {
            basePath = basePath.substring(2)
        }
        return basePath
    }

    public buildModZip(
        zip: JSZip
    ) {
        const modID = this.config.pack_name.toLowerCase().replace(/[^a-z0-9]/g, '_')
        const license = `${this.config.license ?? 'All Right Reserved'}`
        const modsToml = `
modLoader = "lowcodefml"
loaderVersion = "[25,)"
license="${license}"
[[mods]]
modId = "${modID}"
version = "${this.config.version}"
displayName = "${this.config.pack_name}"
description = "${this.config.description}"
logoFile = "pack.png"
authors = "${this.config.author}"
        `.trim()
        const neoForgeModsToml = `
modLoader = "javafml"
loaderVersion = "[1,)"
license="${license}"
[[mods]]
modId = "${modID}"
version = "${this.config.version}"
displayName = "${this.config.pack_name}"
description = "${this.config.description}"
logoFile = "pack.png"
authors = "${this.config.author}"
        `.trim()
        zip.folder("META-INF")
        zip.file("META-INF/mods.toml", modsToml)
        zip.file("META-INF/neoforge.mods.toml", neoForgeModsToml)
        const authors: string[] = []
        const fabricModJson = {
            id: modID,
            version: this.config.version,
            name: this.config.pack_name,
            description: this.config.description,
            authors: authors,
            contact: {},
            icon: "pack.png",
            license: license,
            environment: "*",
            depends: {
                "fabric-resource-loader-v0": "*"
            }
        }
        const contributors: { [key: string]: string } = {}
        const quiltModJson = {
            quilt_loader: {
                group: "dev.xekr",
                id: modID,
                version: this.config.version,
                metadata: {
                    name: this.config.pack_name,
                    description: this.config.description,
                    contributors: contributors,
                    contact: {},
                    license: license,
                    icon: "pack.png"
                },
                intermediate_mappings: "net.fabricmc:intermediary",
                depends: [
                    {
                        id: "quilt_resource_loader",
                        versions: "*",
                        unless: "fabric-resource-loader-v0"
                    }
                ]
            }
        }
        for (let string of this.config.author.split(",")) {
            string = string.trim()
            fabricModJson.authors.push(string)
            quiltModJson.quilt_loader.metadata.contributors[string] = ""
        }
        this.fileToZip(zip, utob64(JSON.stringify(fabricModJson, null, 4)), "fabric.mod.json")
        this.fileToZip(zip, utob64(JSON.stringify(quiltModJson, null, 4)), "quilt.mod.json")
    }

    public build(): Promise<Blob> {
        const minecraftVersion = mcVersions[this.version]
        const basePath = this.getBasePath()
        const packFormat = this.type === "data" ? minecraftVersion.datapack_version : minecraftVersion.resources_version;
        const metaJson: MetaJson = {
            pack: {
                description: [
                    {
                        "text": `\u00a76\u00a7l${this.config.description} v${this.config.version}\n`
                    },
                    {
                        "text": `\u00a7a\u00a7lby \u00a76\u00a7l${this.config.author}`
                    }
                ]
            }
        }
        if (
            (this.type === "data" && packFormat >= 82)
            || (packFormat >= 65)
        ) {
            metaJson.pack["min_format"] = [Math.floor(packFormat), parseInt(packFormat.toString().split(".")[1])]
            metaJson.pack["max_format"] = [Math.floor(packFormat), parseInt(packFormat.toString().split(".")[1])]
        } else {
            metaJson.pack["pack_format"] = packFormat
        }
        let moduleList: { path: string, weight: number, files?: FileOrTree }[] = []
        for (let key of this.modules.keys()) {
            moduleList.push({
                path: key,
                weight: this.modules.get(key)!!
            })
        }
        const promises: Promise<any>[] = []
        for (let module of moduleList) {
            const promise = this.getFileTree(module.path).then(tree => module.files = tree)
            promises.push(promise)
        }
        moduleList = moduleList.sort((a, b) => a.weight - b.weight)
        return new Promise<Blob>(resolve => {
            this.getFileTree(`${basePath}/${this.config.main_module}`).then(res => {
                let pack: FileOrTree = res
                if (pack.children !== null && pack.children !== undefined) {
                    const mcmetaFile = pack.children.filter(child => child.path === "pack.mcmeta")
                    if (mcmetaFile.length > 0) {
                        const originalMetaJson = JSON.parse(b64tou(mcmetaFile[0].content!!))
                        if (
                            (this.type === "data" && packFormat >= 82)
                            || (packFormat >= 65)
                        ) {
                            originalMetaJson.pack["min_format"] = [Math.floor(packFormat), parseInt(packFormat.toString().split(".")[1])]
                            originalMetaJson.pack["max_format"] = [Math.floor(packFormat), parseInt(packFormat.toString().split(".")[1])]
                            delete originalMetaJson.pack["pack_format"]
                            delete originalMetaJson.pack["supported_formats"]
                        } else {
                            originalMetaJson.pack["pack_format"] = packFormat
                            delete originalMetaJson.pack["min_format"]
                            delete originalMetaJson.pack["max_format"]
                        }
                        mcmetaFile[0].content = utob64(JSON.stringify(originalMetaJson, null, 2))
                    } else {
                        pack.children.push({
                            path: "pack.mcmeta",
                            content: utob64(JSON.stringify(metaJson, null, 2))
                        })
                    }
                }
                const versionModuleMap: {
                    [key: string]: {
                        path: string
                        module: string
                        version: string
                        files?: FileOrTree
                    }
                } = {}
                if (this.config.version_modules) {
                    const versionModuleKeys = Object.keys(this.config.version_modules).filter(key => {
                        const versionModule: VersionModule = this.config.version_modules!![key]
                        if (!versionModule.target || versionModule.target === this.config.main_module) return true
                        for (const module of moduleList) {
                            if (module.path.endsWith(`/${versionModule.target}`)) return true
                        }
                        return false
                    })
                    for (const versionModuleKey of versionModuleKeys) {
                        const versionModule: VersionModule = this.config.version_modules[versionModuleKey]
                        const moduleMCVersion = mcVersions[versionModule.version];
                        if (!moduleMCVersion) continue
                        if (Version.compareMC(this.version, versionModule.version, !!this.config.version_reverse) < 0) continue
                        if (!!versionModule.strict && Version.compareMC(this.version, versionModule.version, !!this.config.version_reverse) !== 0) continue
                        const targetKey = versionModule.target || this.config.main_module
                        const target = versionModuleMap[targetKey]
                        if (target && Version.compareMC(target.version, versionModule.version) >= 0) continue
                        versionModuleMap[targetKey] = {
                            path: `${basePath}/${versionModuleKey}`,
                            module: versionModuleKey,
                            version: versionModule.version
                        }
                    }
                    for (const versionModuleKey in versionModuleMap) {
                        const versionModule = versionModuleMap[versionModuleKey]
                        const promise = this.getFileTree(versionModule.path).then(res => versionModule.files = res)
                        promises.push(promise)
                    }
                }
                if (this.config.icon) {
                    const promise = this.getFileTree(this.config.icon).then(icon => {
                        icon.path = "pack.png"
                        pack.children?.push(icon)
                    })
                    promises.push(promise)
                }
                Promise.all(promises).then(() => {
                    if (versionModuleMap[this.config.main_module]) {
                        const versionModule = versionModuleMap[this.config.main_module]
                        if (versionModule.files) {
                            pack = this.mergeFileOrTree(pack, versionModule.files)
                        }
                    }
                    for (let module of moduleList) {
                        pack = this.mergeFileOrTree(pack, module.files!!)
                        const versionModule = versionModuleMap[module.path.substring(basePath.length + 1)]
                        if (versionModule && versionModule.files) {
                            pack = this.mergeFileOrTree(pack, versionModule.files)
                        }
                    }
                    const zip: JSZip = new JSZip()
                    this.fileTreeToZip(zip, pack)
                    if (this.mod) this.buildModZip(zip)
                    zip.generateAsync({type: "blob"}).then(blob => resolve(blob))
                })
            })
        })
    }
}

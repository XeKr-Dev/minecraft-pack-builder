import type {ConfigJson, VersionModule} from "@/scripts/type";
import {GithubAPI} from "@/scripts/github";
import {utob64} from "@/scripts/util";
import JSZip from "jszip";
import mc_version from '@/minecraft_version.json'
import {PathFormatter, RecipeFormatter} from "@/scripts/formatter";
import {Version} from "@/scripts/version";

const mcVersions: {
    [key: string]: {
        datapack_version: number,
        resources_version: number
    }
} = mc_version

interface RepoFileContent {
    name: string,
    path: string,
    content: string,
}

interface RepoPathContent {
    name: string,
    path: string
}

type RepoContents = RepoFileContent | RepoPathContent[]

interface FileOrTree {
    path: string,
    content?: string,
    children?: FileOrTree[]
}

export class Builder {
    private static processPath(basePath: string, path: string) {
        if (path.startsWith(basePath)) {
            let curPath = path.replace(basePath, "")
            const curPathSplit = curPath.split("/")
            curPath = curPathSplit.length > 2 ? curPathSplit.slice(2).join("/") : ""
            return curPath
        } else if (path.startsWith("./")) {
            return path.substring(2)
        } else {
            return path
        }
    }

    private static mergeFileOrTree(file1: FileOrTree, file2: FileOrTree): FileOrTree {
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
                        const merged = Builder.mergeFileOrTree(child, child1)
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

    private static preprocessContent(
        content: string,
        path: string,
        version: {
            datapack_version: number,
            resources_version: number
        }
    ) {
        const pathSplit = path.split("/")
        const type = pathSplit[2]
        if (!type) return content
        if (type === "recipe" || type === "recipes") {
            content = RecipeFormatter.format(content, version)
        }
        return content
    }

    private static getFileTree(
        repo: string,
        basePath: string,
        path: string,
        type: "all" | "resource" | "data",
        version: {
            datapack_version: number,
            resources_version: number
        }
    ): Promise<FileOrTree> {
        return new Promise<FileOrTree>(resolve => {
            GithubAPI.getRepoContents(repo, path).then(res => {
                const data = res as RepoContents
                let curPath = Builder.processPath(basePath, path)
                if (!Array.isArray(data)) {
                    curPath = Builder.processPath(basePath, data.path)
                    const filePath = PathFormatter.format(curPath, version)
                    resolve({
                        content: this.preprocessContent(data.content, filePath, version),
                        path: filePath
                    })
                    return
                }
                const tree: FileOrTree = {path: PathFormatter.format(curPath, version), children: []}
                const promises: Promise<any>[] = []
                for (let datum of data) {
                    const filePath = Builder.processPath(basePath, datum.path)
                    if (datum.path.endsWith('config.json')) continue
                    if (type === "resource" && filePath.startsWith(`data/`)) {
                        continue
                    }
                    if (type === "data" && filePath.startsWith(`assets/`)) {
                        continue
                    }
                    const promise = Builder.getFileTree(repo, basePath, datum.path, type, version).then(file => {
                        tree.children?.push(file)
                    })
                    promises.push(promise)
                }
                Promise.all(promises).then(() => {
                    resolve(tree)
                })
            })
        })
    }

    private static fileToZip(zip: JSZip, b64: string, path: string) {
        const cleanBase64 = b64.replace(/\s+/g, '');
        const binaryString = atob(cleanBase64);
        const buffer = new ArrayBuffer(binaryString.length);
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        zip.file(path, buffer)
    }

    private static fileTreeToZip(zip: JSZip, file: FileOrTree, type: "all" | "resource" | "data") {
        if (
            type === "data"
            && file.content == null
            && (file.path.startsWith("assets/") || file.path === "assets")
        ) {
            return
        }
        if (
            type === "resource"
            && file.content == null
            && (file.path.startsWith("data/") || file.path === "data")
        ) {
            return
        }
        if (file.children) {
            zip.folder(file.path)
            for (let child of file.children) {
                Builder.fileTreeToZip(zip, child, type)
            }
        } else if (file.content) {
            Builder.fileToZip(zip, file.content, file.path)
        }
    }

    public static getBasePath(config: ConfigJson): string {
        let basePath = config.base_path
        if (basePath.startsWith("./")) {
            basePath = basePath.substring(2)
        }
        return basePath
    }

    public static buildModZip(
        zip: JSZip,
        config: ConfigJson
    ) {
        const modID = config.pack_name.toLowerCase().replace(/[^a-z0-9]/g, '_')
        const license = `${config.license ?? 'All Right Reserved'}`
        const modsToml = `
modLoader = "lowcodefml"
loaderVersion = "[25,)"
license="${license}"
[[mods]]
modId = "${modID}"
version = "${config.version}"
displayName = "${config.pack_name}"
description = "${config.description}"
logoFile = "pack.png"
authors = "${config.author}"
        `.trim()
        const neoForgeModsToml = `
modLoader = "javafml"
loaderVersion = "[1,)"
license="${license}"
[[mods]]
modId = "${modID}"
version = "${config.version}"
displayName = "${config.pack_name}"
description = "${config.description}"
logoFile = "pack.png"
authors = "${config.author}"
        `.trim()
        zip.folder("META-INF")
        zip.file("META-INF/mods.toml", modsToml)
        zip.file("META-INF/neoforge.mods.toml", neoForgeModsToml)
        const authors: string[] = []
        const fabricModJson = {
            id: modID,
            version: config.version,
            name: config.pack_name,
            description: config.description,
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
                version: config.version,
                metadata: {
                    name: config.pack_name,
                    description: config.description,
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
        for (let string of config.author.split(",")) {
            string = string.trim()
            fabricModJson.authors.push(string)
            quiltModJson.quilt_loader.metadata.contributors[string] = ""
        }
        Builder.fileToZip(zip, utob64(JSON.stringify(fabricModJson, null, 4)), "fabric.mod.json")
        Builder.fileToZip(zip, utob64(JSON.stringify(quiltModJson, null, 4)), "quilt.mod.json")
    }

    public static build(
        repo: string,
        config: ConfigJson,
        modules: Map<string, number>,
        type: "all" | "resource" | "data" = "all",
        version: string,
        mod: boolean = false
    ): Promise<Blob> {
        const minecraftVersion = mcVersions[version]
        const basePath = Builder.getBasePath(config)
        const metaJson = {
            pack: {
                description: [
                    {
                        "text": `\u00a76\u00a7l${config.description} v${config.version}\n`
                    },
                    {
                        "text": `\u00a7a\u00a7lby \u00a76\u00a7l${config.author}`
                    }
                ],
                pack_format: type === "data" ? minecraftVersion.datapack_version : minecraftVersion.resources_version
            }
        }
        let moduleList: { path: string, weight: number, files?: FileOrTree }[] = []
        for (let key of modules.keys()) {
            moduleList.push({
                path: key,
                weight: modules.get(key)!!
            })
        }
        const promises: Promise<any>[] = []
        for (let module of moduleList) {
            const promise = Builder.getFileTree(repo, basePath, module.path, type, minecraftVersion).then(tree => module.files = tree)
            promises.push(promise)
        }
        moduleList = moduleList.sort((a, b) => a.weight - b.weight)
        return new Promise<Blob>(resolve => {
            Builder.getFileTree(repo, basePath, `${basePath}/${config.main_module}`, type, minecraftVersion).then(res => {
                let pack: FileOrTree = res
                pack.children?.push({
                    path: "pack.mcmeta",
                    content: utob64(JSON.stringify(metaJson, null, 2))
                })
                const versionModuleMap: {
                    [key: string]: {
                        path: string
                        module: string
                        version: string
                        files?: FileOrTree
                    }
                } = {}
                if (config.version_modules) {
                    const versionModuleKeys = Object.keys(config.version_modules).filter(key => {
                        const versionModule: VersionModule = config.version_modules!![key]
                        if (!versionModule.target || versionModule.target === config.main_module) return true
                        for (const module of moduleList) {
                            if (module.path.endsWith(`/${versionModule.target}`)) return true
                        }
                        return false
                    })
                    for (const versionModuleKey of versionModuleKeys) {
                        const versionModule: VersionModule = config.version_modules[versionModuleKey]
                        const moduleMCVersion = mcVersions[versionModule.version];
                        if (!moduleMCVersion) continue
                        if (Version.compareMC(version, versionModule.version) < 0) continue
                        if (versionModule.strict && Version.compareMC(version, versionModule.version) !== 0) continue
                        const targetKey = versionModule.target || config.main_module
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
                        const promise = Builder.getFileTree(repo, basePath, versionModule.path, type, minecraftVersion).then(res => versionModule.files = res)
                        promises.push(promise)
                    }
                }
                if (config.icon) {
                    const promise = Builder.getFileTree(repo, basePath, config.icon, type, minecraftVersion).then(icon => {
                        icon.path = "pack.png"
                        pack.children?.push(icon)
                    })
                    promises.push(promise)
                }
                Promise.all(promises).then(() => {
                    if (versionModuleMap[config.main_module]) {
                        const versionModule = versionModuleMap[config.main_module]
                        if (versionModule.files) {
                            pack = Builder.mergeFileOrTree(pack, versionModule.files)
                        }
                    }
                    for (let module of moduleList) {
                        pack = Builder.mergeFileOrTree(pack, module.files!!)
                        const versionModule = versionModuleMap[module.path.substring(basePath.length + 1)]
                        if (versionModule && versionModule.files) {
                            pack = Builder.mergeFileOrTree(pack, versionModule.files)
                        }
                    }
                    const zip: JSZip = new JSZip()
                    Builder.fileTreeToZip(zip, pack, type)
                    if (mod) Builder.buildModZip(zip, config)
                    zip.generateAsync({type: "blob"}).then(blob => resolve(blob))
                })
            })
        })
    }
}
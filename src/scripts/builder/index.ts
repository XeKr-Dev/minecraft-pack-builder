import type {ConfigJson} from "@/scripts/type";
import {GithubAPI} from "@/scripts/github";
import {utob} from "@/scripts/util";
import JSZip from "jszip";
import mc_version from '@/minecraft_version.json'
import {PathFormatter, RecipeFormatter} from "@/scripts/formatter";

const minecraft_version: {
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

    private static async getFileTree(
        repo: string,
        basePath: string,
        path: string,
        type: "all" | "resource" | "data",
        version: {
            datapack_version: number,
            resources_version: number
        }
    ): Promise<FileOrTree> {
        const data = await GithubAPI.getRepoContents(repo, path) as RepoContents
        let curPath = Builder.processPath(basePath, path)
        if (Array.isArray(data)) {
            const tree: FileOrTree = {path: PathFormatter.format(curPath, version), children: []}
            for (let datum of data) {
                const filePath = Builder.processPath(basePath, datum.path)
                if (datum.path.endsWith('config.json')) continue
                if (type === "resource" && filePath.startsWith(`data/`)) {
                    continue
                }
                if (type === "data" && filePath.startsWith(`assets/`)) {
                    continue
                }
                tree.children?.push(await Builder.getFileTree(repo, basePath, datum.path, type, version))
            }
            return tree
        }
        curPath = Builder.processPath(basePath, data.path)
        const filePath = PathFormatter.format(curPath, version)
        return {
            content: this.preprocessContent(data.content, filePath, version),
            path: filePath
        }
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
            const cleanBase64 = file.content.replace(/\s+/g, '');
            const binaryString = atob(cleanBase64);
            const buffer = new ArrayBuffer(binaryString.length);
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            zip.file(file.path, buffer)
        }
    }

    public static getBasePath(config: ConfigJson): string {
        let basePath = config.base_path
        if (basePath.startsWith("./")) {
            basePath = basePath.substring(2)
        }
        return basePath
    }

    public static async build(
        repo: string,
        config: ConfigJson,
        modules: Map<string, number>,
        type: "all" | "resource" | "data" = "all",
        version: string
    ): Promise<Blob> {
        const mc_version = minecraft_version[version]
        const basePath = Builder.getBasePath(config)
        const metaJson = {
            description: [
                {
                    "text": `\u00a76\u00a7l${config.description} v${config.version}\n`
                },
                {
                    "text": `\u00a7a\u00a7lby \u00a76\u00a7l${config.author}`
                }
            ],
            pack_format: type === "data" ? mc_version.datapack_version : mc_version.resources_version
        }
        let moduleList: { path: string, weight: number, files?: FileOrTree }[] = []
        for (let key of modules.keys()) {
            moduleList.push({
                path: key,
                weight: modules.get(key)!!
            })
        }
        for (let module of moduleList) {
            module.files = await Builder.getFileTree(repo, basePath, module.path, type, mc_version)
        }
        moduleList = moduleList.sort((a, b) => a.weight - b.weight)
        let pack: FileOrTree = await Builder.getFileTree(repo, basePath, `${basePath}/${config.main_module}`, type, mc_version)
        pack.children?.push({
            path: "pack.mcmeta",
            content: utob(JSON.stringify(metaJson, null, 2))
        })
        if (config.version_modules) {
            let versionModule = config.version_modules[version]
            if (!versionModule) {
                let cont = true
                for (let key in minecraft_version) {
                    if (key === version) cont = false
                    if (cont) continue
                    const mod = config.version_modules[key]
                    if (!mod) continue
                    if (mod.strict && key !== version) continue
                    versionModule = mod
                    if (versionModule) break
                }
            }
            if (versionModule) {
                pack.children?.push(await Builder.getFileTree(repo, basePath, `${basePath}/${versionModule.module}`, type, mc_version))
            }
        }
        if (config.icon) {
            pack.children?.push(await Builder.getFileTree(repo, basePath, config.icon, type, mc_version))
        }
        for (let module of moduleList) {
            pack = Builder.mergeFileOrTree(pack, module.files!!)
        }
        const zip: JSZip = new JSZip()
        Builder.fileTreeToZip(zip, pack, type)
        return await zip.generateAsync({type: "blob"});
    }
}
import type {ConfigJson} from "@/scripts/type";
import {GithubAPI} from "@/scripts/github";
import {utob} from "@/scripts/util";
import JSZip from "jszip";

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

    private static async getFileTree(repo: string, basePath: string, path: string): Promise<FileOrTree> {
        const data = await GithubAPI.getRepoContents(repo, path) as RepoContents
        let curPath = Builder.processPath(basePath, path)
        if (Array.isArray(data)) {
            const tree: FileOrTree = {path: curPath, children: []}
            for (let datum of data) {
                if (datum.path.endsWith('config.json')) continue
                tree.children?.push(await Builder.getFileTree(repo, basePath, datum.path))
            }
            return tree
        }
        return {content: data.content, path: Builder.processPath(basePath, data.path)}
    }

    private static fileTreeToZip(zip: JSZip, file: FileOrTree) {
        if (file.children) {
            zip.folder(file.path)
            for (let child of file.children) {
                Builder.fileTreeToZip(zip, child)
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

    public static async build(repo: string, config: ConfigJson, modules: Map<string, number>): Promise<Blob> {
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
            pack_format: 64,
            supported_formats: {min_inclusive: 34, max_inclusive: 81}
        }
        let moduleList: { path: string, weight: number, files?: FileOrTree }[] = []
        for (let key of modules.keys()) {
            moduleList.push({
                path: key,
                weight: modules.get(key)!!
            })
        }
        for (let module of moduleList) {
            module.files = await Builder.getFileTree(repo, basePath, module.path)
        }
        moduleList = moduleList.sort((a, b) => a.weight - b.weight)
        let pack: FileOrTree = await Builder.getFileTree(repo, basePath, `${basePath}/${config.main_module}`)
        pack.children?.push({
            path: "pack.mcmeta",
            content: utob(JSON.stringify(metaJson, null, 2))
        })
        pack.children?.push(await Builder.getFileTree(repo, basePath, config.icon))
        for (let module of moduleList) {
            pack = Builder.mergeFileOrTree(pack, module.files!!)
        }
        const zip: JSZip = new JSZip()
        Builder.fileTreeToZip(zip, pack)
        return await zip.generateAsync({type: "blob"});
    }
}
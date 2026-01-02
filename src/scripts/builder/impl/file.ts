import {AbstractBuilder, type FileOrTree} from "@/scripts/builder/impl/index.ts";
import type {ConfigJson} from "@/scripts/type";
import JSZip from "jszip";
import {PathFormatter} from "@/scripts/formatter";

export class FileBuilder extends AbstractBuilder {
    private readonly files: JSZip;

    constructor(
        repo: string,
        config: ConfigJson,
        modules: Map<string, number>,
        version: string,
        type: "all" | "resource" | "data" = "all",
        mod: boolean = false,
        file: JSZip
    ) {
        super(repo, config, modules, version, type, mod);
        this.files = file;
    }

    public getFileTree(path: string, proxy: boolean = false): Promise<FileOrTree> {
        if (path.startsWith("./")) path = path.substring(2);
        let files = this.files.file(path)
        const curPath = this.processPath(path)
        if ((files === null && !path.endsWith("/")) || path.endsWith("/")) {
            path = path.endsWith("/") ? path : path + "/";
            const dirFile = this.files.folder(path)
            return new Promise((resolve, reject) => {
                try {
                    const filePath = PathFormatter.format(curPath, this.minecraftVersion)
                    const fileTree: FileOrTree = {path: filePath, children: []}
                    if (!dirFile) {
                        resolve(fileTree);
                        return;
                    }
                    const promises: Promise<any>[] = []
                    for (let filesKey in this.files.files) {
                        if (!filesKey.startsWith(path) || filesKey === path) continue
                        const fileKeySub = filesKey.substring(path.length)
                        const curKeyPath = this.processPath(filesKey)
                        const curFilePath = PathFormatter.format(curKeyPath, this.minecraftVersion)
                        if (fileKeySub.split("/").filter(s => s.length != 0).length > 1) {
                            continue;
                        }
                        const file = dirFile.file(fileKeySub)
                        if (!file || file.dir) {
                            const dirFile1 = dirFile.folder(fileKeySub)
                            if (!dirFile1) continue;
                            const promise = this.getFileTree(filesKey, proxy).then(files => fileTree.children?.push(files))
                            promises.push(promise)
                            continue
                        }
                        const promise = file.async("base64").then((b64) => {
                            fileTree.children!!.push({
                                path: curFilePath,
                                content: this.preprocessContent(b64, filePath)
                            })
                        })
                        promises.push(promise)
                    }
                    Promise.all(promises).then(() => {
                        resolve(fileTree);
                    })
                } catch (e) {
                    reject(e);
                }
            });
        }
        if (!files) throw new Error(`File ${path} not found`);
        return new Promise((resolve, reject) => {
            files.async("base64")
                .then((b64) => {
                    const filePath = PathFormatter.format(curPath, this.minecraftVersion)
                    resolve({path: filePath, content: this.preprocessContent(b64, filePath)})
                })
                .catch(reject)
        })
    }
}
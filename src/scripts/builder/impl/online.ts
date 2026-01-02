import {GithubAPI} from "@/scripts/github";
import {PathFormatter} from "@/scripts/formatter";
import {type FileOrTree, type RepoContents, AbstractBuilder} from "@/scripts/builder/impl";

export class OnlineBuilder extends AbstractBuilder {
    public getFileTree(
        path: string,
        proxy: boolean = false
    ): Promise<FileOrTree> {
        return new Promise<FileOrTree>(resolve => {
            GithubAPI.getRepoContents(this.repo, path, proxy).then(res => {
                const data = res as RepoContents
                let curPath = this.processPath(path)
                if (!Array.isArray(data)) {
                    curPath = this.processPath(data.path)
                    const filePath = PathFormatter.format(curPath, this.minecraftVersion)
                    resolve({
                        content: this.preprocessContent(data.content, filePath),
                        path: filePath
                    })
                    return
                }
                const tree: FileOrTree = {path: PathFormatter.format(curPath, this.minecraftVersion), children: []}
                const promises: Promise<any>[] = []
                for (let datum of data) {
                    const filePath = this.processPath(datum.path)
                    if (datum.path.endsWith('config.json')) continue
                    if (this.type === "resource" && filePath.startsWith(`data/`)) {
                        continue
                    }
                    if (this.type === "data" && filePath.startsWith(`assets/`)) {
                        continue
                    }
                    const promise = this.getFileTree(datum.path, proxy).then(file => {
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
}
import path_formatter from "@/path_formatter.json";

const pathFormatter: {
    assets: { [key: string]: string[] }, // "<from> -> <to>"
    data: { [key: string]: string[] } // "<from> -> <to>"
} = path_formatter

export class PathFormatter {
    private static dataPathMap: Map<number, { from: string, to: string }[]> = new Map()
    private static assetsPathMap: Map<number, { from: string, to: string }[]> = new Map()

    static {
        for (const key in pathFormatter.data) {
            const value = pathFormatter.data[key]
            this.dataPathMap.set(parseInt(key), value.map(item => {
                const split = item.split(" -> ")
                return {
                    from: split[0],
                    to: split[1]
                }
            }))
        }
        for (const key in pathFormatter.assets) {
            const value = pathFormatter.assets[key]
            this.assetsPathMap.set(parseInt(key), value.map(item => {
                const split = item.split(" -> ")
                return {
                    from: split[0],
                    to: split[1]
                }
            }))
        }
    }

    public static format(
        path: string,
        version: {
            datapack_version: number,
            resources_version: number
        }
    ): string {
        const pathSplit: string[] = path.split("/")

        if (pathSplit[0] === "data") {
            // 获取 namespace 后的路径部分
            const subPath = pathSplit.slice(2).join("/")

            for (const key of this.dataPathMap.keys()) {
                const value = this.dataPathMap.get(key)
                if (!value) continue

                if (version.datapack_version >= key) {
                    // 升级：from -> to
                    for (const data of value) {
                        if (subPath === data.from || subPath.startsWith(data.from)) {
                            const newSubPath = subPath.replace(data.from, data.to)
                            pathSplit.splice(2, pathSplit.length - 2, ...newSubPath.split("/"))
                            break
                        }
                    }
                } else {
                    // 降级：to -> from
                    for (const data of value) {
                        if (subPath === data.to || subPath.startsWith(data.to)) {
                            const newSubPath = subPath.replace(data.to, data.from)
                            pathSplit.splice(2, pathSplit.length - 2, ...newSubPath.split("/"))
                            break
                        }
                    }
                }
            }
        } else if (pathSplit[0] === "assets") {
            // 获取 namespace 后的路径部分
            const subPath = pathSplit.slice(2).join("/")

            for (const key of this.assetsPathMap.keys()) {
                const value = this.assetsPathMap.get(key)
                if (!value) continue

                if (version.resources_version >= key) {
                    // 升级：from -> to
                    for (const data of value) {
                        if (subPath === data.from || subPath.startsWith(data.from + "/")) {
                            const newSubPath = subPath.replace(data.from, data.to)
                            pathSplit.splice(2, pathSplit.length - 2, ...newSubPath.split("/"))
                            break
                        }
                    }
                } else {
                    // 降级：to -> from
                    for (const data of value) {
                        if (subPath === data.to || subPath.startsWith(data.to + "/")) {
                            const newSubPath = subPath.replace(data.to, data.from)
                            pathSplit.splice(2, pathSplit.length - 2, ...newSubPath.split("/"))
                            break
                        }
                    }
                }
            }
        }

        path = pathSplit.join("/")
        return path
    }
}

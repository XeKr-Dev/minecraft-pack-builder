export class PathFormatter {
    private static dataPathMap: Map<number, { from: string, to: string }[]> = new Map()
    private static assetsPathMap: Map<number, { from: string, to: string }[]> = new Map()

    static {
        const list: { from: string, to: string }[] = []
        for (const [from, to] of [
            ["structures", "structure"],
            ["advancements", "advancement"],
            ["recipes", "recipe"],
            ["loot_tables", "loot_table"],
            ["predicates", "predicate"],
            ["item_modifiers", "item_modifier"],
            ["functions", "function"]
        ]) {
            list.push({from, to})
        }
        PathFormatter.dataPathMap.set(45, list)
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
            for (const key of this.dataPathMap.keys()) {
                const value = this.dataPathMap.get(key)
                if (!value) continue
                if (version.datapack_version >= key) {
                    for (const data of value) {
                        if (pathSplit[2] !== data.from) continue
                        pathSplit[2] = data.to
                    }
                } else {
                    for (const data of value) {
                        if (pathSplit[2] !== data.to) continue
                        pathSplit[2] = data.from
                    }
                }
            }
        } else if (pathSplit[0] === "assets") {
            for (const key of this.assetsPathMap.keys()) {
                const value = this.assetsPathMap.get(key)
                if (!value) continue
                if (version.resources_version >= key) {
                    for (const data of value) {
                        if (pathSplit[2] !== data.from) continue
                        pathSplit[2] = data.to
                    }
                } else {
                    for (const data of value) {
                        if (pathSplit[2] !== data.to) continue
                        pathSplit[2] = data.from
                    }
                }
            }
        }
        path = pathSplit.join("/")
        return path
    }
}

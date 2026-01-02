import type {ConfigJson} from "@/scripts/type";
import {OnlineBuilder} from "@/scripts/builder/impl/online.ts";
import JSZip from "jszip";
import {FileBuilder} from "@/scripts/builder/impl/file.ts";


export class Builder {
    public static getBasePath(config: ConfigJson): string {
        let basePath = config.base_path
        if (basePath.startsWith("./")) {
            basePath = basePath.substring(2)
        }
        return basePath
    }

    public static build(
        repo: string,
        config: ConfigJson,
        modules: Map<string, number>,
        version: string,
        type: "all" | "resource" | "data" = "all",
        mod: boolean = false,
        builder: "online" | "file",
        proxy: boolean = false,
        extra: JSZip | undefined = undefined
    ): Promise<Blob> {
        if (builder === "online") {
            return new OnlineBuilder(repo, config, modules, version, type, mod).build(proxy);
        }
        return new FileBuilder(repo, config, modules, version, type, mod, extra!!).build(proxy);
    }
}
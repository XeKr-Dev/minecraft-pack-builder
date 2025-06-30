import {Axios} from "axios";
import mc_version from 'src/version_changed.json'

const a = new Axios()
a.get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json").then(getVersions)

function getVersions(data: any) {
    data = JSON.parse(data.data) as any
    const versions = data["versions"] as {
        id: string,
        type: 'snapshot' | 'release'
    }[]
    const vs: {
        [key: string]: {
            datapack_version: number
            resources_version: number
        }
    } = {}
    let datapack_version = 81
    let resources_version = 64
    const minecraft_version: {
        [key: string]: {
            datapack_version?: number
            resources_version?: number
        }
    } = mc_version
    for (let version of versions) {
        let get: boolean = false;
        vs[version.id] = {
            datapack_version: datapack_version,
            resources_version: resources_version
        }
        for (let key in minecraft_version) {
            if (key === version.id) {
                get = true;
                continue
            }
            if (get) {
                if (minecraft_version[key].datapack_version) {
                    datapack_version = minecraft_version[key].datapack_version
                }
                if (minecraft_version[key].resources_version) {
                    resources_version = minecraft_version[key].resources_version
                }
                break
            }
        }
        if (version.id === "17w43a") break
    }
    console.log(JSON.stringify(vs, null, 2))
}
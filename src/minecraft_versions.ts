import {Axios} from "axios";

const a = new Axios()
a.get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json").then(getVersions)

function getVersions(data: any) {
    data = JSON.parse(data.data) as any
    const versions = data["versions"] as {
        id: string,
        type: 'snapshot' | 'release'
    }[]
    const vs: string[] = []
    for (let version of versions) {
        vs.push(version.id)
    }
    console.log(JSON.stringify(vs, null, 2))
}
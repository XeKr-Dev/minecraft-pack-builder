// import mc_version from './minecraft_version.json'
// import * as fs from 'node:fs'
//
// const mv: {
//     [key: string]: {
//         datapack_version: number,
//         resources_version: number
//     }
// } = mc_version
//
// const mcv: {
//     [key: string]: {
//         type: "snapshot" | "release",
//         datapack_version: number,
//         resources_version: number
//     }
// } = {}
// for (let mcVersionKey in mv) {
//     const value = mv[mcVersionKey]
//     mcv[mcVersionKey] = {
//         type: /^\d+.\d+.\d+$/.test(mcVersionKey) ? "release" : "snapshot",
//         datapack_version: value.datapack_version,
//         resources_version: value.resources_version
//     }
//     console.log(JSON.stringify(mcv))
//     fs.writeFileSync("minecraft_versions_1.json", JSON.stringify(mcv, null, 2))
// }
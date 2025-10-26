// import axios from "axios";
// import versionChangedFile from "./version_changed.json";
// import * as fs from "node:fs";
//
// interface MinecraftVersionData {
//     id: string,
//     type: "snapshot" | "release",
// }
//
// interface MinecraftVersion {
//     type: "snapshot" | "release",
//     datapack_version: number,
//     resources_version: number
// }
//
// interface VersionChangedData {
//     datapack_version?: number,
//     resources_version?: number
// }
//
// const versionChanged: { [key: string]: VersionChangedData } = versionChangedFile;
// let minecraftVersions: { [key: string]: MinecraftVersion } = {};
//
// const INSTANCE = axios.create({
//     baseURL: 'https://launchermeta.mojang.com',
//     timeout: 15000
// })
//
// const currentVersion = {
//     datapack_version: 1,
//     resources_version: 4
// }
//
// INSTANCE.get('/mc/game/version_manifest_v2.json').then(res => {
//     const versions = res.data.versions as MinecraftVersionData[];
//     let savedVersions: MinecraftVersionData[] = [];
//     for (const obj of versions) {
//         savedVersions = [obj, ...savedVersions];
//         if (obj.id == "17w43a") break;
//     }
//     for (const obj of savedVersions) {
//         if (obj.id in versionChanged) {
//             currentVersion.datapack_version = versionChanged[obj.id].datapack_version || currentVersion.datapack_version;
//             currentVersion.resources_version = versionChanged[obj.id].resources_version || currentVersion.resources_version;
//         }
//         minecraftVersions[obj.id] = {
//             type: obj.type,
//             datapack_version: currentVersion.datapack_version,
//             resources_version: currentVersion.resources_version
//         }
//     }
//     let savedMinecraftVersions: { [key: string]: MinecraftVersion } = {}
//     let savedMinecraftVersionKeys: string[] = []
//     for (let key of Object.keys(minecraftVersions)) {
//         savedMinecraftVersionKeys = [key, ...savedMinecraftVersionKeys]
//     }
//     for (let key of savedMinecraftVersionKeys) {
//         savedMinecraftVersions[key] = minecraftVersions[key]
//     }
//     minecraftVersions = savedMinecraftVersions
//     fs.writeFileSync("minecraft_version.json", JSON.stringify(minecraftVersions, null, 2))
// })

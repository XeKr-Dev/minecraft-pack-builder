import {Request} from "@/scripts/request";

export class GithubAPI {
    public static async getRepoContents(repo: string, path: string = "") {
        return Request.get(`https://api.github.com/repos/${repo}/contents/${path}/`)
    }

    public static async getRepoReadme(repo: string) {
        return Request.get(`https://api.github.com/repos/${repo}/readme`)
    }

    public static getRepoZip(repo: string) {
        window.open(`${import.meta.env.VITE_BASE_URL}/repos/${repo}/zipball`, "_blank")
    }
}
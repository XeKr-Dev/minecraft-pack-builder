import {Request} from "@/scripts/request";

export class GithubAPI {
    public static readonly proxies: string[] = [
        "https://gh.llkk.cc/",
        "https://gh-proxy.top/",
        "https://cdn.gh-proxy.org/",
        "https://gh-proxy.org/"
    ];
    public static readonly proxy: string = GithubAPI.proxies[Math.floor(Math.random() * GithubAPI.proxies.length)];

    public static async getRepoInfo(repo: string, proxy: boolean = false) {
        return Request.get((proxy ? GithubAPI.proxy : '') + `${import.meta.env.VITE_GITHUB_API_URL}/repos/${repo}`)
    }

    public static async getRepoContents(repo: string, path: string = "", proxy: boolean = false) {
        return Request.get((proxy ? GithubAPI.proxy : '') + `${import.meta.env.VITE_GITHUB_API_URL}/repos/${repo}/contents/${path}/`)
    }

    public static async getRepoReadme(repo: string, proxy: boolean = false) {
        return Request.get((proxy ? GithubAPI.proxy : '') + `${import.meta.env.VITE_GITHUB_API_URL}/repos/${repo}/readme`)
    }

    public static getRepoZip(repo: string, _branch: string = "", proxy: boolean = false) {
        if(!_branch) {
            window.open((proxy ? GithubAPI.proxy : '') + `${import.meta.env.VITE_GITHUB_API_URL}/repos/${repo}/zipball`, "_blank")
        } else {
            window.open((proxy ? GithubAPI.proxy : '') + `${import.meta.env.VITE_GITHUB_URL}/${repo}/archive/refs/heads/${_branch}.zip`, "_blank")
        }
    }
}
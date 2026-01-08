import {Request} from "@/scripts/request";

export class GithubAPI {
    public static readonly proxies: string[] = [
        "https://gh.llkk.cc/",
        "https://gh-proxy.top/",
        "https://cdn.gh-proxy.org/",
        "https://gh-proxy.org/",
        "https://git.yylx.win/",
        "https://gh-proxy.com/",
        "https://github.chenc.dev/",
        "https://fastgit.cc/",
        "https://gh.zwnes.xyz/",
        "https://github.tmby.shop/"
    ];
    public static proxy: string = GithubAPI.proxies[Math.floor(Math.random() * GithubAPI.proxies.length)];
    public static fileProxy?: string = undefined;

    static {
        console.log("Selected proxy:", GithubAPI.proxy)
    }

    public static async getRepoInfo(repo: string, proxy: boolean = false) {
        const url = `${import.meta.env.VITE_GITHUB_API_URL}/repos/${repo}`;
        return proxy ? GithubAPI.testProxyGet(url) : Request.get(url)
    }

    public static async getRepoContents(repo: string, path: string = "", proxy: boolean = false) {
        const url = `${import.meta.env.VITE_GITHUB_API_URL}/repos/${repo}/contents/${path}/`;
        return proxy ? GithubAPI.testProxyGet(url) : Request.get(url)
    }

    public static async getRepoReadme(repo: string, proxy: boolean = false) {
        const url = `${import.meta.env.VITE_GITHUB_API_URL}/repos/${repo}/readme`;
        return proxy ? GithubAPI.testProxyGet(url) : Request.get(url)
    }

    public static getRepoZip(repo: string, _branch: string = "", proxy: boolean = false) {
        const url = (proxy ? GithubAPI.proxy : '') + (_branch
            ? `${import.meta.env.VITE_GITHUB_URL}/${repo}/archive/refs/heads/${_branch}.zip`
            : `${import.meta.env.VITE_GITHUB_API_URL}/repos/${repo}/zipball`)
        if (!proxy) {
            window.open(url, "_blank")
            return Promise.reject()
        }
        return new Promise((resolve, reject) => {
            GithubAPI.testGetRepoZip(repo, _branch).then((res) => {
                resolve(res)
            }).catch((e) => {
                window.open(url, "_blank")
                reject(e)
            })
        })
    }

    private static testProxyGet(url: string, test: number = -1) {
        if (test >= GithubAPI.proxies.length) return Promise.reject("No suitable proxy server!")
        const proxyUrl = test >= 0 ? GithubAPI.proxies[test] : GithubAPI.proxy
        const requestUrl = proxyUrl + url
        return new Promise<void>((resolve, reject) => {
            Request.get(requestUrl, {}, true, 'json', true).then((res) => {
                if (GithubAPI.proxy != proxyUrl) {
                    GithubAPI.proxy = proxyUrl;
                    console.log("Selected proxy:", proxyUrl)
                }
                resolve(res)
            }).catch((_) => {
                GithubAPI.testProxyGet(url, test + 1).then((res) => {
                    resolve(res)
                }).catch((e) => {
                    reject(e)
                })
            })
        })
    }

    private static testGetRepoZip(repo: string, _branch: string = "", test: number = -1) {
        if (test >= GithubAPI.proxies.length) return Promise.reject("No suitable proxy server!")
        // if (!GithubAPI.fileProxy) test = 0;
        const proxyUrl = test >= 0 ? GithubAPI.proxies[test] : GithubAPI.fileProxy || GithubAPI.proxy;
        const url = proxyUrl + (_branch
            ? `${import.meta.env.VITE_GITHUB_URL}/${repo}/archive/refs/heads/${_branch}.zip`
            : `${import.meta.env.VITE_GITHUB_API_URL}/repos/${repo}/zipball`)
        return new Promise<void>((resolve, reject) => {
            Request.get(url, {}, true, 'arraybuffer', true).then((res) => {
                if (GithubAPI.fileProxy != proxyUrl) {
                    GithubAPI.fileProxy = proxyUrl;
                    console.log("Selected file proxy:", proxyUrl)
                }
                resolve(res)
            }).catch((_) => {
                GithubAPI.testGetRepoZip(repo, _branch, test + 1).then((res) => {
                    resolve(res)
                }).catch((e) => {
                    reject(e)
                })
            })
        })
    }
}
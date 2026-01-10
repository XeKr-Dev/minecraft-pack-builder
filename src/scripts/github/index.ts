import {Request} from "@/scripts/request";
import {GITHUB_API_URL, GITHUB_URL} from "@/scripts/constants";
import {Proxy} from "@/scripts/util";

export class GithubAPI {
    public static async getRepoInfo(repo: string, proxy: boolean = false) {
        const url = `${GITHUB_API_URL}/repos/${repo}`;
        return proxy ? GithubAPI.testProxyGet(url) : Request.get(url)
    }

    public static async getRepoContents(repo: string, path: string = "", proxy: boolean = false) {
        const url = `${GITHUB_API_URL}/repos/${repo}/contents/${path}/`;
        return proxy ? GithubAPI.testProxyGet(url) : Request.get(url)
    }

    public static async getRepoReadme(repo: string, proxy: boolean = false) {
        const url = `${GITHUB_API_URL}/repos/${repo}/readme`;
        return proxy ? GithubAPI.testProxyGet(url) : Request.get(url)
    }

    public static getRepoZip(repo: string, _branch: string = "", proxy: boolean = false) {
        const url = (proxy ? Proxy.proxy : '') + (_branch
            ? `${GITHUB_URL}/${repo}/archive/refs/heads/${_branch}.zip`
            : `${GITHUB_API_URL}/repos/${repo}/zipball`)
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
        if (test >= Proxy.proxies.length) return Promise.reject("No suitable proxy server!")
        const proxyUrl = test >= 0 ? Proxy.proxies[test] : Proxy.proxy
        const requestUrl = proxyUrl + url
        return new Promise<void>((resolve, reject) => {
            Request.get(requestUrl, {}, true, 'json', true).then((res) => {
                if (Proxy.proxy != proxyUrl) {
                    Proxy.proxy = proxyUrl;
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
        if (test >= Proxy.proxies.length) return Promise.reject("No suitable proxy server!")
        // if (!GithubAPI.fileProxy) test = 0;
        const proxyUrl = test >= 0 ? Proxy.proxies[test] : Proxy.fileProxy || Proxy.proxy;
        const url = proxyUrl + (_branch
            ? `${GITHUB_URL}/${repo}/archive/refs/heads/${_branch}.zip`
            : `${GITHUB_API_URL}/repos/${repo}/zipball`)
        return new Promise<void>((resolve, reject) => {
            Request.get(url, {}, true, 'arraybuffer', true).then((res) => {
                if (Proxy.fileProxy != proxyUrl) {
                    Proxy.fileProxy = proxyUrl;
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
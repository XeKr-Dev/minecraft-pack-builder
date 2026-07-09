import axios, {type ResponseType} from 'axios'
import {Message} from '@/scripts/message'
import {t} from '@/i18n'

export class Request {
    public static readonly baseUrl = `${import.meta.env.VITE_BASE_URL}/api`
    private static readonly INSTANCE = axios.create({
        baseURL: Request.baseUrl,
        timeout: 15000
    })

    private static getHeaders(headers: any = {}, proxy: boolean = false) {
        const ghp = localStorage.getItem('ghp')
        if (!ghp || !proxy) return headers
        return {
            ...headers,
            Authorization: `Bearer ${ghp}`
        }
    }

    public static async get(url: string, headers: any = {}, proxy: boolean = false, responseType: ResponseType = 'json', silence: boolean = false): Promise<any> {
        headers = Request.getHeaders(headers, proxy)
        return new Promise<any>((resolve, reject) => {
            Request.INSTANCE
                .get(url, {headers, responseType: responseType})
                .then((res) => {
                    const data = Request.process(res)
                    if (data) resolve(data)
                })
                .catch((res) => {
                    Request.reject(res, silence)
                    reject(res)
                })
        })
    }

    public static async post(
        url: string,
        data: any = {},
        headers: any = {},
        proxy: boolean = false
    ): Promise<any> {
        headers = Request.getHeaders(headers, proxy)
        return new Promise<any>((resolve, reject) => {
            Request.INSTANCE
                .post(url, data, {headers})
                .then((res) => {
                    const data = Request.process(res)
                    if (data) resolve(data)
                })
                .catch((res) => {
                    Request.reject(res)
                    reject(res)
                })
        })
    }

    public static async put(
        url: string,
        data: any = {},
        headers: any = {},
        proxy: boolean = false
    ): Promise<any> {
        headers = Request.getHeaders(headers, proxy)
        return new Promise<any>((resolve, reject) => {
            Request.INSTANCE
                .put(url, data, {headers})
                .then((res) => {
                    const data = Request.process(res)
                    if (data) resolve(data)
                })
                .catch((res) => {
                    Request.reject(res)
                    reject(res)
                })
        })
    }

    public static async delete(url: string, headers: any = {}, proxy: boolean = false): Promise<any> {
        headers = Request.getHeaders(headers, proxy)
        return new Promise<any>((resolve, reject) => {
            Request.INSTANCE
                .delete(url, {headers})
                .then((res) => {
                    const data = Request.process(res)
                    if (data) resolve(data)
                })
                .catch((res) => {
                    Request.reject(res)
                    reject(res)
                })
        })
    }

    private static async process(response: any): Promise<any> {
        return response.data
    }

    private static async reject(response: any, silence: boolean = false) {
        if (response.status == 403) {
            if (!silence) Message.error(t("message.requestFailed"))
        } else if (response.status == 404) {
            if (!silence) Message.error(t("message.repoRequestFailed"))
        } else {
            if (!silence) Message.error(response.data?.message || response.message)
        }
    }
}

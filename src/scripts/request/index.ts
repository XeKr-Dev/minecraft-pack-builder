import axios from 'axios'
import {Message} from '@/scripts/message'

export class Request {
    public static readonly baseUrl = `${import.meta.env.VITE_BASE_URL}/api`
    private static readonly INSTANCE = axios.create({
        baseURL: Request.baseUrl,
        timeout: 15000
    })

    private static getHeaders(headers: any = {}) {
        const ghp = localStorage.getItem('ghp')
        if (!ghp) return headers
        return {
            ...headers,
            Authorization: `Bearer ${ghp}`
        }
    }

    public static async get(url: string, headers: any = {}): Promise<any> {
        headers = Request.getHeaders(headers)
        return new Promise<any>((resolve, reject) => {
            Request.INSTANCE
                .get(url, {headers})
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

    public static async post(
        url: string,
        data: any = {},
        headers: any = {}
    ): Promise<any> {
        headers = Request.getHeaders(headers)
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
        headers: any = {}
    ): Promise<any> {
        headers = Request.getHeaders(headers)
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

    public static async delete(url: string, headers: any = {}): Promise<any> {
        headers = Request.getHeaders(headers)
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

    private static async reject(response: any) {
        Message.error(response.data.message)
    }
}

import {ref, watch} from "vue";

export function utob64(str: string) {
    // noinspection JSDeprecatedSymbols
    return btoa(unescape(encodeURIComponent(str)))
}

export function b64tou(str: string) {
    // noinspection JSDeprecatedSymbols
    return decodeURIComponent(escape(atob(str)))
}

export async function imageMagnify(b64: string) {
    const destCanvas = document.createElement('canvas');
    const destCtx = destCanvas.getContext('2d');
    if (!destCtx) return b64;
    destCanvas.width = 512;
    destCanvas.height = 512;
    const sourceCanvas = document.createElement('canvas');
    const srcCtx = sourceCanvas.getContext('2d');
    if (!srcCtx) return b64;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = b64;
    });
    sourceCanvas.width = img.width;
    sourceCanvas.height = img.height;
    srcCtx.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);
    img.remove()

    const srcImageData = srcCtx.getImageData(
        0, 0,
        sourceCanvas.width,
        sourceCanvas.height
    );
    const srcData = srcImageData.data;

    // 创建目标图像数据
    const destImageData = destCtx.createImageData(512, 512);
    const destData = destImageData.data;

    const ratioX = sourceCanvas.width / 512;
    const ratioY = sourceCanvas.height / 512;

    // 遍历目标图像每个像素
    for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
            // 计算源图像对应坐标（浮点数）
            const srcX = x * ratioX;
            const srcY = y * ratioY;

            // 取最邻近整数坐标
            const nearestX = Math.min(sourceCanvas.width - 1, Math.max(0, Math.round(srcX)));
            const nearestY = Math.min(sourceCanvas.height - 1, Math.max(0, Math.round(srcY)));

            // 边界检查
            const srcIdx = (nearestY * sourceCanvas.width + nearestX) * 4;
            const destIdx = (y * 512 + x) * 4;

            // 复制RGBA值
            destData[destIdx] = srcData[srcIdx];         // R
            destData[destIdx + 1] = srcData[srcIdx + 1]; // G
            destData[destIdx + 2] = srcData[srcIdx + 2]; // B
            destData[destIdx + 3] = srcData[srcIdx + 3]; // A
        }
    }
    destCtx.putImageData(destImageData, 0, 0);
    b64 = destCanvas.toDataURL('image/png')
    sourceCanvas.remove()
    destCanvas.remove()
    return b64;
}

export class Proxy {
    public static useProxy = ref(false)
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
    public static proxy: string = Proxy.proxies[Math.floor(Math.random() * Proxy.proxies.length)];
    public static fileProxy?: string = undefined;

    static {
        watch(Proxy.useProxy, (newUseProxy) => {
            if (newUseProxy) {
                localStorage.setItem('useProxy', newUseProxy.toString())
            } else {
                localStorage.removeItem('useProxy')
            }
        })
    }

    static {
        Proxy.useProxy.value = localStorage.getItem('useProxy') === 'true'
        console.log("Selected proxy:", Proxy.proxy)
    }
}

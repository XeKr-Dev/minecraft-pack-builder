// noinspection JSDeprecatedSymbols

export function utob(str: string) {
    return btoa(unescape(encodeURIComponent(str)))
}

export function btou(str: string) {
    return decodeURIComponent(escape(atob(str)))
}

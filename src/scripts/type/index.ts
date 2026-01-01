export interface VersionModule {
    version: string
    strict?: boolean
    target?: string
}

export interface VersionModules {
    [key: string]: VersionModule
}

export interface ConfigJson {
    pack_name: string
    author: string
    description: string
    version: string
    base_path: string
    sets_path?: string
    icon?: string
    license?: string
    main_module: string
    file_mode?: boolean
    type?: "resource" | "data"
    suggested_version?: string
    version_reverse?: boolean,
    version_modules?: VersionModules,
}

export interface ModuleConfigJson {
    module_name: string
    description?: string
    support_version: string
    weight: number
    breaks: string[],
    bindings?: string[]
}

export interface SetConfigJson {
    set_name: string
    description?: string
    modules: string[]
}

export interface MetaJson {
    pack: {
        description: {
            text: string
        }[],
        pack_format?: number
        min_format?: [number, number]
        max_format?: [number, number]
    }
}

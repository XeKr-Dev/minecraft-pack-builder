export interface VersionModule {
    module: string
    strict: boolean
}

export interface VersionModules {
    [key: string]: VersionModule
}

export interface ConfigJson {
    pack_name: string,
    author: string,
    description: string,
    version: string,
    base_path: string,
    sets_path: string,
    icon: string,
    main_module: string,
    version_modules: VersionModules,
}

export interface ModuleConfigJson {
    module_name: string,
    description?: string,
    support_version: string,
    weight: number,
    breaks: string[]
}

export interface SetConfigJson {
    set_name: string,
    description?: string,
    modules: string[]
}

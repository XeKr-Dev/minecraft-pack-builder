<script setup lang="ts">
import {reactive, ref} from "vue";
import {Message} from "@/scripts/message";
import MarkdownView from "@/components/MarkdownView.vue";
import {GithubAPI} from "@/scripts/github";
import {b64tou, imageMagnify} from "@/scripts/util";
import type {ConfigJson, ModuleConfigJson, SetConfigJson} from "@/scripts/type";
import {Builder} from "@/scripts/builder";
import {saveAs} from 'file-saver';
import mc_version from '@/minecraft_version.json'
import FakeProgress from "@/components/FakeProgress.vue";
import Notice from "@/components/Notice.vue";
import PageHeader from "@/components/PageHeader.vue";
import FileSelectorDialog from "@/components/FileSelectorDialog.vue";
import JSZip from "jszip";

const BASE_64_PNG_PREFIX = 'data:image/png;base64, '
const minecraft_version: {
  [key: string]: {
    type: "snapshot" | "release",
    datapack_version: number,
    resources_version: number
  }
} = mc_version as {
  [key: string]: {
    type: "snapshot" | "release",
    datapack_version: number,
    resources_version: number
  }
}

function getUrl() {
  return window.location.href.split('/#/')[1] || 'XeKr-Dev/minecraft-pack-template'
}

const repoUrl = ref(`https://github.com/${getUrl()}`)
const useProxy = ref(false)

interface Status {
  loading: boolean
  loaded: boolean
  repo: string
  readme: string
  config: ConfigJson | undefined
  modules: Map<string, ModuleConfigJson>
  selectedModules: string[]
  sets: Map<string, SetConfigJson>
  selectedSet: string | undefined
  selectedMinecraft: string
  showSnapshot: boolean
  type: "all" | "resource" | "data"
  buildToMod: boolean
  building: boolean
  icon: string
  progress: boolean
  openFileSelector: boolean
  files: File[]
}

const status: Status = reactive({
  loading: false,
  loaded: false,
  repo: "",
  readme: "",
  config: undefined,
  modules: new Map(),
  selectedModules: [],
  sets: new Map(),
  selectedSet: undefined,
  selectedMinecraft: "1.21.11",
  showSnapshot: false,
  type: "all",
  buildToMod: false,
  building: false,
  icon: "",
  progress: false,
  openFileSelector: false,
  files: [],
})

function resetStatus() {
  status.loading = false
  status.loaded = false
  status.repo = ""
  status.readme = ""
  status.config = undefined
  status.modules = new Map()
  status.selectedModules = []
  status.sets = new Map()
  status.selectedSet = undefined
  status.selectedMinecraft = "1.21.11"
  status.showSnapshot = false
  status.type = "all"
  status.buildToMod = false
  status.building = false
  status.icon = ""
  status.progress = false
  status.openFileSelector = false
  status.files = []
}

function moduleKeys() {
  return Array.from(status.modules.keys()).sort((a, b) => a.localeCompare(b))
}

function loadRepo() {
  try {
    resetStatus()
    const urlSplit = repoUrl.value.split(/(?<!\/)\/(?!\/)/)
    if (
        urlSplit[1] === undefined
        || urlSplit[1] === ""
        || urlSplit[2] === undefined
        || urlSplit[2] === ""
    ) {
      Message.error("仓库地址错误，请填写正确的 GitHub 仓库地址")
      return
    }
    status.repo = `${urlSplit[1]}/${urlSplit[2]}`
    const urlPrefix = window.location.href.split('/#/')[0]
    history.pushState(null, '', `${urlPrefix}#/${status.repo}`)
    const promises: Promise<any>[] = []
    GithubAPI.getRepoContents(status.repo, "config.json", useProxy.value).then(configData => {
      status.config = JSON.parse(b64tou(configData.content)) as ConfigJson
      if (status.config.suggested_version) status.selectedMinecraft = status.config.suggested_version
      if (status.config.type) status.type = status.config.type
      if (status.config.icon) {
        GithubAPI.getRepoContents(status.repo, status.config.icon, useProxy.value).then(iconData => {
          imageMagnify(`${BASE_64_PNG_PREFIX}${iconData.content}`).then(b64 => {
            status.icon = b64
          })
        })
      }
      promises.push(loadModules())
      promises.push(loadSets())
      Promise.all(promises).then(() => {
        status.loaded = true
        status.loading = false
        Message.success("加载成功")
      })
    }).catch(e => {
      Message.error("无法加载配置文件")
      console.error(e)
      resetStatus()
    })
    GithubAPI.getRepoReadme(status.repo, useProxy.value).then(readmeData => {
      status.readme = b64tou(readmeData.content)
    }).catch(e => {
      Message.error("无法加载 README.md")
      console.error(e)
      resetStatus()
    })
  } catch (e: any) {
    console.error(e)
    resetStatus()
  }
}

function loadModules(): Promise<void> {
  const basePath = Builder.getBasePath(status.config!)
  return new Promise(resolve => {
    GithubAPI.getRepoContents(status.repo, basePath, useProxy.value).then(data => {
      const promises: Promise<any>[] = []
      for (const path of data) {
        let cont = false;
        if (status.config!.version_modules) {
          for (let key in status.config!.version_modules) {
            // const versionModule = status.config.version_modules[key]
            if (key == path.name) {
              cont = true
              break
            }
          }
        }
        if (cont) continue;
        if (path.name == status.config!.main_module) {
          continue
        }
        const promise = GithubAPI.getRepoContents(status.repo, path.path + "/module.config.json", useProxy.value).then(data => {
          status.modules.set(path.path as string, JSON.parse(b64tou(data.content)) as ModuleConfigJson)
        })
        promises.push(promise)
      }
      Promise.all(promises).then(() => resolve())
    }).catch(e => {
      console.error(e)
      resetStatus()
    })
  })
}

async function loadSets(): Promise<void> {
  if (!status.config!.sets_path) return;
  const setsPath = status.config!.sets_path
  const data = await GithubAPI.getRepoContents(status.repo, setsPath, useProxy.value)
  for (const path of data) {
    const setConfigData = await GithubAPI.getRepoContents(status.repo, path.path, useProxy.value)
    const configJson = JSON.parse(b64tou(setConfigData.content)) as SetConfigJson
    status.sets.set(configJson.set_name, configJson)
  }
  return new Promise(resolve => {
    GithubAPI.getRepoContents(status.repo, setsPath, useProxy.value).then(data => {
      const promises: Promise<any>[] = []
      for (const path of data) {
        const promise = GithubAPI.getRepoContents(status.repo, path.path, useProxy.value).then(setConfigData => {
          const configJson = JSON.parse(b64tou(setConfigData.content)) as SetConfigJson
          status.sets.set(configJson.set_name, configJson)
        })
        promises.push(promise)
      }
      Promise.all(promises).then(() => resolve())
    }).catch(e => {
      console.error(e)
      resetStatus()
    })
  })
}

function changeModules(e: string[]) {
  status.selectedSet = undefined
  for (const moduleKey of e) {
    selectWithBindings(moduleKey)
  }
}

function changeSet() {
  if (status.selectedSet == undefined) return
  status.selectedModules = status.sets.get(status.selectedSet)?.modules.map(module => {
    const basePath = Builder.getBasePath(status.config!)
    return `${basePath}/${module}`
  }) || []
}

function checkModuleDisabled(key: string) {
  const basePath = Builder.getBasePath(status.config!)
  const self = status.modules.get(key)
  if (self == undefined) return true
  for (const subKey of status.selectedModules) {
    for (let breakKey of self.breaks) {
      breakKey = `${basePath}/${breakKey}`
      if (subKey == breakKey) return true
    }
    const sub = status.modules.get(subKey)
    if (sub == undefined) continue
    for (const breakKey of sub.breaks) {
      if (`${basePath}/${breakKey}` == key) return true
    }
  }
  if (self.bindings) {
    for (let binding of self.bindings) {
      binding = `${basePath}/${binding}`
      if (!binding || binding == key) return true
      if (checkModuleDisabled(binding)) return true
    }
  }
  return false
}

function selectWithBindings(key: string) {
  const basePath = Builder.getBasePath(status.config!)
  const self = status.modules.get(key)
  if (self == undefined) return;
  if (!status.selectedModules.includes(key)) {
    status.selectedModules.push(key)
  }
  if (self.bindings) {
    for (let binding of self.bindings) {
      binding = `${basePath}/${binding}`
      if (!binding || binding == key) return;
      selectWithBindings(binding)
    }
  }
}

function build() {
  if (!status.loaded) {
    Message.error("请先加载配置文件")
    return
  }
  if (!status.selectedMinecraft) {
    Message.error("请选择 Minecraft 版本")
    return
  }
  if (!status.type) {
    Message.error("请选择构建类型")
    return
  }
  if (!status.config!.file_mode && !useProxy.value) {
    const mods: Map<string, number> = new Map()
    for (const key of status.selectedModules) {
      const value = status.modules.get(key)
      if (value == undefined) continue
      mods.set(key, value.weight)
    }
    status.building = true
    status.progress = true
    Builder.build(
        status.repo,
        status.config!,
        mods,
        status.selectedMinecraft,
        status.type,
        status.buildToMod,
        "online",
        useProxy.value
    ).then((blob) => {
      status.building = false
      Message.success("构建成功")
      saveAs(blob, `${status.config!.pack_name}-${status.config!.version}-${status.type}-mc${status.selectedMinecraft}.${status.buildToMod ? "jar" : "zip"}`)
    }).catch(e => {
      status.building = false
      Message.error("构建失败")
      console.error(e)
    })
    return;
  }
  status.openFileSelector = true
  GithubAPI.getRepoInfo(status.repo, useProxy.value).then(repoInfo => {
    GithubAPI.getRepoZip(status.repo, repoInfo["default_branch"], useProxy.value)
  }).catch(e => {
    console.error(e)
    resetStatus()
  })
}

async function fileSelectorOK() {
  status.openFileSelector = false
  const mods: Map<string, number> = new Map()
  for (const key of status.selectedModules) {
    const value = status.modules.get(key)
    if (value == undefined) continue
    mods.set(key, value.weight)
  }
  const zip = await JSZip.loadAsync(status.files[0], {base64: true})
  const neoZip = JSZip()
  for (let filesKey in zip.files) {
    const neoKey = filesKey.split("/").slice(1).join("/")
    if (neoKey === "" || neoKey === "/") continue
    if (filesKey.endsWith("/")) {
      neoZip.folder(neoKey)
    } else {
      neoZip.file(neoKey, await zip.file(filesKey)?.async("uint8array"))
    }
  }
  status.building = true
  status.progress = true
  Builder.build(
      status.repo,
      status.config!,
      mods,
      status.selectedMinecraft,
      status.type,
      status.buildToMod,
      "file",
      useProxy.value,
      neoZip
  ).then((blob) => {
    status.files = []
    status.building = false
    Message.success("构建成功")
    saveAs(blob, `${status.config!.pack_name}-${status.config!.version}-${status.type}-mc${status.selectedMinecraft}.${status.buildToMod ? "jar" : "zip"}`)
  }).catch(e => {
    status.files = []
    status.building = false
    Message.error("构建失败")
    console.error(e)
  })
}

function fileSelectorCancel() {
  status.openFileSelector = false
}
</script>

<template>
  <file-selector-dialog
      v-model:visible="status.openFileSelector"
      v-model:files="status.files"
      @ok="fileSelectorOK"
      @cancel="fileSelectorCancel"
  />
  <page-header v-model="status.repo"/>
  <a-scrollbar style="height: calc(100vh - 80px);overflow: auto">
    <div class="repo-input">
      <a-form :model="{}">
        <a-form-item label="仓库地址">
          <a-input v-model="repoUrl"/>
          <a-button class="btn" @click="loadRepo" :loading="status.loading" :disabled="status.building">加载</a-button>
          <a-checkbox v-model="useProxy"/>
          <div style="white-space: nowrap; margin-left: 8px">使用代理</div>
        </a-form-item>
      </a-form>
    </div>
    <div class="container">
      <notice/>
      <div class="page-content">
        <a-card>
          <template v-if="status.repo !== ''" #title>
            {{ status.repo }}
          </template>
          <div style="padding: 15px; height: 10px">
            <fake-progress v-if="status.progress" v-model="status.building"/>
          </div>
          <div style="display: flex">
            <a-image :src="status.icon" style="margin: 10px;image-rendering: crisp-edges" :width="200" :height="200"/>
            <a-form :model="{}" :auto-label-width="true">
              <a-form-item label="选择模块">
                <a-select v-model="status.selectedModules" multiple @change="changeModules"
                          :disabled="status.loading || status.building">
                  <div v-for="key in moduleKeys()" :key="key">
                    <a-tooltip v-if="!!status.modules.get(key)?.description"
                               :content="status.modules.get(key)?.description">
                      <a-option :value="key" :disabled="checkModuleDisabled(key)">
                        {{ status.modules.get(key)?.module_name }}
                      </a-option>
                    </a-tooltip>
                    <a-option v-else :value="key" :disabled="checkModuleDisabled(key)">
                      {{ status.modules.get(key)?.module_name }}
                    </a-option>
                  </div>
                </a-select>
              </a-form-item>
              <a-form-item label="选择合集">
                <a-select v-model="status.selectedSet" @change="changeSet"
                          :disabled="status.loading || status.building">
                  <div v-for="key in status.sets.keys()" :key="key">
                    <a-tooltip v-if="!!status.sets.get(key)?.description" :content="status.sets.get(key)?.description">
                      <a-option :value="key">
                        {{ status.sets.get(key)?.set_name }}
                      </a-option>
                    </a-tooltip>
                    <a-option v-else :value="key">
                      {{ status.sets.get(key)?.set_name }}
                    </a-option>
                  </div>
                </a-select>
              </a-form-item>
              <div>
                <a-row>
                  <a-col :span="18">
                    <a-form-item label="选择版本">
                      <a-select v-model="status.selectedMinecraft" :disabled="status.loading || status.building"
                                allow-search>
                        <div v-for="(value,key) in minecraft_version" :key="key">
                          <a-option v-show="status.showSnapshot || value.type == 'release'" :value="key" :label="key">
                            <a-tag class="page-tag" style="width: 150px">
                              {{ key }}
                            </a-tag>
                            <a-tag class="page-tag" style="width: 90px" color="red">
                              资源包：{{ value.resources_version }}
                            </a-tag>
                            <a-tag class="page-tag" style="width: 90px" color="blue">
                              数据包：{{ value.datapack_version }}
                            </a-tag>
                          </a-option>
                        </div>
                      </a-select>
                    </a-form-item>
                  </a-col>
                  <a-col :span="6">
                    <a-form-item style="margin-left: 20px" label="显示快照">
                      <a-checkbox v-model="status.showSnapshot"/>
                    </a-form-item>
                  </a-col>
                </a-row>
              </div>
              <div>
                <a-row>
                  <a-col :span="18">
                    <a-form-item label="选择类型">
                      <a-select v-model="status.type" :disabled="status.loading || status.building">
                        <a-option value="all">全部</a-option>
                        <a-option value="resource">资源包</a-option>
                        <a-option value="data">数据包</a-option>
                      </a-select>
                    </a-form-item>
                  </a-col>
                  <a-col :span="6">
                    <a-form-item style="margin-left: 20px">
                      <template #label>
                        <a-tooltip>
                          <template #content>
                            构建为模组，可在Fabric/Quilt/Forge/Neoforge中加载
                          </template>
                          <icon-question-circle-fill/>
                        </a-tooltip>
                        构建模组
                      </template>
                      <a-checkbox v-model="status.buildToMod"/>
                    </a-form-item>
                  </a-col>
                </a-row>
              </div>
              <a-button @click="build" :loading="status.building">构建</a-button>
            </a-form>
          </div>
          <a-divider/>
          <markdown-view v-model="status.readme"/>
        </a-card>
      </div>
    </div>
    <div class="page-footer">
      ©
      <a-link href="https://github.com/XeKr-Dev">XeKr-Dev</a-link>
    </div>
  </a-scrollbar>
</template>

<style scoped>
.page-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 40px;
}

.repo-input {
  display: block;
  padding-right: 200px;
  padding-left: 200px;
  min-width: 445px;
}

.container {
  display: flex;
}

.page-content {
  width: 1800px;
  margin: 20px;
  display: inline-block;
}

.btn {
  margin-left: 10px;
  margin-right: 10px;
}

.page-tag {
  margin-right: 10px;
  margin-left: 10px;
}
</style>
<script setup lang="ts">
import {type Ref, ref} from "vue";
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

const isLoaded = ref(false)
const isLoading = ref(false)
const repo = ref("")
const readme = ref("")
const config: Ref<ConfigJson> = ref({} as ConfigJson)
const modules: Ref<Map<string, ModuleConfigJson>> = ref(new Map())
const sets: Ref<Map<string, SetConfigJson>> = ref(new Map())
const selectedModules: Ref<string[]> = ref([])
const selectedSet: Ref<string | undefined> = ref(undefined)
const selectedMinecraft: Ref<string> = ref("1.21.7")
const showSnapshot = ref(false)
const selectedType: Ref<'all' | 'resource' | 'data'> = ref("all")
const buildToMod = ref(false)
const building = ref(false)
const icon = ref("")
const progress = ref(false)
const openFileSelector = ref(false)
const files = ref<File[]>([])

function loadRepo() {
  try {
    progress.value = false
    isLoaded.value = false
    isLoading.value = true
    config.value = {} as ConfigJson
    modules.value = new Map()
    sets.value = new Map()
    selectedModules.value = []
    selectedSet.value = undefined
    readme.value = ""
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
    repo.value = `${urlSplit[1]}/${urlSplit[2]}`
    const urlPrefix = window.location.href.split('/#/')[0]
    history.pushState(null, '', `${urlPrefix}#/${repo.value}`)
    const promises: Promise<any>[] = []
    GithubAPI.getRepoContents(repo.value, "config.json").then(configData => {
      config.value = JSON.parse(b64tou(configData.content)) as ConfigJson
      if (config.value.suggested_version) selectedMinecraft.value = config.value.suggested_version
      if (config.value.type) selectedType.value = config.value.type
      if (config.value.icon) {
        GithubAPI.getRepoContents(repo.value, config.value.icon).then(iconData => {
          imageMagnify(`${BASE_64_PNG_PREFIX}${iconData.content}`).then(b64 => {
            icon.value = b64
          })
        })
      }
      promises.push(loadModules())
      promises.push(loadSets())
      Promise.all(promises).then(() => {
        isLoaded.value = true
        isLoading.value = false
        Message.success("加载成功")
      })
    })
    GithubAPI.getRepoReadme(repo.value).then(readmeData => {
      readme.value = b64tou(readmeData.content)
    })
  } catch (e: any) {
    console.error(e)
    progress.value = false
    isLoaded.value = false
    isLoading.value = false
    config.value = {} as ConfigJson
    modules.value = new Map()
    sets.value = new Map()
    selectedModules.value = []
    selectedSet.value = undefined
    repo.value = ""
    readme.value = ""
  }
}

function loadModules(): Promise<void> {
  const basePath = Builder.getBasePath(config.value)
  return new Promise(resolve => {
    GithubAPI.getRepoContents(repo.value, basePath).then(data => {
      const promises: Promise<any>[] = []
      for (const path of data) {
        let cont = false;
        if (config.value.version_modules) {
          for (let key in config.value.version_modules) {
            // const versionModule = config.value.version_modules[key]
            if (key == path.name) {
              cont = true
              break
            }
          }
        }
        if (cont) continue;
        if (path.name == config.value.main_module) {
          continue
        }
        const promise = GithubAPI.getRepoContents(repo.value, path.path + "/module.config.json").then(data => {
          modules.value.set(path.path as string, JSON.parse(b64tou(data.content)) as ModuleConfigJson)
        })
        promises.push(promise)
      }
      Promise.all(promises).then(() => resolve())
    })
  })
}

async function loadSets(): Promise<void> {
  if (!config.value.sets_path) return;
  const setsPath = config.value.sets_path
  const data = await GithubAPI.getRepoContents(repo.value, setsPath)
  for (const path of data) {
    const setConfigData = await GithubAPI.getRepoContents(repo.value, path.path)
    const configJson = JSON.parse(b64tou(setConfigData.content)) as SetConfigJson
    sets.value.set(configJson.set_name, configJson)
  }
  return new Promise(resolve => {
    GithubAPI.getRepoContents(repo.value, setsPath).then(data => {
      const promises: Promise<any>[] = []
      for (const path of data) {
        const promise = GithubAPI.getRepoContents(repo.value, path.path).then(setConfigData => {
          const configJson = JSON.parse(b64tou(setConfigData.content)) as SetConfigJson
          sets.value.set(configJson.set_name, configJson)
        })
        promises.push(promise)
      }
      Promise.all(promises).then(() => resolve())
    })
  })
}

function changeModules() {
  selectedSet.value = undefined
}

function changeSet() {
  if (selectedSet.value == undefined) return
  selectedModules.value = sets.value.get(selectedSet.value)?.modules.map(module => {
    const basePath = Builder.getBasePath(config.value)
    return `${basePath}/${module}`
  }) || []
}

function checkModuleDisabled(key: string) {
  const basePath = Builder.getBasePath(config.value)
  const self = modules.value.get(key)
  if (self == undefined) return true
  for (const subKey of selectedModules.value) {
    for (let breakKey of self.breaks) {
      breakKey = `${basePath}/${breakKey}`
      if (subKey == breakKey) return true
    }
    const sub = modules.value.get(subKey)
    if (sub == undefined) continue
    for (const breakKey of sub.breaks) {
      if (`${basePath}/${breakKey}` == key) return true
    }
  }
  return false
}

function build() {
  if (!isLoaded.value) {
    Message.error("请先加载配置文件")
    return
  }
  if (!selectedMinecraft.value) {
    Message.error("请选择 Minecraft 版本")
    return
  }
  if (!selectedType.value) {
    Message.error("请选择构建类型")
    return
  }
  if (!config.value.file_mode) {
    const mods: Map<string, number> = new Map()
    for (const key of selectedModules.value) {
      const value = modules.value.get(key)
      if (value == undefined) continue
      mods.set(key, value.weight)
    }
    building.value = true
    progress.value = true
    Builder.build(
        repo.value,
        config.value,
        mods,
        selectedMinecraft.value,
        selectedType.value,
        buildToMod.value,
        "online"
    ).then((blob) => {
      building.value = false
      Message.success("构建成功")
      saveAs(blob, `${config.value.pack_name}-${config.value.version}-${selectedType.value}-mc${selectedMinecraft.value}.${buildToMod.value ? "jar" : "zip"}`)
    }).catch(e => {
      building.value = false
      Message.error("构建失败")
      console.error(e)
    })
    return;
  }
  openFileSelector.value = true
  GithubAPI.getRepoZip(repo.value)
}

async function fileSelectorOK() {
  openFileSelector.value = false
  const mods: Map<string, number> = new Map()
  for (const key of selectedModules.value) {
    const value = modules.value.get(key)
    if (value == undefined) continue
    mods.set(key, value.weight)
  }
  const zip = await JSZip.loadAsync(files.value[0], {base64: true})
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
  building.value = true
  progress.value = true
  Builder.build(
      repo.value,
      config.value,
      mods,
      selectedMinecraft.value,
      selectedType.value,
      buildToMod.value,
      "file",
      neoZip
  ).then((blob) => {
    files.value = []
    building.value = false
    Message.success("构建成功")
    saveAs(blob, `${config.value.pack_name}-${config.value.version}-${selectedType.value}-mc${selectedMinecraft.value}.${buildToMod.value ? "jar" : "zip"}`)
  }).catch(e => {
    files.value = []
    building.value = false
    Message.error("构建失败")
    console.error(e)
  })
}

function fileSelectorCancel() {
  openFileSelector.value = false
}
</script>

<template>
  <file-selector-dialog
      v-model:visible="openFileSelector"
      v-model:files="files"
      @ok="fileSelectorOK"
      @cancel="fileSelectorCancel"
  />
  <page-header v-model="repo"/>
  <a-scrollbar style="height: calc(100vh - 80px);overflow: auto">
    <div class="repo-input">
      <a-form :model="{}">
        <a-form-item label="仓库地址">
          <a-input v-model="repoUrl"/>
          <a-button class="btn" @click="loadRepo" :loading="isLoading" :disabled="building">加载</a-button>
        </a-form-item>
      </a-form>
    </div>
    <div class="container">
      <notice/>
      <div class="page-content">
        <a-card>
          <template v-if="repo !== ''" #title>
            {{ repo }}
          </template>
          <div style="padding: 15px; height: 10px">
            <fake-progress v-if="progress" v-model="building"/>
          </div>
          <div style="display: flex">
            <a-image :src="icon" style="margin: 10px;image-rendering: crisp-edges" :width="200" :height="200"/>
            <a-form :model="{}" :auto-label-width="true">
              <a-form-item label="选择模块">
                <a-select v-model="selectedModules" multiple @change="changeModules" :disabled="isLoading || building">
                  <div v-for="key in modules.keys()" :key="key">
                    <a-tooltip v-if="!!modules.get(key)?.description" :content="modules.get(key)?.description">
                      <a-option :value="key" :disabled="checkModuleDisabled(key)">
                        {{ modules.get(key)?.module_name }}
                      </a-option>
                    </a-tooltip>
                    <a-option v-else :value="key" :disabled="checkModuleDisabled(key)">
                      {{ modules.get(key)?.module_name }}
                    </a-option>
                  </div>
                </a-select>
              </a-form-item>
              <a-form-item label="选择合集">
                <a-select v-model="selectedSet" @change="changeSet" :disabled="isLoading || building">
                  <div v-for="key in sets.keys()" :key="key">
                    <a-tooltip v-if="!!sets.get(key)?.description" :content="sets.get(key)?.description">
                      <a-option :value="key">
                        {{ sets.get(key)?.set_name }}
                      </a-option>
                    </a-tooltip>
                    <a-option v-else :value="key">
                      {{ sets.get(key)?.set_name }}
                    </a-option>
                  </div>
                </a-select>
              </a-form-item>
              <div>
                <a-row>
                  <a-col :span="18">
                    <a-form-item label="选择版本">
                      <a-select v-model="selectedMinecraft" :disabled="isLoading || building" allow-search>
                        <div v-for="(value,key) in minecraft_version" :key="key">
                          <a-option v-show="showSnapshot || value.type == 'release'" :value="key" :label="key">
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
                      <a-checkbox v-model="showSnapshot"/>
                    </a-form-item>
                  </a-col>
                </a-row>
              </div>
              <div>
                <a-row>
                  <a-col :span="18">
                    <a-form-item label="选择类型">
                      <a-select v-model="selectedType" :disabled="isLoading || building">
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
                      <a-checkbox v-model="buildToMod"/>
                    </a-form-item>
                  </a-col>
                </a-row>
              </div>
              <a-button @click="build" :loading="building">构建</a-button>
            </a-form>
          </div>
          <a-divider/>
          <markdown-view v-model="readme"/>
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
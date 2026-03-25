<script setup lang="ts">
import {reactive, ref} from "vue";
import {Message} from "@/scripts/message";
import MarkdownView from "@/components/MarkdownView.vue";
import {Proxy} from "@/scripts/util";
import {Builder} from "@/scripts/builder";
import mc_version from '@/minecraft_version.json'
import FakeProgress from "@/components/FakeProgress.vue";
import Notice from "@/components/Notice.vue";
import PageHeader from "@/components/PageHeader.vue";
import FileSelectorDialog from "@/components/FileSelectorDialog.vue";
import {Project} from "@/scripts/project/project.ts";

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
const useProxy = Proxy.useProxy

interface Status {
  repo: string
  project?: Project
  loading: boolean
  loaded: boolean
  selectedModules: string[]
  selectedSet?: string
  selectedMinecraft: string
  showSnapshot: boolean
  type: "all" | "resource" | "data"
  buildToMod: boolean
  building: boolean
  progress: boolean
  openFileSelector: boolean
  files: File[]
}

const status: Status = reactive({
  repo: "",
  project: undefined,
  loading: false,
  loaded: false,
  selectedModules: [],
  selectedSet: undefined,
  selectedMinecraft: "1.21.11",
  showSnapshot: false,
  type: "all",
  buildToMod: false,
  building: false,
  progress: false,
  openFileSelector: false,
  files: []
})

function resetStatus() {
  status.project = undefined
  status.loading = false
  status.loaded = false
  status.repo = ""
  status.selectedModules = []
  status.selectedSet = undefined
  status.selectedMinecraft = "1.21.11"
  status.showSnapshot = false
  status.type = "all"
  status.buildToMod = false
  status.building = false
  status.progress = false
  status.openFileSelector = false
  status.files = []
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
    status.project = reactive(new Project(status.repo))
    const urlPrefix = window.location.href.split('/#/')[0]
    history.pushState(null, '', `${urlPrefix}#/${status.repo}`)
    status.project.loadRepo().then(() => {
      status.loaded = true
      status.loading = false
      Message.success("加载成功")
    }).catch(e => {
      console.error(e)
      resetStatus()
    })
  } catch (e: any) {
    console.error(e)
    resetStatus()
  }
}

function changeModules(e: string[]) {
  status.selectedSet = undefined
  for (const moduleKey of e) {
    selectWithBindings(moduleKey)
  }
}

function changeSet() {
  if (status.selectedSet == undefined) return
  status.selectedModules = status.project?.sets.get(status.selectedSet)?.modules.map(module => {
    const basePath = Builder.getBasePath(status.project?.config!)
    return `${basePath}/${module}`
  }) || []
}

function checkModuleDisabled(key: string) {
  const basePath = Builder.getBasePath(status.project?.config!)
  const self = status.project?.modules.get(key)
  if (self == undefined) return true
  for (const subKey of status.selectedModules) {
    for (let breakKey of self.breaks) {
      breakKey = `${basePath}/${breakKey}`
      if (subKey == breakKey) return true
    }
    const sub = status.project?.modules.get(subKey)
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
  const basePath = Builder.getBasePath(status.project?.config!)
  const self = status.project?.modules.get(key)
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
  status.building = true
  status.progress = true
  status.project?.build(status.type, status.selectedModules, status.selectedMinecraft, status.buildToMod).then(() => {
    status.building = false
    Message.success("构建成功")
  }).catch(e => {
    if (e == "should-open-file-selector") {
      console.warn(e)
      status.openFileSelector = true
      return
    }
    status.building = false
    Message.error("构建失败")
    console.error(e)
  })
}

async function fileSelectorOK() {
  status.openFileSelector = false
  status.progress = true
  status.project?.loadZip(status.files[0]).then(() => {
    status.project?.zipHandler(status.type, status.selectedModules, status.selectedMinecraft, status.buildToMod).then(() => {
      status.building = false
      Message.success("构建成功")
    }).catch(e => {
      status.building = false
      Message.error("构建失败")
      console.error(e)
    })
  }).catch(e => {
    status.building = false
    Message.error("构建失败")
    console.error(e)
  })
}

function fileSelectorCancel() {
  status.openFileSelector = false
  if (!status.building) {
    status.progress = false
  }
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
  <a-scrollbar class="page-scroll">
    <div class="repo-input">
      <a-form :model="{}">
        <a-form-item label="仓库地址">
          <div class="repo-form-row">
            <a-input v-model="repoUrl" class="repo-url-input"/>
            <a-button class="btn" @click="loadRepo" :loading="status.loading" :disabled="status.building">加载</a-button>
            <a-checkbox v-model="useProxy"/>
            <div class="proxy-label">使用代理</div>
          </div>
        </a-form-item>
      </a-form>
    </div>
    <div class="container">
      <div class="notice-area">
        <notice/>
      </div>
      <div class="page-content">
        <a-card>
          <template v-if="status.repo !== ''" #title>
            {{ status.repo }}
          </template>
          <div class="progress-wrap">
            <fake-progress v-if="status.progress" v-model="status.building"/>
          </div>
          <div class="project-config">
            <a-image :src="status.project?.icon" class="project-icon"/>
            <a-form :model="{}" :auto-label-width="true" class="config-form">
              <a-form-item label="选择模块">
                <a-select v-model="status.selectedModules" multiple @change="changeModules"
                          :disabled="status.building || !status.loaded">
                  <div v-for="key in status.project?.moduleKeys()" :key="key">
                    <a-tooltip v-if="!!status.project?.modules.get(key)?.description"
                               :content="status.project?.modules.get(key)?.description">
                      <a-option :value="key" :disabled="checkModuleDisabled(key)">
                        {{ status.project?.modules.get(key)?.module_name }}
                      </a-option>
                    </a-tooltip>
                    <a-option v-else :value="key" :disabled="checkModuleDisabled(key)">
                      {{ status.project?.modules.get(key)?.module_name }}
                    </a-option>
                  </div>
                </a-select>
              </a-form-item>
              <a-form-item label="选择合集">
                <a-select v-model="status.selectedSet" @change="changeSet"
                          :disabled="status.building || !status.loaded">
                  <div v-for="key in status.project?.sets.keys()" :key="key">
                    <a-tooltip v-if="!!status.project?.sets.get(key)?.description"
                               :content="status.project?.sets.get(key)?.description">
                      <a-option :value="key">
                        {{ status.project?.sets.get(key)?.set_name }}
                      </a-option>
                    </a-tooltip>
                    <a-option v-else :value="key">
                      {{ status.project?.sets.get(key)?.set_name }}
                    </a-option>
                  </div>
                </a-select>
              </a-form-item>
              <div>
                <a-row :gutter="12">
                  <a-col :xs="24" :sm="18">
                    <a-form-item label="选择版本">
                      <a-select v-model="status.selectedMinecraft" :disabled="status.building || !status.loaded"
                                allow-search>
                        <div v-for="(value,key) in minecraft_version" :key="key">
                          <a-option v-show="status.showSnapshot || value.type == 'release'" :value="key" :label="key">
                            <a-tag class="page-tag version-tag">
                              {{ key }}
                            </a-tag>
                            <a-tag class="page-tag pack-tag" color="red">
                              资源包：{{ value.resources_version }}
                            </a-tag>
                            <a-tag class="page-tag pack-tag" color="blue">
                              数据包：{{ value.datapack_version }}
                            </a-tag>
                          </a-option>
                        </div>
                      </a-select>
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="6">
                    <a-form-item class="right-option" label="显示快照">
                      <a-checkbox v-model="status.showSnapshot" :disabled="status.building || !status.loaded"/>
                    </a-form-item>
                  </a-col>
                </a-row>
              </div>
              <div>
                <a-row :gutter="12">
                  <a-col :xs="24" :sm="18">
                    <a-form-item label="选择类型">
                      <a-select v-model="status.type" :disabled="status.building || !status.loaded">
                        <a-option value="all">全部</a-option>
                        <a-option value="resource">资源包</a-option>
                        <a-option value="data">数据包</a-option>
                      </a-select>
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="6">
                    <a-form-item class="right-option">
                      <template #label>
                        <a-tooltip>
                          <template #content>
                            构建为模组，可在Fabric/Quilt/Forge/Neoforge中加载
                          </template>
                          <icon-question-circle-fill/>
                        </a-tooltip>
                        构建模组
                      </template>
                      <a-checkbox v-model="status.buildToMod" :disabled="status.building || !status.loaded"/>
                    </a-form-item>
                  </a-col>
                </a-row>
              </div>
              <a-button @click="build" :loading="status.building" :disabled="status.building || !status.loaded">构建
              </a-button>
            </a-form>
          </div>
          <a-divider/>
          <markdown-view v-if="status.loaded" v-model="status.project!.readme"/>
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
root {
  min-width: 432px;
}

.page-scroll {
  height: calc(100dvh - 80px);
  overflow: auto;
}

.page-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 40px;
}

.repo-input {
  width: min(1200px, 100%);
  margin: 0 auto;
  padding: 0 20px;
  box-sizing: border-box;
}

.repo-form-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.repo-url-input {
  flex: 1;
  min-width: 0;
}

.proxy-label {
  white-space: nowrap;
  margin-left: 8px;
}

.container {
  display: flex;
  width: min(1900px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
}

.page-content {
  flex: 1;
  min-width: 0;
  margin: 20px;
  display: inline-block;
}

.progress-wrap {
  padding: 15px;
  height: 10px;
}

.project-config {
  display: flex;
  gap: 12px;
}

.project-icon {
  margin: 10px;
  image-rendering: crisp-edges;
  width: 200px;
  height: 200px;
  flex-shrink: 0;
}

.config-form {
  flex: 1;
  min-width: 0;
}

.btn {
  margin-left: 10px;
  margin-right: 10px;
}

.page-tag {
  margin-right: 6px;
  margin-left: 0;
}

.version-tag {
  min-width: 140px;
}

.pack-tag {
  min-width: 98px;
}

.right-option {
  margin-left: 20px;
}

@media (max-width: 1200px) {
  .container {
    display: flex;
    flex-direction: column;
  }

  .page-content {
    order: 1;
    margin-top: 0;
  }

  .notice-area {
    order: 2;
  }
}

@media (max-width: 816px) {
  .repo-input {
    padding: 0 12px;
  }

  .repo-form-row {
    flex-wrap: wrap;
    row-gap: 8px;
  }

  .btn {
    margin-left: 0;
    margin-right: 8px;
  }

  .container {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .page-content {
    order: 1;
    margin: 20px 0;
  }

  .notice-area {
    order: 2;
  }

  .project-config {
    flex-direction: column;
    align-items: center;
  }

  .project-icon {
    width: 140px;
    height: 140px;
    margin: 0;
  }

  .config-form {
    width: 100%;
  }

  .version-tag,
  .pack-tag {
    min-width: 0;
  }

  .right-option {
    margin-left: 0;
  }
}
</style>
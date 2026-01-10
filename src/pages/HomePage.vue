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
  icon: string
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
  icon: "",
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
  status.icon = ""
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
                <a-row>
                  <a-col :span="18">
                    <a-form-item label="选择版本">
                      <a-select v-model="status.selectedMinecraft" :disabled="status.building || !status.loaded"
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
                      <a-checkbox v-model="status.showSnapshot" :disabled="status.building || !status.loaded"/>
                    </a-form-item>
                  </a-col>
                </a-row>
              </div>
              <div>
                <a-row>
                  <a-col :span="18">
                    <a-form-item label="选择类型">
                      <a-select v-model="status.type" :disabled="status.building || !status.loaded">
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
          <markdown-view v-if="status.loaded" v-model="status.project.readme"/>
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
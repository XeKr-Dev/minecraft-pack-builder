<script setup lang="ts">
import {onMounted, type Ref, ref} from "vue";
import {IconSunFill, IconMoonFill} from "@arco-design/web-vue/es/icon";
import {Message} from "@/scripts/message";
import MarkdownView from "@/components/MarkdownView.vue";
import {GithubAPI} from "@/scripts/github";
import {btou} from "@/scripts/util";
import type {ConfigJson, ModuleConfigJson, SetConfigJson} from "@/scripts/type";
import {Builder} from "@/scripts/builder";
import {saveAs} from 'file-saver';

function getUrl() {
  return window.location.href.split('/#/')[1] || 'XeKr-Dev/minecraft-pack-template'
}

const repoUrl = ref(`https://github.com/${getUrl()}`)
const dark = ref(false)

function mounted() {
  const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
  dark.value = darkThemeMq.matches
  changeTheme()
  darkThemeMq.addEventListener('change', e => {
    dark.value = e.matches;
    changeTheme()
  });
}

onMounted(mounted)

function click() {
  dark.value = !dark.value
  changeTheme()
}

function changeTheme() {
  if (dark.value) {
    window.document.body.setAttribute('arco-theme', 'dark')
  } else {
    window.document.body.removeAttribute('arco-theme');
  }
}

const isLoaded = ref(false)
const isLoading = ref(false)
const repo = ref("")
const readme = ref("")
const config: Ref<ConfigJson> = ref({} as ConfigJson)
const modules: Ref<Map<string, ModuleConfigJson>> = ref(new Map())
const sets: Ref<Map<string, SetConfigJson>> = ref(new Map())
const selectedModules: Ref<string[]> = ref([])
const selectedSet: Ref<string | undefined> = ref(undefined)
const building = ref(false)

async function loadRepo() {
  try {
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
    const readmeData = await GithubAPI.getRepoReadme(repo.value)
    readme.value = btou(readmeData.content)
    const configData = await GithubAPI.getRepoContents(repo.value, "config.json")
    config.value = JSON.parse(btou(configData.content)) as ConfigJson
    await loadModules()
    await loadSets()
    isLoaded.value = true
    isLoading.value = false
    Message.success("加载成功")
  } catch (e: any) {
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

async function loadModules() {
  const basePath = Builder.getBasePath(config.value)
  const data = await GithubAPI.getRepoContents(repo.value, basePath)
  for (const path of data) {
    if (path.name == config.value.main_module) {
      continue
    }
    GithubAPI.getRepoContents(repo.value, path.path + "/module.config.json").then(data => {
      modules.value.set(path.path as string, JSON.parse(btou(data.content)) as ModuleConfigJson)
    })
  }
}

async function loadSets() {
  const setsPath = config.value.sets_path
  const data = await GithubAPI.getRepoContents(repo.value, setsPath)
  for (const path of data) {
    const setConfigData = await GithubAPI.getRepoContents(repo.value, path.path)
    const configJson = JSON.parse(btou(setConfigData.content)) as SetConfigJson
    sets.value.set(configJson.set_name, configJson)
  }
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

const ghp = ref("")

function login() {
  localStorage.setItem("ghp", ghp.value)
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
  const mods: Map<string, number> = new Map()
  for (const key of selectedModules.value) {
    const value = modules.value.get(key)
    if (value == undefined) continue
    mods.set(key, value.weight)
  }
  building.value = true
  Builder.build(repo.value, config.value, mods).then((blob) => {
    building.value = false
    Message.success("构建成功")
    saveAs(blob, `${config.value.pack_name}-${config.value.version}.zip`)
  })
}

</script>

<template>
  <a-page-header :show-back="false">
    <template #title>
      我的世界资源包/数据包构建
    </template>
    <template #subtitle>
      {{ repo }}
    </template>
    <template #extra>
      <a-button class="btn" shape="circle" @click="click">
        <IconMoonFill v-if="dark"/>
        <IconSunFill v-else/>
      </a-button>
      <a-dropdown>
        <a-button class="btn">登录</a-button>
        <template #content>
          <a-input placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" v-model="ghp"/>
          <a-doption @click="login">确认</a-doption>
        </template>
      </a-dropdown>
    </template>
  </a-page-header>
  <div class="repo-input">
    <a-form :model="{}">
      <a-form-item label="仓库地址">
        <a-input v-model="repoUrl"/>
        <a-button class="btn" @click="loadRepo" :loading="isLoading" :disabled="building">加载</a-button>
      </a-form-item>
    </a-form>
  </div>
  <div class="container">
    <div class="notice-content">
      <a-card>
        <template #title>
          公告
        </template>
        本系统基于 <code>GitHub API</code> 实现，由于未登录用户访问限制每小时仅能发起 <code>60</code> 个 请求，请先在
        <a-link href="https://github.com/settings/tokens/new" target="_blank"><code>GitHub</code></a-link>
        上创建一个 <code>Personal Access Token</code> ，并于右上角登录，
        需勾选的权限为： <code>public_repo</code> 与 <code>read:project</code> ，本系统没有后端，
        <code>Personal Access Token</code> 在本地存储，具体可通过 <code>Ctrl + Shift + I</code> 打开开发者工具查看
        <code>网络通信</code> ，我方承诺不会发起除 <code>Github API</code> 之外的网络请求。
        <a-divider/>
        使用 <code>https://build.xekr.dev/#/USER/REPO</code> 分享构建页面，可以携带仓库信息，方便链接获得者快速构建
      </a-card>
    </div>
    <div class="page-content">
      <a-card>
        <template v-if="repo !== ''" #title>
          {{ repo }}
        </template>
        <a-form :model="{}">
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
          <a-button @click="build" :loading="building">构建</a-button>
        </a-form>
        <a-divider/>
        <markdown-view v-model="readme"/>
      </a-card>
    </div>
  </div>
</template>

<style scoped>
.repo-input {
  display: block;
  padding-right: 200px;
  padding-left: 200px;
  min-width: 445px;
}

.container {
  display: flex;
}

.notice-content {
  min-width: 300px;
  width: calc(100vw - 1880px);
  margin: 20px;
  display: inline-block;
  line-height: 2;
}

.notice-content code {
  background-color: var(--color-bg-5);
  padding: 0.2em 0.4em;
  border-radius: 4px;
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
</style>
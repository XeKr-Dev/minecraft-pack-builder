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

const repoUrl = ref('https://github.com/XeKr-Dev/minecraft-pack-template')
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
const repo = ref("")
const readme = ref("")
const config: Ref<ConfigJson> = ref({} as ConfigJson)
const modules: Ref<Map<string, ModuleConfigJson>> = ref(new Map())
const sets: Ref<Map<string, SetConfigJson>> = ref(new Map())
const selectedModules: Ref<string[]> = ref([])
const selectedSet: Ref<string | undefined> = ref(undefined)
const building = ref(false)

function loadRepo() {
  isLoaded.value = false
  config.value = {} as ConfigJson
  modules.value = new Map()
  sets.value = new Map()
  selectedModules.value = []
  selectedSet.value = undefined
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

  GithubAPI.getRepoReadme(repo.value).then(data => {
    readme.value = btou(data.content)
  })

  GithubAPI.getRepoContents(repo.value, "config.json").then(data => {
    config.value = JSON.parse(btou(data.content)) as ConfigJson
    loadModules()
    loadSets()
  })
  isLoaded.value = true
}

function loadModules() {
  const basePath = Builder.getBasePath(config.value)
  GithubAPI.getRepoContents(repo.value, basePath).then(data => {
    for (const path of data) {
      if (path.name == config.value.main_module) {
        continue
      }
      GithubAPI.getRepoContents(repo.value, path.path + "/module.config.json").then(data => {
        modules.value.set(path.path as string, JSON.parse(btou(data.content)) as ModuleConfigJson)
      })
    }
  })
}

function loadSets() {
  const setsPath = config.value.sets_path
  GithubAPI.getRepoContents(repo.value, setsPath).then(data => {
    for (const path of data) {
      GithubAPI.getRepoContents(repo.value, path.path).then(data => {
        const configJson = JSON.parse(btou(data.content)) as SetConfigJson
        sets.value.set(configJson.set_name, configJson)
      })
    }
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
  <div class="page-content">
    <a-form :model="{}">
      <a-form-item label="仓库地址">
        <a-input v-model="repoUrl"/>
        <a-button class="btn" @click="loadRepo">加载</a-button>
      </a-form-item>
    </a-form>
    <a-card>
      <a-form :model="{}">
        <a-form-item label="选择模块">
          <a-select v-model="selectedModules" multiple @change="changeModules">
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
          <a-select v-model="selectedSet" @change="changeSet">
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
</template>

<style scoped>
.page-content {
  padding-left: 200px;
  padding-right: 200px;
}

.btn {
  margin-left: 10px;
  margin-right: 10px;
}
</style>
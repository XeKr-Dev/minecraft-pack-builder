<script setup lang="ts">
import {onMounted, ref} from "vue";
import {Message} from "@/scripts/message";
import {setLocale, type Locale} from "@/i18n";
import {useI18n} from "vue-i18n";

const repo = defineModel()
const dark = ref(false)
const {t} = useI18n()

function click() {
  dark.value = !dark.value
  changeTheme()
}

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

function changeTheme() {
  if (dark.value) {
    window.document.body.setAttribute('arco-theme', 'dark')
  } else {
    window.document.body.removeAttribute('arco-theme');
  }
}

const ghp = ref("")

function login() {
  localStorage.setItem("ghp", ghp.value)
  Message.success(t("header.tokenSaved"))
}

const copied = ref(false)

function copyLink() {
  copied.value = true
  navigator.clipboard.writeText(window.location.href)
}

function changeLocale(value: string | number | Record<string, any> | undefined) {
  if (value === 'zh-CN' || value === 'en-US') {
    setLocale(value as Locale)
  }
}
</script>

<template>
  <a-page-header class="page-header" :show-back="false">
    <template #title>
      <div class="header-title">
        <img class="header-icon" src="/icon.svg" alt="icon"/>
        <p class="header-text">{{ t("header.title") }}</p>
      </div>
    </template>
    <template #subtitle>
      {{ repo }}
    </template>
    <template #extra>
      <div class="header-extra">
        <a-tooltip>
          <template #content>
            {{ copied ? t("header.copied") : t("header.share") }}
          </template>
          <a-link>
            <icon-share-alt size="large" @click="copyLink" @mouseleave="copied=false"/>
          </a-link>
        </a-tooltip>
        <a-tooltip>
          <template #content>
            {{ t("header.feedback") }}
          </template>
          <a-link href="https://qm.qq.com/q/63zITa0qfS" target="_blank">
            <icon-at size="large"/>
          </a-link>
        </a-tooltip>
        <a-tooltip>
          <template #content>
            {{ t("header.source") }}
          </template>
          <a-link href="https://github.com/XeKr-Dev/minecraft-pack-builder" target="_blank">
            <icon-github size="large"/>
          </a-link>
        </a-tooltip>
        <a-button class="btn" shape="circle" @click="click">
          <icon-moon-fill v-if="dark"/>
          <icon-sun-fill v-else/>
        </a-button>
        <a-dropdown @select="changeLocale">
          <a-button class="btn" shape="circle"><icon-language /></a-button>
          <template #content>
            <a-doption value="zh-CN">{{ t("common.chinese") }}</a-doption>
            <a-doption value="en-US">{{ t("common.english") }}</a-doption>
          </template>
        </a-dropdown>
        <a-dropdown>
          <a-button class="btn">{{ t("common.login") }}</a-button>
          <template #content>
            <a-input placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" v-model="ghp"/>
            <a-doption @click="login">{{ t("common.confirm") }}</a-doption>
          </template>
        </a-dropdown>
      </div>
    </template>
  </a-page-header>
</template>

<style scoped>
.header-title {
  display: flex;
  align-items: center;
}

.header-icon {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  margin-right: 1rem;
}

.header-text {
  display: inline-block;
  margin: 0;
}

.header-extra {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btn {
  margin-left: 10px;
  margin-right: 10px;
}

.locale-select {
  width: 92px;
  margin-left: 10px;
}

.page-header {
  min-height: 48px;
}

@media (max-width: 768px) {
  .header-title {
    min-width: 0;
  }

  .header-icon {
    margin-right: 0.5rem;
  }

  .header-text {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-extra {
    justify-content: flex-start;
    row-gap: 6px;
  }

  .btn {
    margin-left: 6px;
    margin-right: 0;
  }

  .locale-select {
    margin-left: 6px;
  }
}

@media (max-width: 424px) {
  .header-text {
    display: none;
  }
}
</style>

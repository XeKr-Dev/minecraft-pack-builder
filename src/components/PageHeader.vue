<script setup lang="ts">
import {onMounted, ref} from "vue";
import {Message} from "@/scripts/message";

const repo = defineModel()
const dark = ref(false)

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
  Message.success("Token 设置成功")
}
</script>

<template>
  <a-page-header :show-back="false">
    <template #title>
      资源包/数据包构建
    </template>
    <template #subtitle>
      {{ repo }}
    </template>
    <template #extra>
      <a-link href="https://github.com/XeKr-Dev/minecraft-pack-builder" target="_blank">
        <icon-github size="large"/>
      </a-link>
      <a-button class="btn" shape="circle" @click="click">
        <icon-moon-fill v-if="dark"/>
        <icon-sun-fill v-else/>
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
</template>

<style scoped>
.btn {
  margin-left: 10px;
  margin-right: 10px;
}
</style>
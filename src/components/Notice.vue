<script setup lang="ts">

</script>

<template>
  <div class="notice-content">
    <a-card>
      <template #title>
        公告
      </template>
      本页面是一个 <code>纯静态页面</code> ，部署于 <code>GitHub Pages</code>
      <a-divider/>
      本系统基于 <code>GitHub API</code> 实现，由于未登录用户访问限制每小时仅能发起 <code>60</code> 个 请求，请先在
      <a-tooltip>
        <template #content>
          前往创建 Personal Access Token
        </template>
        <a-link href="https://github.com/settings/tokens/new" target="_blank"><code>GitHub</code></a-link>
      </a-tooltip>
      上创建一个 <code>Personal Access Token</code> ，并于右上角登录，
      需勾选的权限为： <code>public_repo</code> 与 <code>read:project</code>
      <a-divider/>
      本系统没有后端，<code>Personal Access Token</code> 在本地存储， 具体可通过 <code>Ctrl + Shift + I</code>
      打开开发者工具查看 <code>网络通信</code> ，我方承诺不会发起除 <code>Github API</code> 之外的网络请求。
      <a-divider/>
      使用 <code>https://build.xekr.dev/#/USER/REPO</code> 分享构建页面，可以携带仓库信息，方便链接获得者快速构建
    </a-card>
    <a-card style="margin-top: 20px">
      <template #title>
        特别鸣谢
        <a-tooltip>
          <template #content>
            赞助我们
          </template>
          <a-link href="https://www.anvilcraft.dev/#/support" target="_blank">
            <icon-gift size="large"/>
          </a-link>
        </a-tooltip>
      </template>
      虚位以待...
    </a-card>
  </div>
</template>

<style scoped>
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
</style>
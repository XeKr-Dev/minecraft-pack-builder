<script setup lang="ts">
import {useI18n} from "vue-i18n";

const {t} = useI18n()
</script>

<template>
  <div class="notice-content">
    <a-card>
      <template #title>
        {{ t("notice.announcement") }}
      </template>
      {{ t("notice.staticPrefix") }} <code>{{ t("notice.staticPage") }}</code> {{ t("notice.staticSuffix") }} <code>GitHub Pages</code>
      <a-divider/>
      {{ t("notice.apiPrefix") }} <code>GitHub API</code> {{ t("notice.apiMiddle") }} <code>60</code> {{ t("notice.apiRequests") }}
      <a-tooltip>
        <template #content>
          {{ t("notice.tokenTooltip") }}
        </template>
        <a-link href="https://github.com/settings/tokens/new" target="_blank"><code>GitHub</code></a-link>
      </a-tooltip>
      {{ t("notice.tokenCreatePrefix") }} <code>Personal Access Token</code> {{ t("notice.tokenCreateSuffix") }}
      {{ t("notice.tokenScopesPrefix") }} <code>public_repo</code> / <code>read:project</code>
      <a-divider/>
      {{ t("notice.noBackendPrefix") }}<code>Personal Access Token</code> {{ t("notice.noBackendMiddle") }} <code>Ctrl + Shift + I</code>
      {{ t("notice.noBackendDevtools") }} <code>{{ t("notice.network") }}</code>{{ t("notice.noBackendSuffix") }} <code>GitHub API</code> {{ t("notice.noBackendEnd") }}
      <a-divider/>
      {{ t("notice.sharePrefix") }} <code>https://build.xekr.dev/#/USER/REPO</code> {{ t("notice.shareSuffix") }}
    </a-card>
    <a-card style="margin-top: 20px">
      <template #title>
        {{ t("notice.thanks") }}
        <a-tooltip>
          <template #content>
            {{ t("notice.sponsor") }}
          </template>
          <a-link href="https://www.anvilcraft.dev/posts/base-info/support_us.html" target="_blank">
            <icon-gift size="large"/>
          </a-link>
        </a-tooltip>
      </template>
      {{ t("notice.empty") }}
    </a-card>
  </div>
</template>

<style scoped>
.notice-content {
  width: 320px;
  max-width: calc(100% - 40px);
  margin: 20px 0 20px 20px;
  display: inline-block;
  line-height: 2;
}

.notice-content code {
  background-color: var(--color-bg-5);
  padding: 0.2em 0.4em;
  border-radius: 4px;
}

@media (max-width: 1200px) {
  .notice-content {
    width: auto;
    margin: 0 20px 0 20px;
    display: block;
  }
}

@media (max-width: 816px) {
  .notice-content {
    margin: 0;
    max-width: none;
  }
}
</style>

<script setup lang="ts">
import {type Ref, ref} from "vue";
import {Message} from "@/scripts/message";
import {Upload} from "@arco-design/web-vue";
import {useI18n} from "vue-i18n";

const visible = defineModel("visible", {
  type: Boolean,
  required: true
})
const files = defineModel("files", {
  type: Array<File>,
  required: false,
  default: () => []
})
const emits = defineEmits(["ok", "cancel"])
const uploadRef = ref<Upload>();
const fileList: Ref<{ file: File }[]> = ref([]);
const {t} = useI18n()

function onChange(fileList: { file: File }[]) {
  console.log(fileList)
  console.log(fileList[0].file)
  files.value = [fileList[0].file];
}

function ok() {
  console.log(files.value)
  if (
      !files.value[0]
      || (
          files.value[0].type !== "application/x-zip-compressed"
          && files.value[0].type !== "application/zip"
      )
  ) {
    Message.error(t("fileSelector.invalidZip"))
    return
  }
  emits("ok", files.value[0])
}
</script>

<template>
  <a-modal v-model:visible="visible" @ok="ok" @cancel="emits('cancel')">
    <template #title>
      {{ t("fileSelector.title") }}
    </template>
    <a-upload
        draggable
        :file-list="fileList"
        action="/"
        :limit="1"
        :auto-upload="false"
        :show-retry-button="false"
        :show-cancel-button="false"
        ref="uploadRef"
        @change="onChange"
        :custom-request="()=>{}"
        :tip="t('fileSelector.tip')"
    />
  </a-modal>
</template>

<style scoped>

</style>

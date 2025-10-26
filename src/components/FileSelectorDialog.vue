<script setup lang="ts">
import {type Ref, ref} from "vue";
import {Message} from "@/scripts/message";
import {Upload} from "@arco-design/web-vue";

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
    Message.error("请选择 ZIP 文件")
    return
  }
  emits("ok", files.value[0])
}
</script>

<template>
  <a-modal v-model:visible="visible" @ok="ok" @cancel="emits('cancel')">
    <template #title>
      正在下载仓库 ZIP 包
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
        tip="请将下载到的仓库 ZIP 包拖拽到此处"
    />
  </a-modal>
</template>

<style scoped>

</style>
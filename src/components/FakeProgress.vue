<script setup lang="ts">
import {onMounted, ref} from "vue";

const processing = defineModel({
  type: Boolean
})

let process = 0
const percent = ref(0)

function mounted() {
  setInterval(() => {
    if (processing.value) {
      process += 1
    } else {
      process = 0
    }
    percent.value = getProcess(process) * 100
  }, 1)
}

onMounted(mounted)

function getProcess(process: number) {
  let pro = 0.99 * (1 - Math.exp(-0.1 * process / 100 / 60))
  pro = Math.min(pro, 0.9999)
  if (!processing.value) {
    return 1.0
  }
  return pro;
}
</script>

<template>
  <a-progress
      class="progress"
      :percent="percent"
      :color="{
        '0%': 'rgb(var(--primary-6))',
        '100%': 'rgb(var(--success-6))',
      }"
      :show-text="false"
  />
  <div class="percent">
    {{ (percent * 100).toFixed(2) }}%
  </div>
</template>

<style scoped>
.progress {
  width: calc(100% - 3.5rem);
}

.percent {
  display: inline-flex;
  width: 2.5rem;
  margin-left: 1rem;
}
</style>
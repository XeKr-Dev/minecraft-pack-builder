<script setup lang="ts">
import {onMounted, ref} from "vue";

const processing = defineModel({
  type: Boolean
})

const process = ref(0)

function mounted() {
  setInterval(() => {
    if (processing.value) {
      process.value += 1
    } else {
      process.value = 0
    }
  }, 100)
}

onMounted(mounted)

function getProcess() {
  let pro = 0.99 * (1 - Math.exp(-0.1 * process.value / 60))
  pro = Number.parseFloat(pro.toFixed(2))
  pro = Math.min(pro, 0.99)
  if (!processing.value) {
    return 1.0
  }
  return pro;
}
</script>

<template>
  <a-progress
      :percent="getProcess()"
      :color="{
        '0%': 'rgb(var(--primary-6))',
        '100%': 'rgb(var(--success-6))',
      }"
  />
</template>

<style scoped>

</style>
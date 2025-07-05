<script setup lang="ts">
import {onMounted, ref} from "vue";

const processing = defineModel({
  type: Boolean
})

let process = 0
const percent = ref(0)
let lastTime = Date.now()

function mounted() {
  setInterval(() => {
    if (processing.value) {
      const nowTime = Date.now()
      process += nowTime - lastTime
      lastTime = nowTime
    } else {
      process = 0
      lastTime = Date.now()
    }
    percent.value = getProcess(process)
  }, 1)
}

onMounted(mounted)

function getProcess(process: number) {
  if (!processing.value) {
    return 1.0
  }
  let pro = 0;
  // 1500 20% 15000 50% 30000 99.99%
  if (process < 15000) {
    pro = process / 15000 * 0.2;
  } else if (process < 150000) {
    pro = (process - 15000) / 150000 * 0.3 + 0.2;
  } else {
    pro = (process - 15000) / 300000 * 0.4 + 0.5;
  }
  pro = Math.min(pro, 0.9999)
  return pro;
}
</script>

<template>
  <div class="fake-progress">
    <div :class="`fake-progress-inner fake-progress-${processing ? 'processing' : 'success'}`"/>
  </div>
  <div class="percent">
    {{ (percent * 100).toFixed(2) }}%
  </div>
</template>

<style scoped>

@keyframes progress {
  0% {
    width: 0;
  }
  5% {
    width: 20%;
  }
  50% {
    width: 50%;
  }
  100% {
    width: 99%;
  }
}

.fake-progress {
  display: inline-flex;
  width: calc(100% - 3.5rem);
  height: 5px;
  border-radius: 2px;
  background: rgb(var(--gray-3));
}

.fake-progress-inner {
  height: 5px;
  background: linear-gradient(to right, rgb(var(--primary-6)), rgb(var(--success-6)));
  border-radius: 2px;
}

.fake-progress-processing {
  animation: progress 300s;
}

.fake-progress-success {
  width: 100%;
}

.percent {
  display: inline-flex;
  width: 2.5rem;
  margin-left: 1rem;
}
</style>
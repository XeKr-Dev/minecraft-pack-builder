<script setup lang="ts">
import {marked} from "marked";
import DOMPurify from 'dompurify'
import {onMounted, watch} from "vue";
import "github-markdown-css/github-markdown.css"

const model = defineModel({
  type: String,
  default: ''
})

function decode() {
  const mark = marked.parse(model.value || '')
  const showMark = document.getElementById('showMark')
  if (!showMark) return;
  if (typeof (mark) === 'string') {
    showMark.innerHTML = DOMPurify.sanitize(mark)
  } else {
    mark.then(mk => {
      showMark.innerHTML = DOMPurify.sanitize(mk)
    })
  }
}

function mounted() {
  decode()
}

onMounted(mounted)
watch(model, decode)
</script>

<template>
  <article id="showMark" class="markdown-body"/>
</template>

<style scoped>
.markdown-body {
  padding: 15px;
}
</style>
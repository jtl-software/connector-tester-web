<script>
import {store} from "@/store";
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

export default {
  data() {
    return {
      store
    }
  },
  components: {
    VueJsonPretty
  },
  methods: {
    copy() {
      navigator.clipboard.writeText(JSON.stringify(store.resultData, undefined, 2))
    }
  }
}
</script>
<template>
  <ul class="nav nav-tabs" id="resultsTab" role="tablist">
    <li class="nav-item" role="presentation">
      <button class="nav-link active" id="rawResultsTab" data-bs-toggle="tab" data-bs-target="#rawResults" type="button" role="tab" aria-controls="rawResults" aria-selected="true">Results Raw</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="treeResultsTab" data-bs-toggle="tab" data-bs-target="#treeResults" type="button" role="tab" aria-controls="treeResults" aria-selected="false">Results Tree</button>
    </li>
  </ul>
  <div class="tab-content form-control overflow-scroll p-1" id="myTabContent" style="height: 32em">
    <div class="tab-pane show active position-relative" id="rawResults" role="tabpanel" aria-labelledby="rawResults" tabindex="0">
      <button class="btn btn-outline-secondary position-absolute end-0 m-3" type="button" @click="copy">Copy</button>
      <pre>{{store.resultData}}</pre>
    </div>
    <div class="tab-pane position-relative" id="treeResults" role="tabpanel" aria-labelledby="treeResults" tabindex="0" >
      <button class="btn btn-outline-secondary position-absolute end-0 m-3 z-3" type="button" @click="copy">Copy</button>
      <vue-json-pretty :data="store.resultData" :showLine="false" :showIcon="true" :showLength="true" :deep="3"></vue-json-pretty>
    </div>
  </div>
</template>

<style>
.vjs-tree-node.is-highlight, .vjs-tree-node:hover {
  background-color: rgba(168, 181, 193, 0.3);
}
</style>
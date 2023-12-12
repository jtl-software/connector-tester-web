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
    async copy(textToCopy) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(JSON.stringify(textToCopy, undefined, 2));
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = JSON.stringify(textToCopy, undefined, 2);
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();

        try {
          document.execCommand('copy');
        } catch (error) {
          console.error(error);
        } finally {
          textArea.remove();
        }
      }
    },
    async copyToClipboard() {
      try {
        await this.copy(store.resultData);
      } catch (error) {
        console.error(error);
      }
    }
  },
}
</script>
<template>
  <ul class="nav nav-tabs" id="resultsTab" role="tablist">
    <li class="nav-item" role="presentation">
      <button class="nav-link active" id="rawResultsTab" data-bs-toggle="tab" data-bs-target="#rawResults" type="button"
              role="tab" aria-controls="rawResults" aria-selected="true">Results Raw
      </button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="treeResultsTab" data-bs-toggle="tab" data-bs-target="#treeResults" type="button"
              role="tab" aria-controls="treeResults" aria-selected="false">Results Tree
      </button>
    </li>
  </ul>
  <div class="position-relative" style="height: 32em">
    <div class="tab-content form-control overflow-scroll p-1 position-relative" id="myTabContent" style="height: 32em">
      <div class="tab-pane show active position-relative" id="rawResults" role="tabpanel" aria-labelledby="rawResults"
           tabindex="0">
        <button class="btn btn-outline-secondary position-absolute end-0 m-3" type="button" @click="copyToClipboard">
          Copy
        </button>
        <pre>{{ store.resultData }}</pre>
      </div>
      <div class="tab-pane position-relative" id="treeResults" role="tabpanel" aria-labelledby="treeResults"
           tabindex="0">
        <button class="btn btn-outline-secondary position-absolute end-0 m-3 z-3" type="button"
                @click="copyToClipboard">Copy
        </button>
        <vue-json-pretty :data="store.resultData" :showLine="false" :showIcon="true" :showLength="true"
                         :deep="3"></vue-json-pretty>
      </div>
    </div>
    <p class="position-absolute end-0 bottom-0 me-4">RequestTime: {{ store.requestTime }}ms</p>
  </div>
</template>

<style>
.vjs-tree-node.is-highlight, .vjs-tree-node:hover {
  background-color: rgba(168, 181, 193, 0.3);
}
</style>
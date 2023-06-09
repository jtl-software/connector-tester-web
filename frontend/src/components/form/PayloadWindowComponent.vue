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
          await this.copy(store.payload);
        } catch(error) {
          console.error(error);
        }
      }
    },
    computed: {
      payload() {
        let result = ''
        try {
          result = JSON.parse(store.payload)
        } catch (e) {
        }
        return result
      }
    }
  }
</script>

<template>
  <ul class="nav nav-tabs" id="payloadTab" role="tablist">
    <li class="nav-item" role="presentation">
      <button class="nav-link active" id="rawPayloadTab" data-bs-toggle="tab" data-bs-target="#rawPayload" type="button" role="tab" aria-controls="rawPayload" aria-selected="true">Payload Raw</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="treePayloadTab" data-bs-toggle="tab" data-bs-target="#treePayload" type="button" role="tab" aria-controls="treePayload" aria-selected="false">Payload Tree</button>
    </li>
  </ul>
  <div class="tab-content position-relative form-control overflow-scroll p-0" id="myTabContent" style="height: 32em">
    <button class="btn btn-outline-secondary position-absolute end-0 m-3 z-3" type="button" @click="copyToClipboard">Copy</button>
    <textarea class="tab-pane fade show active" id="rawPayload" role="textbox" aria-labelledby="rawPayload" tabindex="0" v-model="store.payload"></textarea>
    <div class="tab-pane fade" id="treePayload" role="tabpanel" aria-labelledby="treePayload" tabindex="0">
      <vue-json-pretty :data="payload" :showLine="false" :showIcon="true" :showLength="true" :deep="3"></vue-json-pretty>
    </div>
  </div>
</template>

<style>
textarea {
  resize: none !important;
  background-color: transparent;
  border: none;
  height: 30.9em;
  width: 100%;
  outline: 0;
  padding: 0;
}
</style>
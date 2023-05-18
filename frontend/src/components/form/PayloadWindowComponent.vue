<script>
  import {store} from "@/store";

  export default {
    data() {
      return {
        store
      }
    }
  }
</script>

<template>
  <div class="form-floating">
    <textarea class="form-control" id="payload" style="height: 32em" v-model="store.payload"></textarea>
    <label for="payload">Payload</label>
  </div>
</template>
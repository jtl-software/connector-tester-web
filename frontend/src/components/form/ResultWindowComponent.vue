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
    <textarea class="form-control" id="result" style="height: 32em" readonly>{{store.resultData}}</textarea>
    <label for="result">Result</label>
  </div>
</template>
<script>
import {store} from "@/store";
import InputComponent from "@/components/payload_generator/InputComponent.vue";

export default {
  data() {
    return {
      store
    }
  },
  components: {
    InputComponent
  },
  props: {
    jsonData: {}
  },
  methods: {
    closeModal() {
      this.$emit('closeModal')
    }
  }
}
</script>
<template>
  <InputComponent :data="jsonData" ref="InputComponent" />
  <div class="d-flex justify-content-end">
    <!-- Call submitForm Method from InputComponent via reference, emit event to close Modal -->
    <button class="btn btn-success mt-3" @click="$refs.InputComponent.submitForm(); closeModal();">Generate Payload</button>
  </div>
</template>
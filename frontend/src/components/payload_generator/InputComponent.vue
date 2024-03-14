<script>
import {store} from "@/store";

export default {
  data() {
    return {
      store
    }
  },
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  methods: {
    isObject(value) {
      return value && typeof value === 'object' && !Array.isArray(value);
    },
    submitForm() {
      this.store.payload = JSON.stringify(this.data, null, 2);
    },
    copyObject(index) {
      //make deep copy of given object
      const copiedObject = JSON.parse(JSON.stringify(this.data[index]))
      //push copied object to data object
      this.data.push(copiedObject)
    },
    removeObject(index) {
      this.data.splice(index, 1)
    }
  }
}
</script>

<template>
  <!-- Iterate through every value in data -->
  <div v-for="(value, key) in data">
    <!-- if value is a boolean, then create an input with type checkbox -->
    <div v-if="typeof value === 'boolean'" class="d-flex flex-row justify-content-between align-items-center mt-2">
      <p class="m-0">{{ typeof value }} {{ key }}</p>
      <input class="form-check-input" type="checkbox" :value="value" v-model="data[key]">
    </div>
    <!-- if value is a string, create an input with type text -->
    <div v-else-if="typeof value === 'string'" class="d-flex flex-row justify-content-between align-items-center mt-2">
      <!-- workaround for Identity Object -->
      <p class="m-0">{{ typeof value }} {{ key === 0 ? 'endpointId' : key }}</p>
      <input class="form-control form-control-sm" type="text" style="width: 40em" :value="value" v-model="data[key]">
    </div>
    <!-- if value is a number, create an input with type number -->
    <div v-else-if="typeof value === 'number'" class="d-flex flex-row justify-content-between align-items-center mt-2">
      <!-- workaround for Identity Object -->
      <p class="m-0">{{ typeof value }} {{ key === 1 ? 'hostId' : key }}</p>
      <input class="form-control form-control-sm" type="number" style="width: 40em" :value="value" v-model="data[key]">
    </div>
    <!-- for everything else, create a new InputComponent via recursion -->
    <div v-else-if="isObject(value)">
      <div class="d-flex align-items-center">
        <p class="m-0">object {{ key }}</p>
        <!-- only show delete button if there is more than one entry -->
        <button class="btn btn-danger py-0 px-2 ms-2" @click="removeObject(key)" v-if="key >= 0">-</button>
        <!-- only show add button on last entry -->
        <button class="btn btn-primary py-0 px-2 ms-2" @click="copyObject(key)" v-if="key === data.length - 1">+
        </button>
      </div>
      <div class="ms-5">
        <InputComponent :data="value"/>
      </div>
    </div>
    <div v-else>
      <p class="m-0">array {{ key }}</p>
      <div class="ms-5">
        <InputComponent :data="value"/>
      </div>
    </div>
  </div>
</template>
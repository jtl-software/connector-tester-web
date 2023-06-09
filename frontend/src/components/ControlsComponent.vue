<script>
import {store} from "@/store";
export default {
  data() {
    return {
      store
    }
  },
  computed: {
    postData() {
      return {
        connectorUrl: store.url,
        connectorToken: store.token,
        action: store.action,
        controller: store.controller,
        payload: store.payload,
        results: JSON.stringify(store.resultData)
      }
    },
  },
  methods: {
    async startPostRequest(url) {
      const message = this.axios.post(url, this.postData)
      store.resultData = (await message).data
    }
  }
}
</script>

<template>
  <div class="row ">
    <div class="col">
      <div class="d-flex justify-content-end">
        <div class="btn-group-vertical" role="group">
          <div class="btn-group" role="group">
            <button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" :disabled="!store.connected">
              Clear Linkings
            </button>
            <ul class="dropdown-menu w-100">
              <li class="mx-2">
                <div class="btn-group-vertical w-100">
                  <button class="btn btn-danger w-100" @click="startPostRequest('clearLinkings')">Clear all</button>
                  <button class="btn btn-primary w-100" @click="startPostRequest('clearLinkingsFromJson')">Clear from json</button>
                </div>
              </li>
            </ul>
          </div>
          <div class="btn-group" role="group">
            <button class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" :disabled="!store.connected">
              Dev Options
            </button>
            <ul class="dropdown-menu w-100">
              <li class="mx-2">
                <div class="btn-group-vertical w-100">
                  <button class="btn btn-warning w-100" @click="startPostRequest('triggerAck')">Trigger Ack</button>
                  <button class="btn btn-primary w-100" @click="startPostRequest('getSkeleton')">Get Skeleton</button>
                  <button class="btn btn-primary w-100" @click="startPostRequest('pushTest')">Push Test</button>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <button class="btn btn-lg btn-success ms-1" :disabled="!store.connected" @click="startPostRequest(store.action)">Trigger Action</button>
      </div>
    </div>
  </div>
</template>
<script>
import {store} from "@/store";
import ClearLinkingsModalComponent from "@/components/ClearLinkingsModalComponent.vue";
import PayloadGeneratorModal from "@/components/payload_generator/PayloadGeneratorModalComponent.vue";

export default {
  components: {
    PayloadGeneratorModal,
    ClearLinkingsModalComponent
  },
  data() {
    return {
      store,
      limit: 100,
      clearOption: ''
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
        results: JSON.stringify(store.resultData),
        limit: this.limit === '' ? 100 : this.limit
      }
    },
  },
  methods: {
    handleClearConfirmationEvent(data) {
      if (data) {
        this.startPostRequest(this.clearOption)
      }
    },
    async startPostRequest(url) {
      const message = this.axios.post(url, this.postData)
      store.resultData = (await message).data
      store.requestTime = parseFloat((await message).headers['x-request-time']).toFixed(2)
    }
  }
}
</script>

<template>
  <ClearLinkingsModalComponent @clearConfirmationEvent="handleClearConfirmationEvent"/>
  <PayloadGeneratorModal/>
  <div class="row ">
    <div class="col">
      <div class="d-flex justify-content-between">
        <div>
          <div class="input-group ms-4">
            <span class="input-group-text" id="limit">Limit</span>
            <input v-model="limit" type="number" class="form-control" aria-label="limit" aria-describedby="limit">
          </div>
        </div>
        <div class="d-flex flex-column flex-lg-row">
          <div class="btn-group-vertical" role="group">
            <div class="btn-group" role="group">
              <button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"
                      :disabled="!store.connected">
                Clear Linkings
              </button>
              <ul class="dropdown-menu w-100">
                <li class="mx-2">
                  <div class="btn-group-vertical w-100">
                    <button class="btn btn-danger w-100" data-bs-toggle="modal" data-bs-target="#clearLinkingsModal" @click="clearOption = 'clearLinkings'">Clear all</button>
                    <button class="btn btn-primary w-100" data-bs-toggle="modal" data-bs-target="#clearLinkingsModal" @click="clearOption = 'clearLinkingsFromJson'">Clear from json</button>
                    <button class="btn btn-primary w-100" data-bs-toggle="modal" data-bs-target="#clearLinkingsModal" @click="clearOption = 'clearControllerLinkings'">Clear Method</button>
                  </div>
                </li>
              </ul>
            </div>
            <div class="btn-group" role="group">
              <button class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"
                      :disabled="!store.connected">
                Dev Options
              </button>
              <ul class="dropdown-menu w-100">
                <li class="mx-2">
                  <div class="btn-group-vertical w-100">
                    <button class="btn btn-warning w-100" @click="startPostRequest('triggerAck')">Trigger Ack</button>
                    <button class="btn btn-primary w-100" @click="startPostRequest('getSkeleton')">Get Skeleton</button>
                    <button class="btn btn-primary w-100" @click="startPostRequest('pushTest')">Push Test</button>
                    <button class="btn btn-primary w-100" data-bs-toggle="modal" data-bs-target="#payloadModal">Generate Payload
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <button class="btn btn-lg btn-success ms-1 h-100" :disabled="!store.connected"
                  @click="startPostRequest(store.action)">Trigger Action
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
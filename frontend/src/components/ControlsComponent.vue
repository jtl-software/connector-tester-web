<script>
import {store} from "@/store";
export default {
  data() {
    return {
      url: 'http://connector-tester-web.jtl.test/action.php?XDEBUG_SESSION_START=PHPSTORM',
      store
    }
  },
  computed: {
    postData() {
      return {
        operation: '',
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
    async clearAllLinkings() {
      this.postData.operation = 'clearLinkings'
      await this.startPostRequest()
    },
    async clearLinkingsFromJson() {
      this.postData.operation = 'fromJson'
      await this.startPostRequest()
    },
    async triggerAck() {
      this.postData.operation = 'triggerAck'
      await this.startPostRequest()
    },
    async getSkeleton() {
      this.postData.operation = 'getSkeleton'
      await this.startPostRequest()
    },
    async pushTest() {
      this.postData.operation = 'pushTest'
      await this.startPostRequest()
    },
    async triggerAction() {
      this.postData.operation = 'triggerAction'
      await this.startPostRequest()
    },
    async startPostRequest() {
      const message = this.axios.post(this.url, this.postData)
      console.log(await message)
      store.resultData = (await message).data
    }
  }
}
</script>

<template>
  <div class="row">
    <div class="col">
      <div class="d-flex justify-content-end">
        <div class="btn-group" role="group">
          <div class="btn-group" role="group">
            <button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" :disabled="!store.connected">
              Clear Linkings
            </button>
            <ul class="dropdown-menu w-100">
              <li class="mx-2">
                <div class="btn-group-vertical w-100">
                  <button class="btn btn-danger w-100" @click="clearAllLinkings">Clear all</button>
                  <button class="btn btn-primary w-100" @click="clearLinkingsFromJson">Clear from json</button>
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
                  <button class="btn btn-warning w-100" @click="triggerAck">Trigger Ack</button>
                  <button class="btn btn-primary w-100" @click="getSkeleton">Get Skeleton</button>
                  <button class="btn btn-primary w-100" @click="pushTest">Push Test</button>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <button class="btn btn-lg btn-success ms-1" :disabled="!store.connected" @click="triggerAction">Trigger Action</button>
      </div>
    </div>
  </div>
</template>
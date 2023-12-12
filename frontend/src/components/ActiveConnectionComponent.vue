<script>
import {store} from "@/store";

export default {
  data() {
    return {
      credentials: {},
      selectedConnection: '',
      store
    }
  },
  methods: {
    async authenticate() {
      if (!this.store.connected) {
        const connection = JSON.parse(localStorage.getItem(this.selectedConnection))
        store.url = connection.url
        store.token = connection.token
        const message = await this.axios.post('/authenticate', {
          connectorUrl: store.url,
          connectorToken: store.token
        })

        //790 is the authentication failed error Code
        if (message.data.startsWith('Error:')) {
          this.store.resultData = (await message).data
          this.store.requestTime = parseFloat((await message).headers['x-request-time']).toFixed(2)
        } else {
          this.store.connected = !this.store.connected
          this.store.resultData = (await message).data
          this.store.requestTime = parseFloat((await message).headers['x-request-time']).toFixed(2)
        }
      } else {
        this.store.connected = !this.store.connected
        await this.axios.post('/disconnect', {
          connectorUrl: store.url,
          connectorToken: store.token
        })
        this.store.resultData = ''
        this.store.requestTime = 0
      }
    },
    update() {
      this.credentials = Object.assign({}, localStorage)
    }
  },
  mounted() {
    this.credentials = Object.assign({}, localStorage)
    this.selectedConnection = Object.keys(this.credentials)[0]
  }
}
</script>

<template>
  <div class="input-group">
    <label class="input-group-text border-info">Active Connection</label>
    <select v-model="selectedConnection" class="form-select border-info" :disabled="store.connected">
      <option v-for="(value, key) in credentials" :value="key">{{ key }}</option>
    </select>
    <button class="btn btn-secondary border-info" @click="authenticate">
      {{ store.connected ? 'Disconnect' : 'Authenticate' }}
    </button>
  </div>
</template>
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
          const message = await this.axios.post('http://connector-tester-web.jtl.test/action.php?XDEBUG_SESSION_START=PHPSTORM', {
            operation: 'authenticate',
            connectorUrl: store.url,
            connectorToken: store.token
          })

          //790 is the authentication failed error Code
          if (message.data === 790) {
            this.store.resultData = "Couldn't authenticate, please check your credentials"
          } else {
            this.store.connected = !this.store.connected
            this.store.resultData = message.data
          }
        } else {
          this.store.connected = !this.store.connected
          this.store.resultData = ''
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
      <option v-for="(value, key) in credentials" :value="key">{{key}}</option>
    </select>
    <button class="btn btn-secondary border-info" @click="authenticate">{{store.connected ? 'Disconnect' : 'Authenticate'}} </button>
  </div>
</template>
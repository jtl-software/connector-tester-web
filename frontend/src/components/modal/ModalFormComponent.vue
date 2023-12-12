<script>
  export default {
    methods: {
      saveConnection() {
        if (this.name) {
          const data = {
            url: this.url,
            token: this.token,
          };
          localStorage.removeItem(this.oldName.trim());
          localStorage.setItem(this.name.trim(), JSON.stringify(data));
        }
        this.emitToggleEvent()
        this.$emit('updateConnectionSelection')
      },
      emitToggleEvent() {
        this.$emit('closeForm', {toggleModal: false})
      }
    },
    props: {
      connectorName: String
    },
    data() {
      return {
        oldName: '',
        name: this.connectorName,
        url: '',
        token: ''
      }
    },
    mounted() {
      this.oldName = this.name
      if (localStorage.getItem(this.name)) {
        const data = JSON.parse(localStorage.getItem(this.name))
        this.url = data.url
        this.token = data.token
      }
    }
  }
</script>

<template>
  <form @submit.prevent="saveConnection">
    <input type="hidden" name="method" value="newConnection">
    <div class="mb-3">
      <label for="newConnectionName" class="form-label">Connector Name</label>
      <input v-model="name" type="text" id="newConnectionName" name="newConnectionName" class="form-control" required>
    </div>
    <div class="mb-3">
      <label for="newConnectionUrl" class="form-label">Url</label>
      <input v-model="url" type="text" id="newConnectionUrl" name="newConnectionUrl" class="form-control" required>
    </div>
    <div class="mb-3">
      <label for="newConnectionToken" class="form-label">Token</label>
      <input v-model="token" type="text" id="newConnectionToken" name="newConnectionToken" class="form-control" required>
    </div>
    <div class="d-flex justify-content-end">
      <button type="button" class="btn btn-secondary me-3" style="width: 5em" @click="emitToggleEvent">Back</button>
      <button type="submit" class="btn btn-primary" style="width: 5em">Submit</button>
    </div>
  </form>
</template>
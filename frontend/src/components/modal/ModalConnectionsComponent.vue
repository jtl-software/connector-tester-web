<script>
export default {
  data() {
    return {
      credentials: {}
    }
  },
  methods: {
    sortConnections() {
      this.credentials = {}
      const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
      Object.keys(Object.assign({}, localStorage))
          .sort(collator.compare)
          .forEach(key => {
            this.credentials[key] = JSON.parse(localStorage.getItem(key))
          })
    },
    deleteConnection(key) {
      localStorage.removeItem(key)
      delete this.credentials[key]
      this.$emit('updateConnectionSelection')
    },
    emitEvent(key) {
      this.$emit('editConnection', {name: key})
    }
  },
  mounted() {
    this.sortConnections()
  }
}
</script>

<template>
  <table class="table table-bordered table-striped">
    <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col" class="d-none d-lg-table-cell">Url</th>
      <th scope="col" class="d-none d-lg-table-cell">Token</th>
      <th scope="col"></th>
    </tr>
    </thead>
    <tbody>
    <tr v-for="(value, key) in credentials">
      <td >{{ key }}</td>
      <td class="d-none d-lg-table-cell">{{ value.url }}</td>
      <td class="d-none d-lg-table-cell">{{ value.token }}</td>
      <td>
        <div class="btn-group d-flex justify-content-center">
          <button class="btn btn-danger" @click="deleteConnection(key)">Delete</button>
          <button class="btn btn-primary" @click="emitEvent(key)">Edit</button>
        </div>
      </td>
    </tr>
    </tbody>
  </table>
</template>
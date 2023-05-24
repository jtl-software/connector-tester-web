<script>
export default {
  data() {
    return {
      credentials: {}
    }
  },
  methods: {
    deleteConnection(key) {
      localStorage.removeItem(key)
      this.credentials = Object.assign({}, localStorage)
      this.$emit('updateConnectionSelection')
    },
    emitEvent(key) {
      this.$emit('editConnection', {name: key})
    }
  },
  mounted() {
    this.credentials = Object.assign({}, localStorage)
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
      <td class="d-none d-lg-table-cell">{{ JSON.parse(value).url }}</td>
      <td class="d-none d-lg-table-cell">{{ JSON.parse(value).token }}</td>
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
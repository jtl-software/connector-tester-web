<script>
  import ModalConnectionsComponent from "@/components/modal/ModalConnectionsComponent.vue";
  import ModalFormComponent from "@/components/modal/ModalFormComponent.vue";

  export default {
    components: {
      ModalFormComponent,
      ModalConnectionsComponent
    },
    data() {
      return {
        toggleModal: false,
        connectorName: ''
      }
    },
    methods: {
      handleToggleEvent(data) {
        this.toggleModal = data.toggleModal
      },
      handleEditConnectionEvent(data) {
        this.connectorName = data.name
        this.toggleModal = true
      }
    }
  }
</script>

<template>
  <div class="modal modal-xl" tabindex="-1" id="credentialsModal">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Connector Credentials</h5>
        </div>
        <div class="modal-body">
          <div v-if="!toggleModal">
            <ModalConnectionsComponent @editConnection="handleEditConnectionEvent" @updateConnectionSelection="this.$emit('updateConnectionSelection')"/>
            <div class="d-flex justify-content-end">
              <button class="btn btn-success" @click="toggleModal = true; connectorName = ''">Add Connection</button>
            </div>
          </div>
          <div v-else>
            <ModalFormComponent @close-form="handleToggleEvent" @updateConnectionSelection="this.$emit('updateConnectionSelection')" :connector-name="connectorName"/>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="toggleModal = false" style="width: 5em">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>
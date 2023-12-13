<script>
export default {
  methods: {
    clearConfirmationEvent() {
      this.$emit('clearConfirmationEvent', true)
    }
  }
}
</script>

<template>
  <div class="modal" tabindex="-1" id="clearLinkingsModal">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-body">
          <p>Clear linkings?</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No</button>
          <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="clearConfirmationEvent">Yes</button>
        </div>
      </div>
    </div>
  </div>
</template>
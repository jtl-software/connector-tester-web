<script>
import ThemeToggle from "@/components/ThemeToggleComponent.vue";
import ModalComponent from "@/components/modal/ModalComponent.vue";
import ActiveConnectionComponent from "@/components/ActiveConnectionComponent.vue";

export default {
  components: {
    ThemeToggle,
    ModalComponent,
    ActiveConnectionComponent
  },
  methods: {
    handleUpdateEvent(data) {
      this.$refs.activeConnection.update(data)
    }
  }
}

</script>

<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary">
    <div class="container-fluid ms-1 me-4">
      <div class="navbar-brand">JTL Connector Tester</div>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse justify-content-center" id="navbarSupportedContent">
        <ul class="navbar-nav mb-2 mb-lg-0 w-100">
          <li class="nav-item">
            <button class="btn btn-outline-secondary" type="button" data-bs-toggle="modal" data-bs-target="#credentialsModal">Credentials</button>
          </li>
          <li class="mx-auto">
            <ActiveConnectionComponent ref="activeConnection" />
          </li>
          <li>
            <ThemeToggle />
          </li>
        </ul>
      </div>
    </div>
  </nav>
  <ModalComponent @updateConnectionSelection="handleUpdateEvent"/>
</template>
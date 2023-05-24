<script>
import FormComponent from "@/components/form/FormComponent.vue";
import ControlsComponent from "@/components/ControlsComponent.vue";
import NavbarComponent from "@/components/NavbarComponent.vue";

export default {
  components: {
    FormComponent,
    ControlsComponent,
    NavbarComponent
  }
}
</script>

<template>
  <div class="mb-5">
    <NavbarComponent />
  </div>
  <div class="container-fluid ">
    <div class="ms-4 me-4">
      <FormComponent />
    </div>
    <div class="me-4">
      <ControlsComponent />
    </div>
  </div>
</template>
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
  <div class="container-fluid">
    <FormComponent />
    <ControlsComponent />
  </div>
</template>
<script>
import ResultWindowComponent from "@/components/form/ResultWindowComponent.vue";
import PayloadWindowComponent from "@/components/form/PayloadWindowComponent.vue";
import FormControlsComponent from "@/components/form/FormControlsComponent.vue";

export default {
  data() {
    return {

    }
  },
  components: {
    ResultWindowComponent,
    PayloadWindowComponent,
    FormControlsComponent
  }
}

</script>

<template>
  <form>
    <div class="row">
      <div class="col-6">
        <ResultWindowComponent />
      </div>
      <div class="col-6">
        <PayloadWindowComponent />
      </div>
    </div>
    <FormControlsComponent />
  </form>
</template>
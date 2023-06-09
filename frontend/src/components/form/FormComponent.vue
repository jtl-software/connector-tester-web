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
      <div class="col-12 col-lg-6">
        <ResultWindowComponent />
      </div>
      <div class="col-12 col-lg-6 mt-3 mt-lg-0">
        <PayloadWindowComponent />
      </div>
    </div>
    <FormControlsComponent />
  </form>
</template>
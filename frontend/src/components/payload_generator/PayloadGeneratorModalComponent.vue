<script>
import {store} from "@/store";
import FormComponent from "@/components/payload_generator/FormComponent.vue";

export default {
  data() {
    return {
      //a list of all controllers and their optional properties
      controllers: {
        category: {
          attributes: false,
          customerGroups: false,
          invisibilities: false
        },
        crossSelling: {},
        customer: {},
        deliveryNote: {},
        manufacturer: {},
        product: {
          attributes: false,
          checksums: false,
          configGroups: false,
          customerGroupPackagingQuantities: false,
          fileDownloads: false,
          invisibilities: false,
          mediaFiles: false,
          partsLists: false,
          specialPrices: false,
          specifics: false,
          variations: false,
          warehouseInfo: false
        },
        productPrice: {},
        productStockLevel: {},
        specific: {},
        statusChange: {}
      },
      generateRandomData: false,
      store,
      jsonData: '',
      toggleModal: false
    }
  },
  computed: {
    postData() {
      return {
        connectorUrl: store.url,
        connectorToken: store.token,
        controller: store.controller,
        generateRandomData: this.generateRandomData,
        options: this.controllers[this.store.controller]
      }
    }
  },
  methods: {
    async getFormData() {
      const message = this.axios.post('generatePayload', this.postData)
      this.jsonData = (await message).data
      this.toggleModal = true
    },
    closeModal() {
      this.$refs.closeButton.click();
    }
  },
  components: {
    FormComponent
  }
}
</script>

<template>
  <div class="modal modal-xl" tabindex="-1" id="payloadModal">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Payload Generator</h5>
        </div>
        <div class="modal-body">
          <div v-if="!toggleModal">
            <div class="d-flex flex-row flex-grow-1">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="generateRandom" v-model="generateRandomData">
                <label class="form-check-label" for="generateRandom">
                  Random Data
                </label>
              </div>
              <select class="form-select" id="payloadController" name="controller" v-model="store.controller">
                <option v-for="(value, controller) in controllers" :value="controller">{{ controller }}</option>
              </select>
            </div>
            <hr>
            <div class="my-2">
              <h5>Optional Properties</h5>
            </div>
            <div class="d-flex flex-column flex-grow-1 mt-2">
              <div class="form-check">
                <div v-for="(value, key) in controllers[store.controller]">
                  <input class="form-check-input" type="checkbox" :id="key" v-model="controllers[store.controller][key]">
                  <label class="form-check-label" :for="key" >
                    {{ key }}
                  </label>
                </div>
              </div>
            </div>
            <hr>
            <div class="d-flex justify-content-end mt-3">
              <button class="btn btn-success" @click="getFormData">Load Form</button>
            </div>
          </div>
          <div v-else>
            <FormComponent :json-data="jsonData" @closeModal="closeModal"/>
          </div>
        </div>
        <div class="modal-footer">
          <div class="d-flex justify-content-end">
            <button type="button" class="btn btn-secondary" ref="closeButton" data-bs-dismiss="modal" @click="toggleModal = false"
                    style="width: 5em">Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
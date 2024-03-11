<script>
import {store} from "@/store";
import FormComponent from "@/components/payload_generator/FormComponent.vue";

export default {
  data() {
    return {
      controllers: [
        'category',
        'crossSelling',
        'customer',
        'deliveryNote',
        'image',
        'manufacturer',
        'product',
        'productPrice',
        'productStockLevel',
        'specific',
        'statusChange'
      ],
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
        generateRandomData: this.generateRandomData
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
                <option v-for="controller in controllers" :value="controller">{{ controller }}</option>
              </select>
            </div>
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
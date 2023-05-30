<script>
import {store} from "@/store";
export default {
  data () {
    return {
      actions: {
        category: ['Pull', 'Push', 'Delete', 'Stats'],
        connector: ['Finish', 'Identify'],
        core: ['Clear', 'Features', 'Init'],
        customer: ['Pull', 'Push', 'Stats'],
        customerOrder: ['Pull', 'Stats'],
        deliveryNote: ['Push'],
        globalData: ['Pull', 'Stats'],
        image: ['Pull', 'Push', 'Delete', 'Stats'],
        manufacturer: ['Pull', 'Push', 'Delete', 'Stats'],
        payment: ['Pull', 'Stats'],
        product: ['Pull', 'Push', 'Delete', 'Stats'],
        productPrice: ['Pull', 'Push', 'Stats'],
        productStockLevel: ['Pull', 'Push', 'Stats'],
        specific: ['Pull', 'Push', 'Delete', 'Stats'],
        statusChange: ['Push']
      },
      store
    }
  },
  computed: {
    possibleActions() {
      return this.actions[store.controller]
    }
  },
  methods: {
    buildDefaultAction() {
      store.action = this.possibleActions[0]
    }
  }
}
</script>

<template>
  <div class="row my-3 my-lg-2">
    <div class="col-12 col-lg-6">
      <div class="input-group">
        <label for="controllerDropdown" class="input-group-text">Controller</label>
        <select class="form-select" id="controllerDropdown" name="controller" :disabled="!store.connected" v-model="store.controller" @change="buildDefaultAction">
          <option value="category">Category</option>
          <option value="connector">Connector</option>
          <option value="core">Core</option>
          <option value="customer">Customer</option>
          <option value="customerOrder">Customer Order</option>
          <option value="deliveryNote">Delivery Note</option>
          <option value="globalData">Global Data</option>
          <option value="image">Image</option>
          <option value="manufacturer">Manufacturer</option>
          <option value="payment">Payment</option>
          <option value="product">Product</option>
          <option value="productPrice">Product Price</option>
          <option value="productStockLevel">Product Stock Level</option>
          <option value="specific">Specific</option>
          <option value="statusChange">Status Change</option>
        </select>
      </div>
    </div>
    <div class="col-12 col-lg-6 mt-2 mt-lg-0">
      <div class="input-group">
        <label for="actionDropdown" class="input-group-text">Action</label>
        <select v-model="store.action" class="form-select" :disabled="!store.connected" id="actionDropdown" name="action">
          <option v-for="(value) in possibleActions" :value="value">{{value}}</option>
        </select>
      </div>
    </div>
  </div>
</template>
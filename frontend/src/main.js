import { createApp } from 'vue'
import App from './App.vue'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import axios from "axios"
import VueAxios from "vue-axios";

let app = createApp(App)
app.use(VueAxios, axios)
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded'
axios.defaults.withCredentials = true
app.mount('#app')
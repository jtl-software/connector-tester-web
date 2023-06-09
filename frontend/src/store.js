import {reactive} from "vue";

export const store = reactive({
    resultData: '',
    connected: false,
    url: '',
    token: '',
    payload: '',
    controller: 'category',
    action: 'Pull'
})
<script>
  export default {
    data() {
      return {
        image: import.meta.env.BASE_URL + '/light.png'
      }
    },
    methods: {
      toggleTheme() {
        let oldTheme = document.documentElement.getAttribute('data-bs-theme')
        document.documentElement.setAttribute('data-bs-theme', oldTheme === 'light' ? 'dark' : 'light')
        this.image = oldTheme === 'light' ? import.meta.env.BASE_URL + '/light.png' : import.meta.env.BASE_URL + '/dark.png'
      }
    }
  }
</script>

<template>
  <button @click="toggleTheme" class="btn btn-outline-secondary"><img :src="this.image" style="height: 24px"></button>
</template>
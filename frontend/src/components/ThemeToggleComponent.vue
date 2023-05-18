<script>
  export default {
    data() {
      return {
        image: 'public/light.png'
      }
    },
    methods: {
      toggleTheme() {
        let oldTheme = document.documentElement.getAttribute('data-bs-theme')
        document.documentElement.setAttribute('data-bs-theme', oldTheme === 'light' ? 'dark' : 'light')
        this.image = oldTheme === 'light' ? 'public/light.png' : 'public/dark.png'
      }
    }
  }
</script>

<template>
  <button @click="toggleTheme" class="btn btn-outline-secondary"><img :src="this.image" style="height: 25px"></button>
</template>
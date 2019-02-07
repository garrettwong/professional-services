<template>
  <div class="text-xs-center">Test
    <!-- <bottom-details-view 
      title="Hi"
      v-bind:sheet-open-state="sheetOpen"
      ></bottom-details-view> -->
  
      {{sheetOpen}}
      <button v-on:click="sheetOpen=!sheetOpen">Clicker</button>
  </div>
</template>

<script>
import BottomDetailsView from './BottomDetailsView';

export default {
    components: {
        BottomDetailsView,
    },
    data() {
        return {
            sheetOpen: false
        };
    },
};
</script>

<style>
</style>

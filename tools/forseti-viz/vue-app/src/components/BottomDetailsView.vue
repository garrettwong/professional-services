<template>
  <div class="text-xs-center">
    <v-bottom-sheet v-model="sheetOpen" hide-overlay="true">
      <v-btn slot="activator" color="purple" dark>Click me {{sheetOpenState}}</v-btn>
      
      <v-list>
        <v-subheader>{{title}}</v-subheader>

        <v-list-tile v-for="tile in tiles" :key="tile.title" @click="sheet = false">
          <v-list-tile-avatar>
            <v-avatar size="32px" tile>
              <img
                :src="`https://cdn.vuetifyjs.com/images/bottom-sheets/${tile.img}`"
                :alt="tile.title"
              >
            </v-avatar>
          </v-list-tile-avatar>

          <v-list-tile-title>{{ tile.title }}</v-list-tile-title>
        </v-list-tile>
      </v-list>
    </v-bottom-sheet>
  </div>
</template>

<script>
export default {
    props: {
        title: String,
        sheetOpen: Boolean,
    },
    watch : {
      sheetOpenState : function () { this.sheetOpen = this.sheetOpenState; }
    },
    data: () => ({
        sheetOpen: false,//function() { return this.sheetOpenState; },
        tiles: [
            { img: 'keep.png', title: 'Keep' },
            { img: 'inbox.png', title: 'Inbox' },
            { img: 'hangouts.png', title: 'Hangouts' },
            { img: 'messenger.png', title: 'Messenger' },
        ],
    }),
};
</script>

<style>
</style>

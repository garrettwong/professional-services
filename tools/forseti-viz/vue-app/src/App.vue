<template>
  <v-app>
    <v-toolbar app>
      <v-toolbar-title class="headline text-uppercase">
        <span>Forseti</span>
        <span class="font-weight-light">Viz</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn
        flat
        href="https://github.com/GoogleCloudPlatform/forseti-security/tree/contrib-forseti-ia"
        target="_blank"
      >
        <span class="mr-2">Latest Release</span>
      </v-btn>
    </v-toolbar>

    <v-content>
      <Body/>
    </v-content>


<!-- bottom details -->

    <bottom-details-view 
      v-bind:title="nodeName"
      v-bind:sheet-open="sheetOpen"
      ></bottom-details-view>

    <!-- router-view TODO:refactor -->
    <br>
    <br>
    <br>
    <br>
    <p>URLs
      <router-link to="/foo">Foo</router-link>HA
      <router-link to="/bar">Bar</router-link>
    </p>
    <router-view></router-view>
    <!-- router-view TODO:refactor -->
  </v-app>
</template>

<script>
import Body from './components/Body';
import BottomDetailsView from './components/BottomDetailsView';

export default {
    name: 'App',
    components: {
        Body,
        BottomDetailsView
    },
    data() {
        return {
            //
            sheetOpen: false,
            nodeName: ''
        };
    },

    mounted() {
        // Events
        this.$root.$on('send', (node, violation) => {
            console.log(node);
            console.log(violation);

            this.nodeName = node.name;
            this.sheetOpen = true;
        });
    },
};
</script>
